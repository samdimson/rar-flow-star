import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock } from "@/components/crm/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useContracts, useLeads } from "@/lib/crm/api";
import { currency, relativeDays, shortDate, titleCase } from "@/lib/crm/format";

const title = "Contracts — Rise Above Roofing Oklahoma CRM";
const description =
  "Signed roofing contracts, Direction to Pay status and mandatory three-business-day rescission tracking.";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContractsPage,
});

function ContractsPage() {
  const { canViewFinance } = useAuth();
  const { data: contracts = [], isLoading } = useContracts();
  const { data: leads = [] } = useLeads();

  const signed = contracts.filter((c) => c.signed_at);
  const inRescission = contracts.filter(
    (c) => c.rescission_ends_at && new Date(c.rescission_ends_at).getTime() > Date.now(),
  );
  const value = contracts.reduce((s, c) => s + Number(c.contract_amount), 0);

  return (
    <AppShell title="Contracts" subtitle="Signed agreements and rescission windows">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Contracts signed" value={signed.length} />
          <KpiCard label="In rescission window" value={inRescission.length} tone="warning" />
          {canViewFinance ? <KpiCard label="Contract value" value={currency(value)} tone="positive" /> : null}
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading contracts" />
        ) : contracts.length === 0 ? (
          <EmptyState message="No contracts yet. One is created when a lead reaches 5.1 — Contract Signed, Sold." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Lead</th>
                  <th className="px-3 py-2.5 font-semibold">Signed</th>
                  <th className="px-3 py-2.5 font-semibold">Rescission ends</th>
                  <th className="px-3 py-2.5 font-semibold">Direction to Pay</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Amount</th> : null}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const lead = leads.find((l) => l.id === c.lead_id);
                  const days = relativeDays(c.rescission_ends_at);
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2.5">
                        {lead ? (
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: lead.id }}
                            className="text-primary hover:underline"
                          >
                            {lead.lead_number} · {lead.customer?.last_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{shortDate(c.signed_at)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {shortDate(c.rescission_ends_at)}
                        {days !== null && days >= 0 ? (
                          <span className="block text-chart-4">{days} day(s) left</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{c.direction_to_pay_signed ? "Signed" : "Pending"}</td>
                      <td className="px-3 py-2.5 text-xs">{titleCase(c.status)}</td>
                      {canViewFinance ? (
                        <td className="px-3 py-2.5 font-medium">{currency(c.contract_amount)}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
