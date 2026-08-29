import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices, usePayments, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";
import { useAuth } from "@/hooks/use-auth";
import { useEstimatorAccess } from "@/lib/crm/access";
import { RcvInvoiceDialog } from "@/components/crm/rcv-invoice-dialog";
import { ApplyPaymentDialog } from "@/components/crm/apply-payment-dialog";

const title = "Invoices & Payments — Rise Above Roofing Oklahoma CRM";
const description =
  "Invoices, deductible and depreciation collections, and outstanding balances owed by carriers and homeowners.";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { canViewFinance, loading } = useAuth();
  const rcvAccess = useEstimatorAccess();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: docs = [] } = useDocuments();
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (loading) {
    return (
      <AppShell icon={Banknote} title="Invoices & Payments">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!canViewFinance) {
    return (
      <AppShell icon={Banknote} title="Invoices & Payments">
        <EmptyState message="Your role does not have access to financial records." />
      </AppShell>
    );
  }

  const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const collected = invoices.reduce((s, i) => {
    const paid = payments
      .filter((p) => p.invoice_id === i.id || p.lead_id === i.lead_id)
      .reduce((ps, p) => ps + Number(p.amount), 0);
    return s + Math.min(paid, Number(i.amount));
  }, 0);
  const outstanding = Math.max(invoiced - collected, 0);

  const leadPayments = (leadId: string) => payments.filter((p) => p.lead_id === leadId);

  const invoiceDoc = (invoice: { lead_id: string; invoice_number?: string | null }) =>
    docs.find(
      (d) =>
        d.lead_id === invoice.lead_id &&
        d.category === "invoice" &&
        (invoice.invoice_number ? d.file_name?.includes(invoice.invoice_number) : true),
    );

  const openPdf = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      toast.error("Could not open PDF");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const outstandingInvoices = invoices.filter((i) => i.status !== "paid");
  const archivedInvoices = invoices.filter((i) => i.status === "paid");

  const InvoiceCard = ({
    invoice,
    archived,
  }: {
    invoice: (typeof invoices)[number];
    archived?: boolean;
  }) => {
    const lead = leadFor(invoice.lead_id);
    const customer = lead?.customer;
    const property = lead?.property;
    const paid = leadPayments(invoice.lead_id).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(Number(invoice.amount) - paid, 0);
    const doc = invoiceDoc(invoice);
    const paidDate = leadPayments(invoice.lead_id)
      .map((p) => p.received_at)
      .filter(Boolean)
      .sort()
      .at(-1);

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-orange-500">
                  {customer ? `${customer.first_name} ${customer.last_name}` : "Customer"}
                </span>
                {lead ? (
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: lead.id }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {lead.lead_number}
                  </Link>
                ) : null}
              </div>
              <p className="text-sm text-sky-400">
                {property
                  ? `${property.address_line1}${property.city ? `, ${property.city}` : ""}${property.state ? ` ${property.state}` : ""}${property.postal_code ? ` ${property.postal_code}` : ""}`
                  : "—"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                <span className="font-medium">{invoice.invoice_number || "Invoice"}</span>
                <Badge variant={archived ? "default" : "secondary"} className={archived ? "bg-green-600 text-white hover:bg-green-600" : ""}>
                  {titleCase(invoice.status)}
                </Badge>
                {invoice.issued_at ? <span className="text-xs text-muted-foreground">Issued {shortDate(invoice.issued_at)}</span> : null}
                {invoice.due_at ? <span className="text-xs text-muted-foreground">Due {shortDate(invoice.due_at)}</span> : null}
                {archived && paidDate ? <span className="text-xs text-muted-foreground">Paid {shortDate(paidDate)}</span> : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium">{currency(invoice.amount)}</p>
                <p className="text-xs text-muted-foreground">{currency(paid)} collected</p>
                {balance > 0 ? (
                  <p className="font-semibold text-orange-500">{currency(balance)} due</p>
                ) : (
                  <p className="font-semibold text-green-600">Paid</p>
                )}
              </div>
              {doc ? (
                <Button variant="ghost" size="icon" onClick={() => void openPdf(doc)} title="Open PDF">
                  <FileText className="size-5 text-orange-500" />
                </Button>
              ) : null}
              {!archived && rcvAccess.allowed ? (
                <RcvInvoiceDialog
                  invoice={{
                    id: invoice.id,
                    lead_id: invoice.lead_id,
                    invoice_number: invoice.invoice_number,
                    amount: Number(invoice.amount),
                    issued_at: invoice.issued_at,
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" title="Edit invoice">
                      <Pencil className="size-4 text-orange-500" />
                    </Button>
                  }
                />
              ) : null}
            </div>
          </div>

          {leadPayments(invoice.lead_id).length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              {leadPayments(invoice.lead_id).map((p) => (
                <li key={p.id}>
                  {titleCase(p.kind)} — {currency(p.amount)} received {p.received_at ? shortDate(p.received_at) : "—"}
                </li>
              ))}
            </ul>
          ) : null}

          {!archived ? (
            <div className="mt-3 flex justify-end">
              <ApplyPaymentDialog
                leadId={invoice.lead_id}
                invoiceId={invoice.id}
                invoiceAmount={Number(invoice.amount)}
                alreadyCollected={paid}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell
      icon={Banknote}
      title="Invoices & Payments"
      subtitle="Job costing and carrier collections"
      actions={rcvAccess.allowed ? <RcvInvoiceDialog /> : null}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Invoiced" value={currency(invoiced)} />
          <KpiCard label="Collected" value={currency(collected)} tone="positive" />
          <KpiCard label="Outstanding" value={currency(outstanding)} tone="danger" />
        </div>

        <SectionCard
          title="Outstanding Invoices"
          actions={
            outstandingInvoices.length > 0 ? (
              <span className="text-xs text-muted-foreground">{outstandingInvoices.length} open</span>
            ) : null
          }
        >
          {isLoading ? (
            <LoadingBlock label="Loading invoices" />
          ) : outstandingInvoices.length === 0 ? (
            <EmptyState message="No outstanding invoices." />
          ) : (
            <div className="space-y-3">
              {outstandingInvoices.map((i) => (
                <InvoiceCard key={i.id} invoice={i} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Archived (${archivedInvoices.length} paid)`}
          actions={
            <Button variant="ghost" size="sm" onClick={() => setArchivedOpen((v) => !v)}>
              {archivedOpen ? (
                <>
                  <ChevronUp className="mr-1 size-4" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 size-4" /> Expand
                </>
              )}
            </Button>
          }
        >
          {archivedOpen ? (
            archivedInvoices.length === 0 ? (
              <EmptyState message="No paid invoices yet." />
            ) : (
              <div className="space-y-3">
                {archivedInvoices.map((i) => (
                  <InvoiceCard key={i.id} invoice={i} archived />
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {archivedInvoices.length} paid invoice{archivedInvoices.length === 1 ? "" : "s"} hidden.
            </p>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
