/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  RC_CC_EMAIL,
  RC_COMPANY,
  RC_EMAIL,
  RC_PHONE,
  num,
  type RoofingContractFields,
} from "./roofing-contract";
import { buildRoofingContractPdf, sendRoofingContractEmail } from "./roofing-contract.server";
import { dataUrlToBytes, toBase64 } from "./service-agreement.server";

const BUCKET = "crm-files";

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export type SignRoofingContractInput = {
  leadId: string;
  origin: string;
  fields: RoofingContractFields;
  homeownerSignature: string;
  repSignature: string;
};

export async function runSignRoofingContract(
  input: SignRoofingContractInput,
  authed: any,
  userId: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const leadId = input.leadId;

  if (!input.homeownerSignature || !input.repSignature) {
    throw new Error("Both the homeowner and representative signatures are required.");
  }
  if (!input.fields.homeownerPrintedName.trim()) {
    throw new Error("The homeowner printed name is required.");
  }

  const { data: lead, error: leadError } = await authed
    .from("leads")
    .select("id, lead_number, task_code, customer_id, assigned_rep_id, customer:customers(*)")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Lead not found");

  if (!canSignRoofingContract(lead.task_code)) {
    throw new Error(
      "This lead is not at the contract signing step (task 5.1). Advance the lead before signing the contract.",
    );
  }

  let logoBytes: Uint8Array | null = null;
  try {
    const logoResponse = await fetch(`${input.origin.replace(/\/$/, "")}/logo.png`);
    if (logoResponse.ok) logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  } catch {
    logoBytes = null;
  }

  const signedAt = new Date().toISOString();
  const signedDate = signedAt.slice(0, 10);
  const lastName =
    lead.customer?.last_name ||
    input.fields.homeownerName.trim().split(/\s+/).slice(-1)[0] ||
    "Homeowner";
  const fileName = `Roofing Contract — ${lastName}.pdf`;

  const pdfBytes = await buildRoofingContractPdf({
    fields: input.fields,
    homeownerSignaturePng: dataUrlToBytes(input.homeownerSignature),
    repSignaturePng: dataUrlToBytes(input.repSignature),
    signedDate,
    customerLastName: lastName,
    logoBytes,
  });

  const storagePath = `leads/${leadId}/roofing-contract.pdf`;
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
    category: "contract",
    file_name: fileName,
    storage_path: storagePath,
    mime_type: "application/pdf",
    file_size: pdfBytes.length,
    caption: "Signed Roofing Replacement Contract",
    uploaded_by: userId,
    uploaded_at: signedAt,
  };
  if (existingDoc) {
    await db.from("documents").update(docRow).eq("id", existingDoc.id);
  } else {
    const { error: docError } = await db.from("documents").insert(docRow);
    if (docError) throw new Error(`Could not file the document: ${docError.message}`);
  }

  const contractAmount = num(input.fields.rcvAmount);

  const { data: existingContract } = await db
    .from("contracts")
    .select("id")
    .eq("lead_id", leadId)
    .eq("contract_type", "contract")
    .maybeSingle();

  const contractRow = {
    lead_id: leadId,
    customer_id: lead.customer_id ?? null,
    contract_type: "contract",
    contract_amount: contractAmount,
    signed_at: signedAt,
    status: "active",
    direction_to_pay_signed: false,
  };
  if (existingContract) {
    const { error } = await db.from("contracts").update(contractRow).eq("id", existingContract.id);
    if (error) throw new Error(`Could not record the contract: ${error.message}`);
  } else {
    const { error } = await db.from("contracts").insert(contractRow);
    if (error) throw new Error(`Could not record the contract: ${error.message}`);
  }

  const { error: leadUpdateError } = await db
    .from("leads")
    .update({ contract_signed_at: signedAt, contract_amount: contractAmount })
    .eq("id", leadId);
  if (leadUpdateError) throw new Error(leadUpdateError.message);

  let rep: { full_name?: string; phone?: string | null; email?: string | null } | null = null;
  if (lead.assigned_rep_id) {
    const { data } = await db
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", lead.assigned_rep_id)
      .maybeSingle();
    rep = data ?? null;
  }

  const recipient = isEmail(input.fields.email)
    ? input.fields.email.trim()
    : isEmail(lead.customer?.email)
      ? String(lead.customer?.email).trim()
      : null;

  const firstName = lead.customer?.first_name || input.fields.homeownerName.split(/\s+/)[0] || "Homeowner";
  const signature = [rep?.full_name, rep?.phone, rep?.email].filter(Boolean).join("\n");
  const text = `Dear ${firstName}, your signed roofing replacement contract is attached. Work is scheduled to begin following permit approval and material delivery. Questions? Call ${RC_PHONE} or email ${RC_EMAIL}.\n\n${
    signature || `${RC_COMPANY}\n${RC_PHONE}\n${RC_EMAIL}`
  }`;

  let emailed = false;
  let emailError: string | null = null;
  if (!recipient) {
    emailError = "No valid homeowner email address to send to.";
  } else {
    const result = await sendRoofingContractEmail({
      to: recipient,
      cc: [RC_CC_EMAIL],
      subject: `Your Roofing Replacement Contract — ${RC_COMPANY}`,
      text,
      pdfBase64: toBase64(pdfBytes),
      fileName,
    });
    emailed = result.ok;
    emailError = result.ok ? null : (result.error ?? "Email send failed");
  }

  await db.from("activities").insert({
    lead_id: leadId,
    type: "document",
    subject: "Roofing contract signed",
    body: emailed
      ? `Roofing contract signed and emailed to ${recipient}`
      : `Roofing contract signed${recipient ? ` (email to ${recipient} failed)` : ""}`,
    actor_id: userId,
  });

  return { signedAt, storagePath, contractAmount, emailed, emailError, recipient };
}
