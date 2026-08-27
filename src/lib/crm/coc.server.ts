/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export const COMPANY = "Rise Above Roofing Oklahoma";
export const COMPANY_EMAIL = "info@riseaboveroofingok.com";
export const COMPANY_ADDRESS = "12101 N MacArthur, Suite A160, Edmond OK 73025";
export const COMPANY_PHONE = "405.266.1313";
export const CIB_REG = "CIB Reg. #80007962";

const NAVY = rgb(0.04, 0.12, 0.24);
const ORANGE = rgb(0.91, 0.45, 0.05);
const GREY_TEXT = rgb(0.35, 0.38, 0.42);
const GREY_BOX = rgb(0.95, 0.96, 0.97);
const YELLOW = rgb(0.95, 0.72, 0.1);
const BORDER = rgb(0.85, 0.86, 0.88);

export type CocData = {
  leadNumber: string;
  customerFirstName: string;
  customerLastName: string;
  propertyAddress: string;
  claimNumber: string | null;
  roofType: string;
  scopeOfWork: string;
  contractSignedAt: string | null;
  walkthroughAt: string | null;
  completedAt: string | null;
  cocSignedAt: string;
  logoBytes: Uint8Array | null;
};

const longDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "America/Chicago",
  }).format(d);
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

export async function buildCocPdf(data: CocData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 48;
  const width = 612 - M * 2;
  let y = 792;

  // orange accent top border
  page.drawRectangle({ x: 0, y: 786, width: 612, height: 6, color: ORANGE });
  y = 720;

  // header: logo left, company info right
  if (data.logoBytes) {
    try {
      const logo = await pdf.embedPng(data.logoBytes);
      const scale = 58 / logo.height;
      page.drawImage(logo, { x: M, y: y - 4, width: logo.width * scale, height: 58 });
    } catch {
      page.drawText(COMPANY, { x: M, y: y + 30, size: 14, font: bold, color: NAVY });
    }
  } else {
    page.drawText(COMPANY, { x: M, y: y + 30, size: 14, font: bold, color: NAVY });
  }

  const infoLines = [COMPANY_ADDRESS, `${COMPANY_PHONE} | ${COMPANY_EMAIL}`, CIB_REG];
  let infoY = y + 46;
  for (const line of infoLines) {
    const w = body.widthOfTextAtSize(line, 8.5);
    page.drawText(line, { x: 612 - M - w, y: infoY, size: 8.5, font: body, color: GREY_TEXT });
    infoY -= 12;
  }

  y -= 30;
  page.drawLine({
    start: { x: M, y },
    end: { x: 612 - M, y },
    thickness: 0.75,
    color: BORDER,
  });

  y -= 28;
  page.drawText("NOTICE OF COMPLETION", { x: M, y, size: 9.5, font: bold, color: ORANGE });

  y -= 24;
  page.drawText(`Roof Replacement — ${data.customerLastName} Residence`, {
    x: M,
    y,
    size: 18,
    font: bold,
    color: NAVY,
  });

  // three columns
  y -= 34;
  const cols = [
    { label: "INSURANCE CLAIM #", value: data.claimNumber || "N/A — retail" },
    { label: "DATE COMPLETED", value: longDate(data.completedAt ?? data.cocSignedAt) },
    { label: "DATE ISSUED", value: longDate(data.cocSignedAt) },
  ];
  cols.forEach((col, i) => {
    const x = M + i * (width / 3);
    page.drawText(col.label, { x, y, size: 7.5, font: bold, color: GREY_TEXT });
    page.drawText(col.value, { x, y: y - 14, size: 10, font: bold, color: NAVY });
  });

  y -= 44;
  const certify =
    `${COMPANY} hereby certifies that all roofing work contracted on ` +
    `${longDate(data.contractSignedAt)} at the property described below has been completed in a ` +
    `workmanlike manner, in accordance with the approved scope of work and applicable building codes. ` +
    `The homeowner accepted the completed work on ${longDate(data.walkthroughAt ?? data.cocSignedAt)}.`;
  for (const line of wrap(certify, body, 10, width)) {
    page.drawText(line, { x: M, y, size: 10, font: body, color: rgb(0.2, 0.22, 0.26) });
    y -= 14;
  }

  // grey info box
  y -= 14;
  const rows: [string, string][] = [
    ["HOMEOWNER", `${data.customerFirstName} ${data.customerLastName}`.trim()],
    ["PROPERTY ADDRESS", data.propertyAddress],
    ["CONTRACTOR", `${COMPANY} — ${CIB_REG}`],
    ["SCOPE OF WORK", data.scopeOfWork],
    ["ROOFING SYSTEM", data.roofType],
  ];
  const boxHeight = rows.length * 22 + 18;
  page.drawRectangle({
    x: M,
    y: y - boxHeight,
    width,
    height: boxHeight,
    color: GREY_BOX,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  let rowY = y - 22;
  for (const [label, value] of rows) {
    page.drawText(label, { x: M + 14, y: rowY, size: 7.5, font: bold, color: GREY_TEXT });
    const valueLines = wrap(value, body, 10, width - 190);
    page.drawText(valueLines[0] ?? "—", {
      x: M + 150,
      y: rowY - 1,
      size: 10,
      font: body,
      color: NAVY,
    });
    rowY -= 22;
  }
  y -= boxHeight + 22;

  const completion =
    "All materials specified in the scope of work were installed, the job site was cleaned, magnetic " +
    "nail sweeps were performed, and a final quality-control inspection was passed prior to the " +
    "issuance of this notice. Manufacturer and workmanship warranties are in force as of the date issued.";
  for (const line of wrap(completion, body, 10, width)) {
    page.drawText(line, { x: M, y, size: 10, font: body, color: rgb(0.2, 0.22, 0.26) });
    y -= 14;
  }

  // purpose box with yellow left border
  y -= 16;
  const purpose =
    "This notice confirms that the insured roofing work is complete and is provided to support the " +
    "release of any remaining ACV balance and recoverable depreciation held by the carrier.";
  const purposeLines = wrap(purpose, body, 9.5, width - 40);
  const pHeight = purposeLines.length * 13 + 34;
  page.drawRectangle({
    x: M,
    y: y - pHeight,
    width,
    height: pHeight,
    color: rgb(0.99, 0.97, 0.9),
  });
  page.drawRectangle({ x: M, y: y - pHeight, width: 4, height: pHeight, color: YELLOW });
  page.drawText("PURPOSE OF THIS NOTICE", {
    x: M + 18,
    y: y - 18,
    size: 7.5,
    font: bold,
    color: rgb(0.5, 0.36, 0.03),
  });
  let purposeY = y - 34;
  for (const line of purposeLines) {
    page.drawText(line, { x: M + 18, y: purposeY, size: 9.5, font: body, color: rgb(0.28, 0.24, 0.14) });
    purposeY -= 13;
  }
  y -= pHeight + 30;

  // COMPLETED stamp
  const stampX = 612 - M - 190;
  page.drawRectangle({
    x: stampX,
    y: y - 56,
    width: 190,
    height: 56,
    borderColor: rgb(0.13, 0.55, 0.35),
    borderWidth: 2,
    color: rgb(1, 1, 1),
    opacity: 0,
    rotate: degrees(0),
  });
  page.drawText("COMPLETED", {
    x: stampX + 16,
    y: y - 30,
    size: 20,
    font: bold,
    color: rgb(0.13, 0.55, 0.35),
  });
  page.drawText(longDate(data.cocSignedAt), {
    x: stampX + 16,
    y: y - 46,
    size: 9,
    font: body,
    color: rgb(0.13, 0.55, 0.35),
  });

  // footer
  page.drawLine({
    start: { x: M, y: 62 },
    end: { x: 612 - M, y: 62 },
    thickness: 0.75,
    color: BORDER,
  });
  page.drawText(`${COMPANY} • ${CIB_REG}`, { x: M, y: 48, size: 8, font: body, color: GREY_TEXT });
  const right = `Notice of Completion — ${data.customerLastName} Residence`;
  page.drawText(right, {
    x: 612 - M - body.widthOfTextAtSize(right, 8),
    y: 48,
    size: 8,
    font: body,
    color: GREY_TEXT,
  });

  return await pdf.save();
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function buildEmailBody(args: {
  propertyAddress: string;
  rep: { full_name: string | null; phone: string | null; email: string | null } | null;
}): string {
  const rep = args.rep;
  return [
    `Please find attached the Notice of Completion for the roof replacement at ${args.propertyAddress}.`,
    "",
    "This document confirms completion of work and supports release of the remaining ACV/recoverable depreciation.",
    "",
    "Kind regards,",
    rep?.full_name ?? COMPANY,
    rep?.phone ?? COMPANY_PHONE,
    rep?.email ?? COMPANY_EMAIL,
    COMPANY,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export async function sendCocEmail(args: {
  to: string;
  subject: string;
  text: string;
  pdfBase64: string;
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
        from: `${COMPANY} <onboarding@resend.dev>`,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${args.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`,
        attachments: [{ filename: "Notice of Completion.pdf", content: args.pdfBase64 }],
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      return { ok: false, error: `Provider request failed [${response.status}]: ${errorBody}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown send error" };
  }
}
