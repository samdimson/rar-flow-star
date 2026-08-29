/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SA_CC_EMAIL,
  SA_COMPANY,
  SA_EMAIL,
  SA_PHONE,
  type ServiceAgreementFields,
} from "./service-agreement";
import {
  buildServiceAgreementPdf,
  dataUrlToBytes,
  sendServiceAgreementEmail,
  toBase64,
} from "./service-agreement.server";

const BUCKET = "crm-files";

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export type SignServiceAgreementInput = {
  leadId: string;
  origin: string;
  fields: ServiceAgreementFields;
  homeownerSignature: string;
  repSignature: string;
};

export async function runSignServiceAgreement(
  input: SignServiceAgreementInput,
  authed: any,
  userId: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const leadId = input.leadId;

  if (!input.homeownerSignature || !input.repSignature) {
    throw new Error("Both the homeowner and representative signatures are required.");
  }

  const { data: lead, error: leadError } = await authed
    .from("leads")
    .select("id, lead_number, customer_id, customer:customers(*)")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Lead not found");

  let logoBytes: Uint8Array | null = null;
  try {
    const logoResponse = await fetch(`${input.origin.replace(/\/$/, "")}/logo.png`);
    if (logoResponse.ok) logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  } catch {
    logoBytes = null;
  }

  const signedAt = new Date().toISOString();
  const signedDate = signedAt.slice(0, 10);

  const pdfBytes = await buildServiceAgreementPdf({
    fields: input.fields,
    homeownerSignaturePng: dataUrlToBytes(input.homeownerSignature),
    repSignaturePng: dataUrlToBytes(input.repSignature),
    homeownerSignedDate: signedDate,
    repSignedDate: signedDate,
    logoBytes,
  });

  const storagePath = `leads/${leadId}/service-agreement.pdf`;
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(`Could not store the PDF: ${uploadError.message}`);

  const { data: existingDoc } = await db
    .from("documents")
    .select("id")
    .eq("lead_id", leadId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  const docRow = {
    lead_id: leadId,
    customer_id: lead.customer_id ?? null,
    category: "service_agreement",
    file_name: "Service Agreement.pdf",
    storage_path: storagePath,
    mime_type: "application/pdf",
    file_size: pdfBytes.length,
    caption: "Signed Service Agreement",
    uploaded_by: userId,
    uploaded_at: signedAt,
  };
  if (existingDoc) {
    await db.from("documents").update(docRow).eq("id", existingDoc.id);
  } else {
    const { error: docError } = await db.from("documents").insert(docRow);
    if (docError) throw new Error(`Could not file the document: ${docError.message}`);
  }

  const { error: leadUpdateError } = await db
    .from("leads")
    .update({ service_agreement_signed_at: signedAt })
    .eq("id", leadId);
  if (leadUpdateError) throw new Error(leadUpdateError.message);

  await db.from("activities").insert({
    lead_id: leadId,
    type: "document",
    subject: "Service Agreement signed",
    body: `Signed by ${input.fields.homeownerName || "homeowner"}`,
    actor_id: userId,
  });

  const recipient = isEmail(input.fields.email)
    ? input.fields.email.trim()
    : isEmail(lead.customer?.email)
      ? String(lead.customer?.email).trim()
      : null;

  const firstName = lead.customer?.first_name || input.fields.homeownerName.split(/\s+/)[0] || "Homeowner";
  const text = `Dear ${firstName}, please find your signed service agreement attached. Thank you for choosing ${SA_COMPANY}. If you have any questions, contact us at ${SA_PHONE} or ${SA_EMAIL}.`;

  let emailed = false;
  let emailError: string | null = null;
  if (!recipient) {
    emailError = "No valid homeowner email address to send to.";
  } else {
    const result = await sendServiceAgreementEmail({
      to: recipient,
      cc: [SA_CC_EMAIL],
      subject: `Your Service Agreement — ${SA_COMPANY}`,
      text,
      pdfBase64: toBase64(pdfBytes),
    });
    emailed = result.ok;
    emailError = result.ok ? null : (result.error ?? "Email send failed");
    if (result.ok) {
      await db.from("activities").insert({
        lead_id: leadId,
        type: "email",
        subject: `Service Agreement emailed to ${recipient}`,
        body: recipient,
        actor_id: userId,
      });
    }
  }

  return { signedAt, storagePath, emailed, emailError, recipient };
}
