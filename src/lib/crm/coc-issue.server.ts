/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCocPdf, buildEmailBody, COMPANY_EMAIL, sendCocEmail, toBase64 } from "./coc.server";
import { laborLabel } from "./labor";
import { roofTypeLabel } from "./workflow";

const BUCKET = "crm-files";

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export async function runIssueCoc(
  input: { leadId: string; origin: string },
  authed: any,
  userId: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const leadId = input.leadId;

  const { data: lead, error: leadError } = await authed
    .from("leads")
    .select(
      "id, lead_number, contract_signed_at, assigned_rep_id, customer:customers(*), property:properties(*)",
    )
    .eq("id", leadId)
    .single();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Lead not found");

  const [{ data: job }, { data: claim }, { data: estimate }, { data: rep }] = await Promise.all([
    db.from("production_jobs").select("*").eq("lead_id", leadId).limit(1).maybeSingle(),
    db
      .from("insurance_claims")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("estimates")
      .select("labor_type, labor_squares")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    lead.assigned_rep_id
      ? db.from("profiles").select("full_name, phone, email").eq("id", lead.assigned_rep_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const cocSignedAt: string = job?.coc_signed_at ?? new Date().toISOString();

  let jobId: string | null = job?.id ?? null;
  if (jobId) {
    await db.from("production_jobs").update({ coc_signed_at: cocSignedAt }).eq("id", jobId);
  } else {
    const { data: created, error } = await db
      .from("production_jobs")
      .insert({ lead_id: leadId, coc_signed_at: cocSignedAt })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    jobId = created.id;
  }

  const property = lead.property;
  const propertyAddress = property
    ? `${property.address_line1}, ${property.city} ${property.state} ${property.postal_code}`
    : "—";
  const squares = Number(estimate?.labor_squares ?? 0);
  const scopeOfWork = estimate?.labor_type
    ? `${laborLabel(estimate.labor_type)}${squares > 0 ? ` — ${squares} squares` : ""}`
    : "Full roof replacement";

  let logoBytes: Uint8Array | null = null;
  try {
    const logoResponse = await fetch(`${input.origin.replace(/\/$/, "")}/logo.png`);
    if (logoResponse.ok) logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  } catch {
    logoBytes = null;
  }

  const pdfBytes = await buildCocPdf({
    leadNumber: lead.lead_number,
    customerFirstName: lead.customer?.first_name ?? "",
    customerLastName: lead.customer?.last_name ?? "Homeowner",
    propertyAddress,
    claimNumber: claim?.claim_number ?? null,
    roofType: property?.roof_type ? roofTypeLabel(property.roof_type) : "—",
    scopeOfWork,
    contractSignedAt: lead.contract_signed_at ?? null,
    walkthroughAt: job?.walkthrough_at ?? null,
    completedAt: job?.qc_passed_at ?? job?.install_date ?? null,
    cocSignedAt,
    logoBytes,
  });

  const storagePath = `leads/${leadId}/coc.pdf`;
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data: existingDoc } = await db
    .from("documents")
    .select("id")
    .eq("lead_id", leadId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (!existingDoc) {
    await db.from("documents").insert({
      lead_id: leadId,
      category: "certificate_of_completion",
      file_name: "Notice of Completion.pdf",
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_size: pdfBytes.length,
      caption: "Notice of Completion",
      uploaded_by: userId,
    });
  }

  const lastName = lead.customer?.last_name ?? "Homeowner";
  const subject = `Notice of Completion — ${lastName} Residence | ${lead.lead_number}`;
  const text = buildEmailBody({ propertyAddress, rep: rep ?? null });
  const pdfBase64 = toBase64(pdfBytes);

  const recipients = Array.from(
    new Set(
      [lead.customer?.email, claim?.adjuster_email, COMPANY_EMAIL, claim?.carrier]
        .filter(isEmail)
        .map((email) => email.trim().toLowerCase()),
    ),
  );

  let sent = 0;
  const failures: string[] = [];
  for (const to of recipients) {
    const result = await sendCocEmail({ to, subject, text, pdfBase64 });
    if (result.ok) {
      sent += 1;
      await db.from("activities").insert({
        lead_id: leadId,
        type: "coc_emailed",
        subject: `COC emailed to ${to}`,
        body: to,
        actor_id: userId,
      });
    } else {
      failures.push(`${to}: ${result.error ?? "send failed"}`);
    }
  }

  await db
    .from("production_jobs")
    .update({ coc_emailed_at: sent > 0 ? new Date().toISOString() : null, coc_signed_at: cocSignedAt })
    .eq("id", jobId);

  return { cocSignedAt, storagePath, sent, recipients, failures };
}
