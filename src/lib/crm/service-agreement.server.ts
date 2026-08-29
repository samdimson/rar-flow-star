/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  SA_COMPANY,
  SA_EMAIL,
  SA_PHONE,
  SA_WEBSITE,
  SERVICE_AGREEMENT_FIELD_LABELS,
  SERVICE_AGREEMENT_TERMS,
  type ServiceAgreementFields,
} from "./service-agreement";

const NAVY = rgb(0.04, 0.12, 0.24);
const ORANGE = rgb(0.91, 0.45, 0.05);
const GREY_TEXT = rgb(0.35, 0.38, 0.42);
const INK = rgb(0.16, 0.18, 0.22);
const BORDER = rgb(0.85, 0.86, 0.88);

export type ServiceAgreementPdfData = {
  fields: ServiceAgreementFields;
  homeownerSignaturePng: Uint8Array;
  repSignaturePng: Uint8Array;
  homeownerSignedDate: string;
  repSignedDate: string;
  logoBytes: Uint8Array | null;
};

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

export async function buildServiceAgreementPdf(data: ServiceAgreementPdfData): Promise<Uint8Array> {
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

  // ── Header: logo left, company block right, navy accent rule ──
  if (logo) {
    const scale = 56 / logo.height;
    page.drawImage(logo, { x: M, y: y - 2, width: logo.width * scale, height: 56 });
  } else {
    page.drawText(SA_COMPANY, { x: M, y: y + 30, size: 14, font: bold, color: NAVY });
  }
  const headerLines = [SA_COMPANY, SA_PHONE, SA_EMAIL, SA_WEBSITE];
  headerLines.forEach((line, i) => {
    const size = i === 0 ? 11 : 8.5;
    const font = i === 0 ? bold : body;
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: right - w,
      y: y + 44 - i * 12,
      size,
      font,
      color: i === 0 ? NAVY : GREY_TEXT,
    });
  });

  y -= 12;
  page.drawRectangle({ x: M, y, width: W, height: 2.5, color: NAVY });
  y -= 34;

  const title = "SERVICE AGREEMENT";
  const titleWidth = bold.widthOfTextAtSize(title, 20);
  page.drawText(title, { x: (612 - titleWidth) / 2, y, size: 20, font: bold, color: NAVY });
  y -= 30;

  const sectionHeading = (label: string) => {
    if (y < 110) {
      page = newPage();
      y = 724;
    }
    page.drawRectangle({ x: M, y: y - 18, width: W, height: 18, color: NAVY });
    page.drawText(label, { x: M + 8, y: y - 13, size: 8.5, font: bold, color: rgb(1, 1, 1) });
    y -= 30;
  };

  // ── Homeowner information ──
  sectionHeading("HOMEOWNER INFORMATION");
  for (const { key, label } of SERVICE_AGREEMENT_FIELD_LABELS) {
    const raw = data.fields[key] ?? "";
    const value = key === "dateOfLoss" && raw ? longDate(raw) : raw || "—";
    page.drawText(label, { x: M, y, size: 9, font: bold, color: GREY_TEXT });
    page.drawText(value, { x: M + 140, y, size: 9, font: body, color: INK });
    page.drawLine({
      start: { x: M + 136, y: y - 4 },
      end: { x: right, y: y - 4 },
      thickness: 0.5,
      color: BORDER,
    });
    y -= 20;
  }

  y -= 8;

  // ── Terms & conditions ──
  sectionHeading("TERMS & CONDITIONS");
  SERVICE_AGREEMENT_TERMS.forEach((term, index) => {
    const lines = wrap(term, body, 8.5, W - 18);
    if (y - lines.length * 11.5 < 90) {
      page = newPage();
      y = 724;
    }
    page.drawText(`${index + 1}.`, { x: M, y, size: 8.5, font: bold, color: NAVY });
    lines.forEach((line, i) => {
      page.drawText(line, { x: M + 18, y: y - i * 11.5, size: 8.5, font: body, color: INK });
    });
    y -= lines.length * 11.5 + 10;
  });

  // ── Signatures ──
  if (y < 230) {
    page = newPage();
    y = 724;
  }
  y -= 6;
  sectionHeading("SIGNATURES");

  const drawSignature = async (
    label: string,
    pngBytes: Uint8Array,
    dateValue: string,
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
    page.drawText(longDate(dateValue), {
      x: M + sigWidth + 28,
      y: boxTop - 50,
      size: 9,
      font: body,
      color: INK,
    });
    page.drawText(label, { x: M, y: boxTop - 66, size: 8, font: bold, color: GREY_TEXT });
    page.drawText("Date", { x: M + sigWidth + 24, y: boxTop - 66, size: 8, font: bold, color: GREY_TEXT });
    y = boxTop - 92;
  };

  await drawSignature("Homeowner Signature", data.homeownerSignaturePng, data.homeownerSignedDate);
  await drawSignature(
    `${SA_COMPANY} Representative`,
    data.repSignaturePng,
    data.repSignedDate,
  );

  // ── Footer on every page ──
  const total = pages.length;
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: M, y: 52 }, end: { x: right, y: 52 }, thickness: 0.75, color: BORDER });
    p.drawText(`${SA_COMPANY} • ${SA_PHONE} • ${SA_EMAIL} • ${SA_WEBSITE}`, {
      x: M,
      y: 38,
      size: 7,
      font: body,
      color: GREY_TEXT,
    });
    const pageLabel = `Page ${index + 1} of ${total}`;
    const w = body.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, { x: right - w, y: 38, size: 7, font: body, color: GREY_TEXT });
  });

  return await pdf.save();
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function sendServiceAgreementEmail(args: {
  to: string;
  cc: string[];
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
        from: `${SA_COMPANY} <onboarding@resend.dev>`,
        to: [args.to],
        cc: args.cc,
        subject: args.subject,
        text: args.text,
        html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${args.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`,
        attachments: [{ filename: "Service Agreement.pdf", content: args.pdfBase64 }],
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
