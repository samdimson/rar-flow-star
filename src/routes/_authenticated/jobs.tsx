import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Gauge } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock } from "@/components/crm/primitives";
import { StageBadge, StatusBadge, TaskBadge } from "@/components/stage-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLeads } from "@/lib/crm/api";
import { currency, shortDate } from "@/lib/crm/format";
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";

const title = "Opportunities & Jobs — Rise Above Roofing Oklahoma CRM";
const description =
  "Claim-qualified opportunities and sold roofing jobs from contract through production and insurance closeout.";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { canViewFinance } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const [view, setView] = useState("all");

  const opportunities = leads.filter((l) => l.stage_id >= 2 && l.stage_id <= 4);
  const jobs = leads.filter((l) => l.stage_id >= 5);
  const rows = view === "opportunities" ? opportunities : view === "jobs" ? jobs : [...opportunities, ...jobs];

  const contractValue = jobs.reduce((s, l) => s + Number(l.contract_amount ?? 0), 0);

  return (
    <AppShell icon={Gauge} title="Opportunities & Jobs" subtitle="Qualified claims through closeout">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Open opportunities" value={opportunities.length} hint="Inspection → estimate" />
          <KpiCard label="Sold jobs" value={jobs.length} hint="Contract → closeout" />
          <KpiCard
            label={canViewFinance ? "Contract value" : "Won jobs"}
            value={canViewFinance ? currency(contractValue) : jobs.filter((l) => l.status === "won").length}
            tone="positive"
          />
        </div>

        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-56" aria-label="Filter view"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Opportunities and jobs</SelectItem>
            <SelectItem value="opportunities">Opportunities only</SelectItem>
            <SelectItem value="jobs">Jobs only</SelectItem>
          </SelectContent>
        </Select>

        {isLoading ? (
          <LoadingBlock label="Loading records" />
        ) : rows.length === 0 ? (
          <EmptyState message="No opportunities or jobs yet. Qualify a claim on an inspection to create one." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Record</th>
                  <th className="px-3 py-2.5 font-semibold">Property</th>
                  <th className="px-3 py-2.5 font-semibold">Stage</th>
                  <th className="px-3 py-2.5 font-semibold">Task</th>
                  <th className="px-3 py-2.5 font-semibold">Install</th>
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Contract</th> : null}
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-3 py-2.5">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        <LeadIdentityHeader
                          customerName={`${l.customer?.first_name ?? ""} ${l.customer?.last_name ?? ""}`.trim()}
                          leadNumber={l.lead_number}
                        />
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-sky-400">{l.property?.address_line1}</td>
                    <td className="px-3 py-2.5"><StageBadge stageId={l.stage_id} /></td>
                    <td className="px-3 py-2.5"><TaskBadge code={l.task_code} /></td>
                    <td className="px-3 py-2.5 text-xs">{shortDate(l.install_date)}</td>
                    {canViewFinance ? (
                      <td className="px-3 py-2.5 font-medium">{currency(l.contract_amount)}</td>
                    ) : null}
                    <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
