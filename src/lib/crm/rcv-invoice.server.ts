/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const RCV_COMPANY = "Rise Above Roofing Oklahoma";
export const RCV_COMPANY_EMAIL = "info@riseaboveroofingok.com";
export const RCV_COMPANY_ADDRESS_1 = "12101 N MacArthur Blvd Ste. A160";
export const RCV_COMPANY_ADDRESS_2 = "Oklahoma City OK 73162";
export const RCV_COMPANY_PHONE = "(405) 249-4281";
export const RCV_LICENSE = "OK Roofing Reg. #80007962";

const NAVY = rgb(0.04, 0.12, 0.24);
const ORANGE = rgb(0.91, 0.45, 0.05);
const GREY_TEXT = rgb(0.35, 0.38, 0.42);
const INK = rgb(0.16, 0.18, 0.22);
const BORDER = rgb(0.85, 0.86, 0.88);

export type RcvInvoiceData = {
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
  logoBytes: Uint8Array | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
    Number(n ?? 0),
  );

const longDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Chicago" }).format(d);
};

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out.filter((l, i, arr) => l !== "" || i < arr.length - 1);
}

export async function buildRcvInvoicePdf(data: RcvInvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const M = 46;
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

  // orange top / bottom rules
  page.drawRectangle({ x: 0, y: 786, width: 612, height: 6, color: ORANGE });
  page.drawRectangle({ x: 0, y: 0, width: 612, height: 6, color: ORANGE });

  let y = 742;
  page.drawText("Invoice", { x: M, y: y - 6, size: 26, font: bold, color: NAVY });

  if (logo) {
    const scale = 52 / logo.height;
    page.drawImage(logo, { x: right - logo.width * scale, y: y - 14, width: logo.width * scale, height: 52 });
  } else {
    const w = bold.widthOfTextAtSize(RCV_COMPANY, 12);
    page.drawText(RCV_COMPANY, { x: right - w, y: y + 10, size: 12, font: bold, color: NAVY });
  }

  y -= 34;
  const meta: [string, string][] = [
    ["Invoice #", data.invoiceNumber],
    ["Invoice Date", longDate(data.invoiceDate)],
    ["Claim #", data.claimNumber || "—"],
    ["Policy #", data.policyNumber || "—"],
    ["Carrier", data.carrier || "—"],
    ["Type of Loss", data.typeOfLoss || "—"],
    ["Work Completed", longDate(data.workCompleted)],
  ];
  for (const [label, value] of meta) {
    page.drawText(`${label}:`, { x: M, y, size: 8.5, font: bold, color: GREY_TEXT });
    page.drawText(value, { x: M + 86, y, size: 8.5, font: body, color: INK });
    y -= 12.5;
  }

  y -= 14;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.75, color: BORDER });

  // BILL TO / FROM
  y -= 20;
  const colX = M + W / 2;
  page.drawText("BILL TO", { x: M, y, size: 7.5, font: bold, color: ORANGE });
  page.drawText("FROM", { x: colX, y, size: 7.5, font: bold, color: ORANGE });
  y -= 14;

  const billTo = [data.billToName, ...data.billToAddress.split("\n"), data.billToPhone ?? "", data.billToEmail ?? ""]
    .map((l) => l.trim())
    .filter(Boolean);
  const from = [
    RCV_COMPANY,
    RCV_COMPANY_ADDRESS_1,
    RCV_COMPANY_ADDRESS_2,
    `${RCV_COMPANY_PHONE} | ${RCV_COMPANY_EMAIL}`,
    RCV_LICENSE,
  ];
  const rowsCount = Math.max(billTo.length, from.length);
  for (let i = 0; i < rowsCount; i += 1) {
    if (billTo[i]) {
      page.drawText(billTo[i]!, {
        x: M,
        y: y - i * 12,
        size: 9,
        font: i === 0 ? bold : body,
        color: i === 0 ? NAVY : INK,
      });
    }
    if (from[i]) {
      page.drawText(from[i]!, {
        x: colX,
        y: y - i * 12,
        size: 9,
        font: i === 0 ? bold : body,
        color: i === 0 ? NAVY : INK,
      });
    }
  }
  y -= rowsCount * 12 + 16;

  // navy header bar
  const barText = `${data.propertyAddress} — Full Roof Replacement (Insurance Scope)`;
  page.drawRectangle({ x: M, y: y - 20, width: W, height: 20, color: NAVY });
  page.drawText(barText.length > 92 ? `${barText.slice(0, 89)}…` : barText, {
    x: M + 10,
    y: y - 14,
    size: 8.5,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y -= 32;

  // scope lines
  for (const line of wrap(data.scope, body, 8.5, W - 120)) {
    page.drawText(line, { x: M, y, size: 8.5, font: body, color: INK });
    y -= 11.5;
  }

  y -= 10;
  const amountRow = (label: string, value: string, opts?: { bold?: boolean }) => {
    const font = opts?.bold ? bold : body;
    page.drawText(label, { x: M, y, size: 9.5, font, color: opts?.bold ? NAVY : INK });
    const w = font.widthOfTextAtSize(value, 9.5);
    page.drawText(value, { x: right - w, y, size: 9.5, font, color: opts?.bold ? NAVY : INK });
    y -= 16;
  };
  page.drawLine({ start: { x: M, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 0.75, color: BORDER });
  amountRow("Replacement Cost Value (RCV) — approved insurance scope", money(data.rcv));
  amountRow("Less policy deductible (homeowner responsibility)", `(${money(Math.abs(data.deductible))})`);
  page.drawLine({ start: { x: M, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 0.75, color: BORDER });
  amountRow("Total Insurance Proceeds", money(data.rcv - Math.abs(data.deductible)), { bold: true });

  // payment schedule
  y -= 4;
  page.drawRectangle({ x: M, y: y - 20, width: W, height: 20, color: NAVY });
  page.drawText("PAYMENT SCHEDULE", { x: M + 10, y: y - 14, size: 8.5, font: bold, color: rgb(1, 1, 1) });
  y -= 34;

  const paymentBlock = (title: string, note: string, amount: number) => {
    page.drawText(title, { x: M, y, size: 9.5, font: bold, color: NAVY });
    const w = bold.widthOfTextAtSize(money(amount), 9.5);
    page.drawText(money(amount), { x: right - w, y, size: 9.5, font: bold, color: NAVY });
    y -= 12;
    page.drawText(note, { x: M, y, size: 8, font: body, color: GREY_TEXT });
    const dw = bold.widthOfTextAtSize("DUE UPON RECEIPT", 8);
    page.drawText("DUE UPON RECEIPT", { x: right - dw, y, size: 8, font: bold, color: ORANGE });
    y -= 20;
  };
  paymentBlock(
    "Payment 1 — Initial ACV Payment",
    "Actual cash value released by the carrier for completed work.",
    data.payment1,
  );
  paymentBlock(
    "Payment 2 — Recoverable Depreciation",
    "Released by the carrier upon receipt of the Notice of Completion.",
    data.payment2,
  );

  // totals table
  const invoiceTotal = data.payment1 + data.payment2;
  const balance = invoiceTotal - data.paymentsReceived;
  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 0.75, color: BORDER });
  amountRow("Invoice Total", money(invoiceTotal), { bold: true });
  amountRow("Payments Received", `(${money(Math.abs(data.paymentsReceived))})`);
  page.drawText("Balance Due", { x: M, y, size: 11, font: bold, color: ORANGE });
  const bw = bold.widthOfTextAtSize(money(balance), 11);
  page.drawText(money(balance), { x: right - bw, y, size: 11, font: bold, color: ORANGE });
  y -= 26;

  const note =
    "Payments are due upon receipt of each carrier disbursement. The deductible is payable directly by the " +
    "homeowner. Recoverable depreciation is billed once the carrier releases it following submission of the " +
    "Notice of Completion.";
  for (const line of wrap(note, italic, 8.5, W)) {
    page.drawText(line, { x: M, y, size: 8.5, font: italic, color: GREY_TEXT });
    y -= 11;
  }

  y -= 10;
  page.drawText(`Thank you for choosing ${RCV_COMPANY}!`, { x: M, y, size: 10, font: bold, color: NAVY });

  // footer
  page.drawLine({ start: { x: M, y: 56 }, end: { x: right, y: 56 }, thickness: 0.75, color: BORDER });
  const footer1 = `${RCV_COMPANY} • 12101 N. MacArthur Blvd., Suite A160, Oklahoma City, OK 73162 | ${RCV_COMPANY_PHONE}`;
  const footer2 = `${RCV_COMPANY_EMAIL} • License Number ${RCV_LICENSE}`;
  page.drawText(footer1, { x: M, y: 42, size: 7, font: body, color: GREY_TEXT });
  page.drawText(footer2, { x: M, y: 32, size: 7, font: body, color: GREY_TEXT });
  if (logo) {
    const scale = 26 / logo.height;
    page.drawImage(logo, { x: right - logo.width * scale, y: 26, width: logo.width * scale, height: 26 });
  }

  return await pdf.save();
}
