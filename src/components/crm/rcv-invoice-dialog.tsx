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

export function RcvInvoiceDialog({
  leadId = "",
  defaultCustomerId = null,
}: {
  leadId?: string;
  defaultCustomerId?: string | null;
} = {}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId);
  const [targetLeadId, setTargetLeadId] = useState(leadId);
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
        supabase.from("payments").select("amount").eq("lead_id", lead.id),
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
        nextNumber,
      };
    },
  });

  useEffect(() => {
    if (!loaded) return;
    if (!loaded.lead) {
      setPropertyAddress("");
      setResult(null);
      setForm(EMPTY);
      return;
    }
    const lead = loaded.lead;
    const claim = loaded.claim as Record<string, unknown> | null;
    const job = loaded.job as Record<string, string | null> | null;
    const property = (lead.property ?? null) as never;
    const address = addressOf(property);
    setTargetLeadId(lead.id);
    setPropertyAddress(address);
    setResult(null);
    setForm({
      invoiceNumber: loaded.nextNumber ?? "",
      invoiceDate: todayIso(),
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
    });
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
    setBusy(true);
    try {
      const res = await generate({
        data: {
          leadId: targetLeadId,
          customerId,
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
      setResult({ downloadUrl: res.downloadUrl });
      await queryClient.invalidateQueries();
      toast.success("RCV invoice generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the invoice");
    } finally {
      setBusy(false);
    }
  };

  const email = async () => {
    if (!form.billToEmail) {
      toast.error("This customer has no email address");
      return;
    }
    setEmailing(true);
    try {
      await sendEmail({
        data: {
          leadId: targetLeadId,
          invoiceNumber: form.invoiceNumber,
          customerEmail: form.billToEmail,
          propertyAddress: propertyAddress || form.billToAddress,
        },
      });
      await queryClient.invalidateQueries();
      toast.success(`Invoice emailed to ${form.billToEmail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the invoice");
    } finally {
      setEmailing(false);
    }
  };

  const money = (n: number) => currencyExact(n);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FileText className="size-4" aria-hidden="true" /> Generate RCV Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate RCV Invoice</DialogTitle>
          <DialogDescription>
            Select the customer, review the insurance figures, then generate the PDF invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select
              value={targetLeadId || ""}
              onValueChange={(leadIdValue) => {
                const lead = eligible.find((l) => l.id === leadIdValue);
                setForm(EMPTY);
                setTargetLeadId(leadIdValue);
                setCustomerId(lead?.customer_id ?? null);
                setResult(null);
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
                ["paymentsReceived", "Payments received ($)"],
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

          {result ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              {result.downloadUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" aria-hidden="true" /> Download PDF
                  </a>
                </Button>
              ) : null}
              <Button size="sm" onClick={() => void email()} disabled={emailing}>
                {emailing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Mail className="size-4" aria-hidden="true" />
                )}
                Email to customer
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !customerId}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Generating…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
