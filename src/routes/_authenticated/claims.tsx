import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock } from "@/components/crm/primitives";
import { TaskBadge } from "@/components/stage-badge";
import { useAuth } from "@/hooks/use-auth";
import { useClaims, useLeads, useSupplements } from "@/lib/crm/api";
import { currency, dateTime, shortDate } from "@/lib/crm/format";

const title = "Insurance Claims — Rise Above Roofing Oklahoma CRM";
const description =
  "Track carriers, claim numbers, adjusters, scopes, supplements, appeals, reinspections and depreciation releases.";

export const Route = createFileRoute("/_authenticated/claims")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ClaimsPage,
});

function ClaimsPage() {
  const { canViewFinance } = useAuth();
  const { data: claims = [], isLoading } = useClaims();
  const { data: leads = [] } = useLeads();
  const { data: supplements = [] } = useSupplements();

  const leadFor = (id: string) => leads.find((l) => l.id === id);
  const pendingAdjuster = claims.filter((c) => !c.adjuster_report_received_at);
  const openSupplements = supplements.filter((s) => s.status !== "approved" && s.status !== "denied");
  const awaitingDepreciation = claims.filter((c) => c.depreciation_amount && !c.depreciation_released_at);
  const depreciationOutstanding = awaitingDepreciation.reduce((s, c) => s + Number(c.depreciation_amount ?? 0), 0);

  return (
    <AppShell title="Insurance Claims" subtitle={`${claims.length} claim records`}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Open claims" value={claims.length} />
          <KpiCard label="Awaiting adjuster report" value={pendingAdjuster.length} tone="warning" />
          <KpiCard label="Supplements / appeals" value={openSupplements.length} tone="warning" />
          <KpiCard
            label="Depreciation outstanding"
            value={canViewFinance ? currency(depreciationOutstanding) : awaitingDepreciation.length}
            tone="danger"
          />
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading claims" />
        ) : claims.length === 0 ? (
          <EmptyState message="No claims yet. A claim record is created when a lead reaches 2.3 — Opportunity, Claim Qualified." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Lead</th>
                  <th className="px-3 py-2.5 font-semibold">Workflow</th>
                  <th className="px-3 py-2.5 font-semibold">Carrier / claim #</th>
                  <th className="px-3 py-2.5 font-semibold">Adjuster</th>
                  <th className="px-3 py-2.5 font-semibold">Meeting</th>
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">RCV / ACV</th> : null}
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Depreciation</th> : null}
                  <th className="px-3 py-2.5 font-semibold">Supplement</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const lead = leadFor(c.lead_id);
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2.5">
                        {lead ? (
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: lead.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {lead.lead_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                        <span className="block text-xs text-muted-foreground">{lead?.property?.address_line1}</span>
                      </td>
                      <td className="px-3 py-2.5">{lead ? <TaskBadge code={lead.task_code} /> : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {c.carrier || "—"}
                        <span className="block text-muted-foreground">{c.claim_number || "no claim #"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {c.adjuster_name || "—"}
                        <span className="block text-muted-foreground">{c.adjuster_phone || ""}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{dateTime(c.adjuster_meeting_at)}</td>
                      {canViewFinance ? (
                        <td className="px-3 py-2.5 text-xs">
                          {currency(c.rcv_amount)}
                          <span className="block text-muted-foreground">{currency(c.acv_amount)}</span>
                        </td>
                      ) : null}
                      {canViewFinance ? (
                        <td className="px-3 py-2.5 text-xs">
                          {currency(c.depreciation_amount)}
                          <span className="block text-muted-foreground">
                            {c.depreciation_released_at ? `released ${shortDate(c.depreciation_released_at)}` : "held"}
                          </span>
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5 text-xs">
                        {(() => {
                          const rows = supplements.filter((s) => s.lead_id === c.lead_id);
                          if (rows.length === 0) return "—";
                          const latest = rows[rows.length - 1]!;
                          return (
                            <>
                              <span className="capitalize">{latest.status}</span>
                              <span className="block text-muted-foreground">
                                {rows.length} supplement{rows.length === 1 ? "" : "s"}
                              </span>
                            </>
                          );
                        })()}
                      </td>
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
