import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock } from "@/components/crm/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useEstimates, useLeads } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";

const title = "Estimates — Rise Above Roofing Oklahoma CRM";
const description =
  "Xactimate estimates, carrier scopes and supplement scope gaps for every qualified roofing claim.";

export const Route = createFileRoute("/_authenticated/estimates")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EstimatesPage,
});

function EstimatesPage() {
  const { canViewFinance } = useAuth();
  const { data: estimates = [], isLoading } = useEstimates();
  const { data: leads = [] } = useLeads();

  const total = estimates.reduce((s, e) => s + Number(e.total_amount), 0);
  const gaps = estimates.reduce((s, e) => s + Number(e.scope_gap_amount ?? 0), 0);

  return (
    <AppShell title="Estimates" subtitle="Add and edit estimates from each lead's Estimates & money tab">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Estimates" value={estimates.length} />
          {canViewFinance ? <KpiCard label="Estimated total" value={currency(total)} tone="positive" /> : null}
          {canViewFinance ? <KpiCard label="Scope gaps" value={currency(gaps)} tone="warning" /> : null}
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading estimates" />
        ) : estimates.length === 0 ? (
          <EmptyState message="No estimates yet." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Estimate</th>
                  <th className="px-3 py-2.5 font-semibold">Lead</th>
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Total</th> : null}
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Scope gap</th> : null}
                  <th className="px-3 py-2.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((e) => {
                  const lead = leads.find((l) => l.id === e.lead_id);
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2.5">{e.estimate_number || "—"}</td>
                      <td className="px-3 py-2.5">
                        {lead ? (
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: lead.id }}
                            className="text-primary hover:underline"
                          >
                            {lead.lead_number} · {lead.property?.address_line1}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{titleCase(e.source)}</td>
                      <td className="px-3 py-2.5 text-xs">{titleCase(e.status)}</td>
                      {canViewFinance ? <td className="px-3 py-2.5 font-medium">{currency(e.total_amount)}</td> : null}
                      {canViewFinance ? <td className="px-3 py-2.5">{currency(e.scope_gap_amount)}</td> : null}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{shortDate(e.created_at)}</td>
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
