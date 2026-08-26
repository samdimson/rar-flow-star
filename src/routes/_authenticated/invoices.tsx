import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { useInvoices, useLeads, usePayments } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";
import { useAuth } from "@/hooks/use-auth";

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
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: leads = [] } = useLeads();

  if (loading) {
    return (
      <AppShell title="Invoices & Payments">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!canViewFinance) {
    return (
      <AppShell title="Invoices & Payments">
        <EmptyState message="Your role does not have access to financial records." />
      </AppShell>
    );
  }

  const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(invoiced - collected, 0);
  const leadFor = (id: string) => leads.find((l) => l.id === id);

  return (
    <AppShell title="Invoices & Payments" subtitle="Job costing and carrier collections">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Invoiced" value={currency(invoiced)} />
          <KpiCard label="Collected" value={currency(collected)} tone="positive" />
          <KpiCard label="Outstanding" value={currency(outstanding)} tone="danger" />
        </div>

        <SectionCard title="Invoices">
          {isLoading ? (
            <LoadingBlock label="Loading invoices" />
          ) : invoices.length === 0 ? (
            <EmptyState message="No invoices yet — one is created at 7.1 Awaiting Depreciation Release." />
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((i) => {
                const lead = leadFor(i.lead_id);
                const paid = payments
                  .filter((p) => p.invoice_id === i.id || p.lead_id === i.lead_id)
                  .reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">
                        {i.invoice_number || "Invoice"} · {titleCase(i.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead ? (
                          <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="text-primary hover:underline">
                            {lead.lead_number} · {lead.property?.address_line1}
                          </Link>
                        ) : null}
                        {i.due_at ? ` · due ${shortDate(i.due_at)}` : ""}
                      </p>
                    </div>
                    <span className="text-right">
                      <span className="block font-medium">{currency(i.amount)}</span>
                      <span className="text-xs text-muted-foreground">{currency(paid)} collected</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Payments received">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => {
                const lead = leadFor(p.lead_id);
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{titleCase(p.kind)}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead ? (
                          <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="text-primary hover:underline">
                            {lead.lead_number}
                          </Link>
                        ) : null}
                        {p.received_at ? ` · ${shortDate(p.received_at)}` : ""}
                        {p.method ? ` · ${p.method}` : ""}
                      </p>
                    </div>
                    <span className="font-medium">{currency(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
