/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  RC_ADDRESS,
  RC_CIB,
  RC_COMPANY,
  RC_EMAIL,
  RC_PARTY_FIELDS,
  RC_PHONE,
  RC_PRICE_FIELDS,
  RC_SCOPE_FIELDS,
  RC_WEBSITE,
  ROOFING_CONTRACT_TERMS,
  contractHomeownerTotal,
  contractPayment2,
  num,
  type RcFieldSpec,
  type RoofingContractFields,
} from "./roofing-contract";

const NAVY = rgb(0.04, 0.12, 0.24);
const ORANGE = rgb(0.91, 0.45, 0.05);
const GREY_TEXT = rgb(0.35, 0.38, 0.42);
const INK = rgb(0.16, 0.18, 0.22);
const BORDER = rgb(0.85, 0.86, 0.88);

export type RoofingContractPdfData = {
  fields: RoofingContractFields;
  homeownerSignaturePng: Uint8Array;
  repSignaturePng: Uint8Array;
  signedDate: string;
  customerLastName: string;
  logoBytes: Uint8Array | null;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value,
  );

const longDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return value ?? "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Chicago" }).format(d);
};

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildRoofingContractPdf(data: RoofingContractPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 48;
  const W = 612 - M * 2;
  const right = 612 - M;

  let logo: any = null;
  if (data.logoBytes) {
    try {
      logo = await pdf.embedPng(data.logoBytes);
    } catch {
      logo = null;
    }
  }

  const pages: any[] = [];
  const newPage = () => {
    const page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 0, y: 786, width: 612, height: 6, color: ORANGE });
    pages.push(page);
    return page;
  };

  let page = newPage();
  let y = 726;

  if (logo) {
    const scale = 56 / logo.height;
    page.drawImage(logo, { x: M, y: y - 2, width: logo.width * scale, height: 56 });
  } else {
    page.drawText(RC_COMPANY, { x: M, y: y + 30, size: 14, font: bold, color: NAVY });
  }
  const headerLines = [
    RC_COMPANY,
    "12101 N MacArthur Blvd, Suite A160",
    "Edmond, OK 73025",
    RC_PHONE,
    RC_EMAIL,
    RC_WEBSITE,
    `CIB Reg. #${RC_CIB}`,
  ];
  headerLines.forEach((line, i) => {
    const size = i === 0 ? 11 : 8;
    const font = i === 0 ? bold : body;
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: right - w,
      y: y + 46 - i * 10,
      size,
      font,
      color: i === 0 ? NAVY : GREY_TEXT,
    });
  });

  y -= 20;
  page.drawRectangle({ x: M, y, width: W, height: 2.5, color: NAVY });
  y -= 32;

  const title = "ROOFING REPLACEMENT CONTRACT";
  const titleWidth = bold.widthOfTextAtSize(title, 17);
  page.drawText(title, { x: (612 - titleWidth) / 2, y, size: 17, font: bold, color: NAVY });
  y -= 28;

  const ensure = (needed: number) => {
    if (y - needed < 90) {
      page = newPage();
      y = 724;
    }
  };

  const sectionHeading = (label: string) => {
    ensure(40);
    page.drawRectangle({ x: M, y: y - 18, width: W, height: 18, color: NAVY });
    page.drawText(label, { x: M + 8, y: y - 13, size: 8.5, font: bold, color: rgb(1, 1, 1) });
    y -= 30;
  };

  const row = (label: string, value: string) => {
    const lines = wrap(value || "—", body, 9, W - 150);
    ensure(lines.length * 12 + 10);
    page.drawText(label, { x: M, y, size: 9, font: bold, color: GREY_TEXT });
    lines.forEach((line, i) => {
      page.drawText(line, { x: M + 150, y: y - i * 11, size: 9, font: body, color: INK });
    });
    page.drawLine({
      start: { x: M + 146, y: y - 4 - (lines.length - 1) * 11 },
      end: { x: right, y: y - 4 - (lines.length - 1) * 11 },
      thickness: 0.5,
      color: BORDER,
    });
    y -= lines.length * 11 + 9;
  };

  const fieldValue = (spec: RcFieldSpec): string => {
    const raw = data.fields[spec.key] ?? "";
    if (spec.type === "money") return money(num(raw));
    if (spec.type === "date") return raw ? longDate(raw) : "—";
    return raw || "—";
  };

  // ── Section 1: Parties ──
  sectionHeading("SECTION 1 — PARTIES");
  for (const spec of RC_PARTY_FIELDS) row(spec.label, fieldValue(spec));
  row("Contractor", RC_COMPANY);
  row("Contractor Address", RC_ADDRESS);
  row("Contractor Phone", RC_PHONE);
  row("CIB Registration #", RC_CIB);
  y -= 6;

  // ── Section 2: Scope of work ──
  sectionHeading("SECTION 2 — SCOPE OF WORK");
  for (const spec of RC_SCOPE_FIELDS) row(spec.label, fieldValue(spec));
  y -= 6;

  // ── Section 3: Contract price & payment ──
  sectionHeading("SECTION 3 — CONTRACT PRICE & PAYMENT");
  for (const spec of RC_PRICE_FIELDS) row(spec.label, fieldValue(spec));
  row("Payment 2 — Recoverable Depreciation", `${money(contractPayment2(data.fields))} (due upon release by carrier)`);
  row("Homeowner Out-of-Pocket (deductible)", money(num(data.fields.deductibleAmount)));
  row("Total Homeowner Responsibility", money(contractHomeownerTotal(data.fields)));
  y -= 6;

  // ── Section 4: Terms ──
  sectionHeading("SECTION 4 — TERMS & CONDITIONS");
  ROOFING_CONTRACT_TERMS.forEach((term, index) => {
    const lines = wrap(term, body, 8.5, W - 20);
    ensure(lines.length * 11.5 + 10);
    page.drawText(`${index + 1}.`, { x: M, y, size: 8.5, font: bold, color: NAVY });
    lines.forEach((line, i) => {
      page.drawText(line, { x: M + 20, y: y - i * 11.5, size: 8.5, font: body, color: INK });
    });
    y -= lines.length * 11.5 + 9;
  });

  // ── Section 5: Signatures ──
  if (y < 250) {
    page = newPage();
    y = 724;
  }
  y -= 6;
  sectionHeading("SECTION 5 — SIGNATURES");

  const drawSignature = async (
    label: string,
    printedLabel: string,
    printedName: string,
    pngBytes: Uint8Array,
  ): Promise<void> => {
    const boxTop = y;
    const sigWidth = W - 150;
    try {
      const image = await pdf.embedPng(pngBytes);
      const scale = Math.min(50 / image.height, sigWidth / image.width);
      page.drawImage(image, {
        x: M + 4,
        y: boxTop - 50,
        width: image.width * scale,
        height: image.height * scale,
      });
    } catch {
      /* signature image unavailable */
    }
    page.drawLine({
      start: { x: M, y: boxTop - 54 },
      end: { x: M + sigWidth, y: boxTop - 54 },
      thickness: 0.75,
      color: BORDER,
    });
    page.drawLine({
      start: { x: M + sigWidth + 24, y: boxTop - 54 },
      end: { x: right, y: boxTop - 54 },
      thickness: 0.75,
      color: BORDER,
    });
    page.drawText(longDate(data.signedDate), {
      x: M + sigWidth + 28,
      y: boxTop - 50,
      size: 9,
      font: body,
      color: INK,
    });
    page.drawText(label, { x: M, y: boxTop - 66, size: 8, font: bold, color: GREY_TEXT });
    page.drawText("Date", { x: M + sigWidth + 24, y: boxTop - 66, size: 8, font: bold, color: GREY_TEXT });
    page.drawText(`${printedLabel}: ${printedName || "—"}`, {
      x: M,
      y: boxTop - 80,
      size: 9,
      font: body,
      color: INK,
    });
    y = boxTop - 106;
  };

  await drawSignature(
    "Homeowner Signature",
    "Printed name",
    data.fields.homeownerPrintedName,
    data.homeownerSignaturePng,
  );
  await drawSignature(
    `${RC_COMPANY} Representative`,
    "Representative",
    data.fields.repName,
    data.repSignaturePng,
  );

  // ── Footer ──
  const footerLeft = `${RC_COMPANY} • CIB Reg. #${RC_CIB} • 12101 N MacArthur Blvd Suite A160, Edmond OK 73025 • ${RC_PHONE}`;
  const footerRight = `Roofing Replacement Contract — ${data.customerLastName || "Homeowner"}`;
  pages.forEach((p) => {
    p.drawLine({ start: { x: M, y: 52 }, end: { x: right, y: 52 }, thickness: 0.75, color: BORDER });
    p.drawText(footerLeft, { x: M, y: 38, size: 6.4, font: body, color: GREY_TEXT });
    const w = body.widthOfTextAtSize(footerRight, 6.4);
    p.drawText(footerRight, { x: right - w, y: 28, size: 6.4, font: body, color: GREY_TEXT });
  });

  return await pdf.save();
}

export async function sendRoofingContractEmail(args: {
  to: string;
  cc: string[];
  subject: string;
  text: string;
  pdfBase64: string;
  fileName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    return { ok: false, error: "Email provider is not connected yet (Resend connection missing)." };
  }
  try {
    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `${RC_COMPANY} <onboarding@resend.dev>`,
        to: [args.to],
        cc: args.cc,
        subject: args.subject,
        text: args.text,
        html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${args.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`,
        attachments: [{ filename: args.fileName, content: args.pdfBase64 }],
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      return { ok: false, error: `Email provider request failed [${response.status}]: ${errorBody}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown send error" };
  }
}
