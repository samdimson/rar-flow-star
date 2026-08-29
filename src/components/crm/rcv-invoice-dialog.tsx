import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { currencyExact, shortDate, todayIso } from "@/lib/crm/format";
import { generateRcvInvoice, emailRcvInvoice } from "@/lib/crm/rcv-invoice.functions";
import { roofTypeLabel } from "@/lib/crm/workflow";

type Form = {
  invoiceNumber: string;
  invoiceDate: string;
  claimNumber: string;
  policyNumber: string;
  carrier: string;
  typeOfLoss: string;
  workCompleted: string;
  billToName: string;
  billToAddress: string;
  billToPhone: string;
  billToEmail: string;
  scope: string;
  rcv: string;
  deductible: string;
  payment1: string;
  payment2: string;
  paymentsReceived: string;
  paymentDate: string;
};

const EMPTY: Form = {
  invoiceNumber: "",
  invoiceDate: todayIso(),
  claimNumber: "",
  policyNumber: "",
  carrier: "",
  typeOfLoss: "Windstorm and Hail",
  workCompleted: "",
  billToName: "",
  billToAddress: "",
  billToPhone: "",
  billToEmail: "",
  scope: "",
  rcv: "0",
  deductible: "0",
  payment1: "0",
  payment2: "0",
  paymentsReceived: "0",
  paymentDate: todayIso(),
};

type LeadPayment = { amount: number; received_at: string | null; method: string | null };

type OverlayState =
  | { kind: "generating" }
  | { kind: "success"; invoiceNumber: string; customerEmail: string | null }
  | { kind: "error"; message: string }
  | null;

function classifyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const msg = raw.toLowerCase();
  if (/missing|required information/.test(msg))
    return `Customer is missing required information: ${raw.replace(/^missing[:\s]*/i, "") || "check Bill To name, address and email"}.`;
  if (/email|resend|provider|delivery/.test(msg))
    return "Invoice PDF was created but email delivery failed. Download the PDF from Documents and send manually.";
  if (/storage|upload|bucket/.test(msg))
    return "PDF could not be saved to storage. Contact your administrator.";
  if (/pdf|generate|document/.test(msg))
    return "The PDF could not be created. Check that all required fields (RCV, Deductible, ACV) are filled in.";
  return "An unexpected error occurred. Please try again or contact support.";
}

const num = (value: string) => {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const addressOf = (property: { address_line1: string; city: string; state: string; postal_code: string } | null) =>
  property ? `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}` : "";

type EligibleLead = {
  id: string;
  lead_number: string;
  status: string;
  stage_id: number;
  task_code: string;
  contract_amount: number | null;
  rescission_ends_at: string | null;
  customer_id: string | null;
  customer: { id: string; first_name: string; last_name: string; phone: string | null; email: string | null } | null;
  property: { address_line1: string; city: string; state: string; postal_code: string } | null;
  claims: { claim_number: string | null; rcv_amount: number | null; updated_at: string }[];
};

function exclusionReason(lead: EligibleLead): string | null {
  const claim = [...(lead.claims ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
  if (lead.status === "lost") return "Lead is closed/lost";
  if (lead.stage_id < 5) return "No contract signed yet";
  if (lead.task_code === "2.2") return "Claim did not qualify — no insurance scope";
  if (lead.task_code === "3.5") return "Claim denied or under appeal";
  if (!claim) return "No insurance claim opened";
  if (!claim.claim_number) return "Claim number not confirmed";
  if (!Number(claim.rcv_amount)) return "No approved RCV amount from carrier";
  if (!Number(lead.contract_amount)) return "No signed contract amount";
  if (lead.rescission_ends_at && new Date(lead.rescission_ends_at).getTime() > Date.now())
    return "Rescission window not yet cleared";
  return null;
}

type ScopeSummaryLike = {
  category_breakdown?: { category?: string | null; rcv?: string | null }[] | null;
};

function buildScopeFromSummary(summary: unknown, adjusterReportDate: string | null): string | null {
  if (!summary || typeof summary !== "object") return null;
  const rows = (summary as ScopeSummaryLike).category_breakdown;
  if (!Array.isArray(rows)) return null;
  const parts = rows
    .filter((r) => r?.category)
    .map((r) => {
      const rcv = r.rcv ? (String(r.rcv).startsWith("$") ? String(r.rcv) : `$${r.rcv}`) : "";
      return `${r.category}${rcv ? ` ${rcv}` : ""}`;
    });
  if (!parts.length) return null;
  const dated = adjusterReportDate ? shortDate(adjusterReportDate) : "on file";
  return `Approved scope per adjuster estimate dated ${dated}: ${parts.join("; ")}.`;
}

function buildScope(roofType: string | null, adjusterReportDate: string | null) {
  const shingles = roofType ? roofTypeLabel(roofType) : "architectural";
  const dated = adjusterReportDate ? shortDate(adjusterReportDate) : "on file";
  return (
    `Complete tear-off of existing shingles; ${shingles} shingles; ice & water membrane and underlayment dry-in; ` +
    `ridge vent, flashings & penetrations; 6-nail high-wind fastening pattern; cleanup, haul-off & magnetic nail sweep; ` +
    `final inspection with photo documentation. Includes all approved roofing, elevation and general items per ` +
    `adjuster estimate dated ${dated}.`
  );
}

export type EditableInvoice = {
  id: string;
  lead_id: string;
  invoice_number: string | null;
  amount: number;
  issued_at: string | null;
};

export function RcvInvoiceDialog({
  leadId = "",
  defaultCustomerId = null,
  invoice = null,
  trigger = null,
}: {
  leadId?: string;
  defaultCustomerId?: string | null;
  invoice?: EditableInvoice | null;
  trigger?: React.ReactNode;
} = {}) {
  const isEdit = !!invoice;
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId);
  const [targetLeadId, setTargetLeadId] = useState(invoice?.lead_id ?? leadId);
  const [form, setForm] = useState<Form>(EMPTY);
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [propertyAddress, setPropertyAddress] = useState("");

  const generate = useServerFn(generateRcvInvoice);
  const sendEmail = useServerFn(emailRcvInvoice);
  const queryClient = useQueryClient();

  const { data: allLeads = [] } = useQuery({
    queryKey: ["rcv-invoice-leads"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, lead_number, status, stage_id, task_code, contract_amount, rescission_ends_at, customer_id, customer:customers(id, first_name, last_name, phone, email), property:properties(address_line1, city, state, postal_code), claims:insurance_claims(claim_number, rcv_amount, updated_at)",
        )
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EligibleLead[];
    },
  });

  const { eligible, ineligible } = useMemo(() => {
    const seen = new Set<string>();
    const eligible: EligibleLead[] = [];
    const ineligible: { lead: EligibleLead; reason: string }[] = [];
    for (const lead of allLeads) {
      if (!lead.customer_id || seen.has(lead.customer_id)) continue;
      const reason = exclusionReason(lead);
      if (reason) {
        ineligible.push({ lead, reason });
      } else {
        eligible.push(lead);
        seen.add(lead.customer_id);
      }
    }
    eligible.sort((a, b) => `${a.customer?.last_name}`.localeCompare(`${b.customer?.last_name}`));
    return { eligible, ineligible };
  }, [allLeads]);

  const { data: loaded } = useQuery({
    queryKey: ["rcv-customer-context", targetLeadId],
    enabled: open && !!targetLeadId,
    queryFn: async () => {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("id, lead_number, customer_id, assigned_rep_id, property:properties(*), customer:customers(*)")
        .eq("id", targetLeadId!)
        .maybeSingle();
      if (error) throw error;
      if (!lead) return { lead: null, claim: null, job: null, rep: null, paid: 0, paymentsList: [], nextNumber: null };

      const [{ data: claim }, { data: job }, { data: rep }, { data: payments }, { data: invoices }] = await Promise.all([
        supabase
          .from("insurance_claims")
          .select("*")
          .eq("lead_id", lead.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("production_jobs")
          .select("qc_passed_at, coc_signed_at")
          .eq("lead_id", lead.id)
          .limit(1)
          .maybeSingle(),
        lead.assigned_rep_id
          ? supabase.from("profiles").select("full_name").eq("id", lead.assigned_rep_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("payments").select("amount, received_at, method").eq("lead_id", lead.id),
        supabase
          .from("invoices")
          .select("invoice_number")
          .like("invoice_number", `RAR-${new Date().getFullYear()}-%`)
          .order("invoice_number", { ascending: false })
          .limit(1),
      ]);

      const last = invoices?.[0]?.invoice_number ?? null;
      const seq = last ? Number(last.split("-").pop()) + 1 : 1;
      const nextNumber = `RAR-${new Date().getFullYear()}-${String(Number.isFinite(seq) ? seq : 1).padStart(4, "0")}`;

      return {
        lead,
        claim,
        job,
        rep,
        paid: (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
        paymentsList: (payments ?? []) as LeadPayment[],
        nextNumber,
      };
    },
  });

  useEffect(() => {
    if (!loaded) return;
    if (!loaded.lead) {
      setPropertyAddress("");
      setForm(EMPTY);
      return;
    }
    const lead = loaded.lead;
    const claim = loaded.claim as Record<string, unknown> | null;
    const job = loaded.job as Record<string, string | null> | null;
    const property = (lead.property ?? null) as never;
    const address = addressOf(property);
    setTargetLeadId(lead.id);
    if (isEdit) setCustomerId(lead.customer_id ?? null);
    setPropertyAddress(address);
    setForm({
      invoiceNumber: invoice?.invoice_number ?? loaded.nextNumber ?? "",
      invoiceDate: invoice?.issued_at ?? todayIso(),
      claimNumber: String(claim?.["claim_number"] ?? ""),
      policyNumber: String(claim?.["policy_number"] ?? ""),
      carrier: String(claim?.["carrier"] ?? ""),
      typeOfLoss: String(claim?.["type_of_loss"] ?? "") || "Windstorm and Hail",
      workCompleted: (job?.["coc_signed_at"] ?? job?.["qc_passed_at"] ?? "").slice(0, 10),
      billToName: `${lead.customer?.first_name ?? ""} ${lead.customer?.last_name ?? ""}`.trim(),
      billToAddress: address,
      billToPhone: lead.customer?.phone ?? "",
      billToEmail: lead.customer?.email ?? "",
      scope: buildScope(
        (property as { roof_type?: string | null } | null)?.roof_type ?? null,
        (claim?.["adjuster_report_received_at"] as string | null) ?? null,
      ),
      rcv: String(Number(claim?.["rcv_amount"] ?? 0)),
      deductible: String(Number(claim?.["deductible"] ?? 0)),
      payment1: String(Number(claim?.["acv_amount"] ?? 0)),
      payment2: String(Number(claim?.["depreciation_amount"] ?? 0)),
      paymentsReceived: String(loaded.paid ?? 0),
      paymentDate: todayIso(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const totals = useMemo(() => {
    const proceeds = num(form.rcv) - Math.abs(num(form.deductible));
    const invoiceTotal = num(form.payment1) + num(form.payment2);
    return { proceeds, invoiceTotal, balance: invoiceTotal - num(form.paymentsReceived) };
  }, [form]);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!targetLeadId) {
      toast.error("Select a customer with an existing lead first");
      return;
    }

    const missing: string[] = [];
    if (!form.billToName.trim()) missing.push("Bill To name");
    if (!form.billToAddress.trim()) missing.push("Bill To address");
    if (!form.billToEmail.trim()) missing.push("Bill To email");
    if (missing.length > 0) {
      setOverlay({
        kind: "error",
        message: `Customer is missing required information: ${missing.join(", ")}.`,
      });
      return;
    }
    if (!num(form.rcv) || !num(form.payment1)) {
      setOverlay({
        kind: "error",
        message: "The PDF could not be created. Check that all required fields (RCV, Deductible, ACV) are filled in.",
      });
      return;
    }

    setOverlay({ kind: "generating" });
    try {
      await generate({
        data: {
          leadId: targetLeadId,
          customerId,
          invoiceId: invoice?.id ?? null,
          invoiceNumber: form.invoiceNumber,
          invoiceDate: form.invoiceDate || todayIso(),
          claimNumber: form.claimNumber || null,
          policyNumber: form.policyNumber || null,
          carrier: form.carrier || null,
          typeOfLoss: form.typeOfLoss,
          workCompleted: form.workCompleted || null,
          billToName: form.billToName,
          billToAddress: form.billToAddress,
          billToPhone: form.billToPhone || null,
          billToEmail: form.billToEmail || null,
          propertyAddress: propertyAddress || form.billToAddress,
          scope: form.scope,
          rcv: num(form.rcv),
          deductible: num(form.deductible),
          payment1: num(form.payment1),
          payment2: num(form.payment2),
          paymentsReceived: num(form.paymentsReceived),
          origin: window.location.origin,
        },
      });
    } catch (error) {
      setOverlay({ kind: "error", message: classifyError(error) });
      return;
    }

    if (isEdit) {
      await queryClient.invalidateQueries();
      setOverlay({ kind: "success", invoiceNumber: form.invoiceNumber, customerEmail: null });
      return;
    }

    let emailError: unknown = null;
    let emailReason: string | null = null;
    try {
      const res = (await sendEmail({
        data: {
          leadId: targetLeadId,
          invoiceNumber: form.invoiceNumber,
          customerEmail: form.billToEmail,
          propertyAddress: propertyAddress || form.billToAddress,
        },
      })) as { sent: boolean; reason?: string };
      if (!res?.sent) emailReason = res?.reason ?? "email_send_failed";
    } catch (error) {
      emailError = error;
    }
    await queryClient.invalidateQueries();

    if (emailError || emailReason) {
      setOverlay({
        kind: "error",
        message:
          emailReason === "email_not_configured"
            ? "Invoice PDF was created, but no email provider is connected yet, so it was not sent. Download the PDF from Documents and send manually."
            : "Invoice PDF was created but email delivery failed. Download the PDF from Documents and send manually.",
      });
      return;
    }
    setOverlay({ kind: "success", invoiceNumber: form.invoiceNumber, customerEmail: form.billToEmail });
  };

  const money = (n: number) => currencyExact(n);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <FileText className="size-4" aria-hidden="true" /> Generate RCV Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit RCV Invoice" : "Generate RCV Invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update any field, then save to update the invoice and regenerate the PDF."
              : "Select the customer, review the insurance figures, then generate the PDF invoice."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`space-y-1.5 ${isEdit ? "hidden" : ""}`}>
            <Label>Customer</Label>
            <Select
              value={targetLeadId || ""}
              onValueChange={(leadIdValue) => {
                const lead = eligible.find((l) => l.id === leadIdValue);
                setForm(EMPTY);
                setTargetLeadId(leadIdValue);
                setCustomerId(lead?.customer_id ?? null);
              }}
            >
              <SelectTrigger aria-label="Customer">
                <SelectValue placeholder="Select an eligible customer" />
              </SelectTrigger>
              <SelectContent>
                {eligible.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No leads are currently eligible for invoicing
                  </SelectItem>
                ) : null}
                {eligible.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.customer?.first_name} {lead.customer?.last_name} — {addressOf(lead.property)} (
                    {lead.lead_number})
                  </SelectItem>
                ))}
                {ineligible.map(({ lead, reason }) => (
                  <SelectItem key={lead.id} value={`ineligible-${lead.id}`} disabled>
                    {lead.customer?.first_name} {lead.customer?.last_name} — {addressOf(lead.property)} (
                    {lead.lead_number}) — {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ineligible.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {ineligible.length} customer{ineligible.length === 1 ? "" : "s"} not eligible — reasons shown in the
                list above (e.g. {ineligible[0]!.reason}).
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["invoiceNumber", "Invoice #"],
                ["invoiceDate", "Invoice date"],
                ["claimNumber", "Claim #"],
                ["policyNumber", "Policy #"],
                ["carrier", "Carrier"],
                ["typeOfLoss", "Type of loss"],
                ["workCompleted", "Work completed"],
                ["billToName", "Bill to — name"],
                ["billToPhone", "Bill to — phone"],
                ["billToEmail", "Bill to — email"],
              ] as [keyof Form, string][]
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`rcv-${key}`}>{label}</Label>
                <Input
                  id={`rcv-${key}`}
                  type={key === "invoiceDate" || key === "workCompleted" ? "date" : "text"}
                  value={form[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rcv-address">Bill to — property address</Label>
            <Input id="rcv-address" value={form.billToAddress} onChange={(e) => set("billToAddress")(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rcv-scope">Scope description</Label>
            <Textarea id="rcv-scope" rows={5} value={form.scope} onChange={(e) => set("scope")(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["rcv", "RCV ($)"],
                ["deductible", "Deductible ($, shown as negative)"],
                ["payment1", "Payment 1 — Initial ACV ($)"],
                ["payment2", "Payment 2 — Recoverable depreciation ($)"],
              ] as [keyof Form, string][]
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`rcv-${key}`}>{label}</Label>
                <Input
                  id={`rcv-${key}`}
                  type="number"
                  step="0.01"
                  value={form[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>Payments received</Label>
            {(loaded?.paymentsList ?? []).length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(loaded?.paymentsList ?? []).map((p, i) => (
                  <li key={i}>
                    Amount: {money(Number(p.amount))} — Received:{" "}
                    {p.received_at ? shortDate(p.received_at) : "—"} — Method: {p.method || "—"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No payments recorded yet — enter 0.</p>
            )}
            <p className="text-sm font-medium">Total received: {money(loaded?.paid ?? 0)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rcv-paymentsReceived">Payments received ($)</Label>
                <Input
                  id="rcv-paymentsReceived"
                  type="number"
                  step="0.01"
                  value={form.paymentsReceived}
                  onChange={(e) => set("paymentsReceived")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcv-paymentDate">Payment date</Label>
                <Input
                  id="rcv-paymentDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => set("paymentDate")(e.target.value)}
                />
              </div>
            </div>
          </div>

          <dl className="rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between py-1">
              <dt>Total insurance proceeds (RCV − deductible)</dt>
              <dd className="font-medium">{money(totals.proceeds)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt>Invoice total (Payment 1 + Payment 2)</dt>
              <dd className="font-medium">{money(totals.invoiceTotal)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="font-semibold">Balance due</dt>
              <dd className="font-semibold text-orange-500">{money(totals.balance)}</dd>
            </div>
          </dl>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={() => void submit()} disabled={overlay !== null || !customerId}>
            {isEdit ? "Save & Regenerate PDF" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {overlay ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          {overlay.kind === "generating" ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-10 text-center shadow-xl">
              <Loader2 className="size-10 animate-spin text-orange-500" aria-hidden="true" />
              <p className="text-lg font-semibold">Generating invoice...</p>
            </div>
          ) : overlay.kind === "success" ? (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl bg-card p-8 text-center shadow-xl">
              <CheckCircle2 className="size-12 text-green-500" aria-hidden="true" />
              <p className="text-lg font-semibold">{isEdit ? "Invoice Updated" : "Invoice Generated Successfully"}</p>
              <p className="text-sm text-muted-foreground">
                Invoice {overlay.invoiceNumber} has been created
                {overlay.customerEmail ? ` and emailed to ${overlay.customerEmail}` : ""}.
              </p>
              <Button
                className="mt-2"
                onClick={() => {
                  setOverlay(null);
                  setOpen(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl bg-card p-8 text-center shadow-xl">
              <XCircle className="size-12 text-red-500" aria-hidden="true" />
              <p className="text-lg font-semibold">Invoice Generation Failed</p>
              <p className="text-sm text-muted-foreground">{overlay.message}</p>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => setOverlay(null)}>Try Again</Button>
                <Button variant="outline" onClick={() => setOverlay(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
