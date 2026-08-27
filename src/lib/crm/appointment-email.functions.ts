import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const COMPANY = "Rise Above Roofing Oklahoma";

export type AppointmentEmailInput = {
  appointmentId: string | null;
  leadId: string | null;
  attendees: string;
  title: string;
  kind: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string | null;
  customerName: string | null;
  propertyAddress: string | null;
  rep: { full_name: string | null; phone: string | null; email: string | null } | null;
};

type Attendee = { name: string | null; email: string };

/** Parses `Name <email>` / bare-email entries separated by commas or semicolons. */
export function parseAttendees(raw: string): Attendee[] {
  return raw
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const bracket = entry.match(/^(.*?)<\s*([^>]+?)\s*>$/);
      if (bracket) {
        const name = bracket[1]?.trim() ?? "";
        return { name: name || null, email: (bracket[2] ?? "").trim() };
      }
      return { name: null, email: entry };
    })
    .filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email));
}

function formatRange(startsAt: string, endsAt: string | null) {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Chicago",
  };
  const start = new Date(startsAt);
  const startText = new Intl.DateTimeFormat("en-US", opts).format(start);
  if (!endsAt) return { startText, rangeText: startText, dateText: startText };
  const endText = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(endsAt));
  return {
    startText,
    rangeText: `${startText} – ${endText}`,
    dateText: new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Chicago" }).format(start),
  };
}

function buildBody(input: AppointmentEmailInput, attendee: Attendee, rangeText: string) {
  const rep = input.rep;
  const lines = [
    `Dear ${attendee.name ?? attendee.email},`,
    "",
    `You are invited to a ${input.kind.replace(/_/g, " ")} appointment scheduled by ${rep?.full_name ?? "our team"} at ${COMPANY}.`,
    "",
    `Customer: ${input.customerName ?? "—"}`,
    `Property: ${input.propertyAddress ?? "—"}`,
    `Date & Time: ${rangeText}`,
    `Location: ${input.location ?? input.propertyAddress ?? "—"}`,
  ];
  if (input.notes) lines.push("", input.notes);
  lines.push(
    "",
    "Please feel free to contact us with any questions.",
    "",
    rep?.full_name ?? "",
    rep?.phone ?? "",
    rep?.email ?? "",
    COMPANY,
  );
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const sendAppointmentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AppointmentEmailInput) => data)
  .handler(async ({ data, context }) => {
    const attendees = parseAttendees(data.attendees ?? "");
    if (attendees.length === 0) return { sent: 0, failed: 0, recipients: [] as string[] };

    const { rangeText, dateText } = formatRange(data.startsAt, data.endsAt);
    const subject = `Appointment Confirmation — ${data.title} on ${dateText}`;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    const fromAddress = `${COMPANY} <onboarding@resend.dev>`;

    let sent = 0;
    let failed = 0;

    for (const attendee of attendees) {
      const text = buildBody(data, attendee, rangeText);
      let status = "sent";
      let errorMessage: string | null = null;
      let messageId: string | null = null;

      if (!lovableKey || !resendKey) {
        status = "failed";
        errorMessage = "Email provider is not connected yet (Resend connection missing).";
      } else {
        try {
          const response = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [attendee.email],
              subject,
              text,
              html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin:0">${escapeHtml(text)}</pre>`,
            }),
          });
          const body = await response.text();
          if (!response.ok) {
            status = "failed";
            errorMessage = `Provider request failed [${response.status}]: ${body}`;
            console.error(errorMessage);
          } else {
            try {
              messageId = (JSON.parse(body) as { id?: string }).id ?? null;
            } catch {
              messageId = null;
            }
          }
        } catch (error) {
          status = "failed";
          errorMessage = error instanceof Error ? error.message : "Unknown send error";
        }
      }

      if (status === "sent") sent += 1;
      else failed += 1;

      await context.supabase.from("appointment_notifications").insert({
        appointment_id: data.appointmentId,
        lead_id: data.leadId,
        recipient_email: attendee.email,
        recipient_name: attendee.name,
        subject,
        status,
        error_message: errorMessage,
        provider_message_id: messageId,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
    }

    return { sent, failed, recipients: attendees.map((a) => a.email) };
  });
