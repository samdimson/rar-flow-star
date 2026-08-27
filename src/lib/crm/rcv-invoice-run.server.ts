/* eslint-disable @typescript-eslint/no-explicit-any */
import { COMPANY_EMAIL, toBase64 } from "./coc.server";
import {
  buildRcvInvoicePdf,
  RCV_COMPANY,
  RCV_COMPANY_EMAIL,
  RCV_COMPANY_PHONE,
} from "./rcv-invoice.server";

const BUCKET = "crm-files";
const fileName = (invoiceNumber: string) => `RCV Invoice ${invoiceNumber}.pdf`;

export type RcvInvoiceInput = {
  leadId: string;
  customerId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  claimNumber: string | null;
  policyNumber: string | null;
  carrier: string | null;
  typeOfLoss: string;
  workCompleted: string | null;
  billToName: string;
  billToAddress: string;
  billToPhone: string | null;
  billToEmail: string | null;
  propertyAddress: string;
  scope: string;
  rcv: number;
  deductible: number;
  payment1: number;
  payment2: number;
  paymentsReceived: number;
  origin: string;
};

async function fetchLogo(origin: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${origin.replace(/\/$/, "")}/logo.png`);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function runGenerateRcvInvoice(input: RcvInvoiceInput, userId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;

  const pdfBytes = await buildRcvInvoicePdf({
    ...input,
    logoBytes: await fetchLogo(input.origin),
  });

  const storagePath = `leads/${input.leadId}/rcv-invoice.pdf`;
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const nowIso = new Date().toISOString();
  const { data: existingDoc } = await db
    .from("documents")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  const invoiceFileName = fileName(input.invoiceNumber);

  if (existingDoc) {
    await db
      .from("documents")
      .update({
        customer_id: input.customerId,
        category: "invoice",
        file_name: invoiceFileName,
        file_size: pdfBytes.length,
        uploaded_at: nowIso,
      })
      .eq("id", existingDoc.id);
  } else {
    await db.from("documents").insert({
      lead_id: input.leadId,
      customer_id: input.customerId,
      category: "invoice",
      file_name: invoiceFileName,
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_size: pdfBytes.length,
      caption: `RCV Invoice ${input.invoiceNumber}`,
      uploaded_by: userId,
      uploaded_at: nowIso,
    });
  }

  const invoiceTotal = Number(input.payment1) + Number(input.payment2);
  const { data: existingInvoice } = await db
    .from("invoices")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("invoice_number", input.invoiceNumber)
    .maybeSingle();

  if (existingInvoice) {
    await db
      .from("invoices")
      .update({ amount: invoiceTotal, status: "sent", issued_at: input.invoiceDate })
      .eq("id", existingInvoice.id);
  } else {
    await db.from("invoices").insert({
      lead_id: input.leadId,
      invoice_number: input.invoiceNumber,
      amount: invoiceTotal,
      status: "sent",
      issued_at: input.invoiceDate,
    });
  }

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);

  return {
    storagePath,
    invoiceTotal,
    downloadUrl: signed?.signedUrl ?? null,
  };
}

export async function runEmailRcvInvoice(
  input: { leadId: string; invoiceNumber: string; customerEmail: string; propertyAddress: string },
  userId: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const storagePath = `leads/${input.leadId}/rcv-invoice.pdf`;

  const { data: file, error: downloadError } = await db.storage.from(BUCKET).download(storagePath);
  if (downloadError || !file) throw new Error(downloadError?.message ?? "Invoice PDF not found — generate it first.");
  const pdfBase64 = toBase64(new Uint8Array(await file.arrayBuffer()));

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Email provider is not connected yet (Resend connection missing).");

  const text = [
    `Please find attached invoice ${input.invoiceNumber} for the roof replacement at ${input.propertyAddress}.`,
    "",
    "Payments are due upon receipt of each carrier disbursement. The policy deductible is payable directly by the homeowner.",
    "",
    `Thank you for choosing ${RCV_COMPANY}.`,
    RCV_COMPANY_PHONE,
    RCV_COMPANY_EMAIL,
  ].join("\n");

  const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: `${RCV_COMPANY} <onboarding@resend.dev>`,
      to: [input.customerEmail],
      cc: [COMPANY_EMAIL],
      subject: `Invoice ${input.invoiceNumber} — ${RCV_COMPANY}`,
      text,
      html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`,
      attachments: [{ filename: FILE_NAME, content: pdfBase64 }],
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Provider request failed [${response.status}]: ${errorBody}`);
  }

  await db.from("activities").insert({
    lead_id: input.leadId,
    type: "email",
    subject: `RCV Invoice emailed to ${input.customerEmail}`,
    body: input.customerEmail,
    actor_id: userId,
  });

  return { sent: true as const, to: input.customerEmail };
}
