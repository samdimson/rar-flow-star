import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { StageBadge, TaskBadge } from "@/components/stage-badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useLeads, useProfiles } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";
import { LEAD_SOURCES, STAGES, TASK_BY_CODE, WORKFLOW_TASKS } from "@/lib/crm/workflow";
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";

const title = "Reports — Rise Above Roofing Oklahoma CRM";
const description =
  "Pipeline funnel, conversion by lead source, workflow task distribution and aging/stalled job reports.";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { canViewFinance, canManage } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const { data: profiles = [] } = useProfiles();

  if (isLoading) {
    return (
      <AppShell icon={Gauge} title="Reports">
        <LoadingBlock label="Building reports" />
      </AppShell>
    );
  }

  if (leads.length === 0) {
    return (
      <AppShell icon={Gauge} title="Reports">
        <EmptyState message="Reports appear once you have leads in the pipeline." />
      </AppShell>
    );
  }

  const total = leads.length;
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const sold = leads.filter((l) => l.stage_id >= 5);
  const avgContract = won.length
    ? won.reduce((s, l) => s + Number(l.contract_amount ?? 0), 0) / won.length
    : 0;

  const funnel = STAGES.map((s) => {
    const reached = leads.filter((l) => l.stage_id >= s.id).length;
    return { ...s, reached, pct: Math.round((reached / total) * 100) };
  });

  const sources = LEAD_SOURCES.map((s) => {
    const rows = leads.filter((l) => l.source === s.value);
    const soldRows = rows.filter((l) => l.stage_id >= 5);
    return {
      ...s,
      count: rows.length,
      sold: soldRows.length,
      rate: rows.length ? Math.round((soldRows.length / rows.length) * 100) : 0,
      revenue: rows.filter((l) => l.status === "won").reduce((s2, l) => s2 + Number(l.contract_amount ?? 0), 0),
    };
  }).filter((s) => s.count > 0);

  const now = Date.now();
  const aging = leads
    .filter((l) => l.status === "open")
    .map((l) => ({ lead: l, days: Math.floor((now - new Date(l.updated_at).getTime()) / 86_400_000) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 15);

  const byTask = WORKFLOW_TASKS.map((t) => ({
    code: t.code,
    name: t.name,
    count: leads.filter((l) => l.task_code === t.code).length,
  })).filter((t) => t.count > 0);

  const repRows = Array.from(
    leads.reduce((map, l) => {
      const id = l.assigned_rep_id ?? "unassigned";
      const row = map.get(id) ?? { id, count: 0, sold: 0, won: 0, lost: 0, revenue: 0 };
      row.count += 1;
      if (l.stage_id >= 5) row.sold += 1;
      if (l.status === "won") {
        row.won += 1;
        row.revenue += Number(l.contract_amount ?? 0);
      }
      if (l.status === "lost") row.lost += 1;
      map.set(id, row);
      return map;
    }, new Map<string, { id: string; count: number; sold: number; won: number; lost: number; revenue: number }>()),
  )
    .map(([, r]) => {
      const closed = r.won + r.lost;
      const profile = profiles.find((p) => p.id === r.id);
      return {
        ...r,
        name: r.id === "unassigned" ? "Unassigned" : (profile?.full_name || profile?.email || "Unknown rep"),
        winRate: closed ? Math.round((r.won / closed) * 100) : 0,
      };
    })
    .sort((a, b) => b.won - a.won || b.count - a.count);


  return (
    <AppShell icon={Gauge} title="Reports" subtitle="Funnel, source performance and aging analysis">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total records" value={total} />
          <KpiCard label="Sold" value={sold.length} hint={`${Math.round((sold.length / total) * 100)}% of all leads`} />
          <KpiCard label="Closed won / lost" value={`${won.length} / ${lost.length}`} tone="positive" />
          {canViewFinance ? <KpiCard label="Avg contract" value={currency(avgContract)} /> : null}
        </div>

        <SectionCard title={canManage ? "Performance by sales rep" : "My numbers"}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Rep</th>
                  <th className="py-2 pr-3">Leads</th>
                  <th className="py-2 pr-3">Sold</th>
                  <th className="py-2 pr-3">Won</th>
                  <th className="py-2 pr-3">Lost</th>
                  <th className="py-2 pr-3">Win rate</th>
                  {canViewFinance ? <th className="py-2">Won revenue</th> : null}
                </tr>
              </thead>
              <tbody>
                {repRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">{r.count}</td>
                    <td className="py-2 pr-3">{r.sold}</td>
                    <td className="py-2 pr-3">{r.won}</td>
                    <td className="py-2 pr-3">{r.lost}</td>
                    <td className="py-2 pr-3">{r.winRate}%</td>
                    {canViewFinance ? <td className="py-2">{currency(r.revenue)}</td> : null}
                  </tr>
                ))}
                {repRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">
                      No assigned leads yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Win rate = closed won ÷ (closed won + closed lost).
          </p>
        </SectionCard>


        <SectionCard title="Stage funnel (records that reached each stage)">
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <StageBadge stageId={f.id} />
                  <span className="text-muted-foreground">
                    {f.reached} · {f.pct}%
                  </span>
                </div>
                <Progress value={f.pct} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Conversion by lead source">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-semibold">Source</th>
                  <th className="py-2 font-semibold">Leads</th>
                  <th className="py-2 font-semibold">Sold</th>
                  <th className="py-2 font-semibold">Rate</th>
                  {canViewFinance ? <th className="py-2 font-semibold">Revenue</th> : null}
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.value} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2">{s.count}</td>
                    <td className="py-2">{s.sold}</td>
                    <td className="py-2">{s.rate}%</td>
                    {canViewFinance ? <td className="py-2">{currency(s.revenue)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title="Workflow task distribution">
            <ul className="space-y-1.5 text-sm">
              {byTask.map((t) => (
                <li key={t.code} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <TaskBadge code={t.code} />
                    <span className="text-muted-foreground">{TASK_BY_CODE[t.code]?.name}</span>
                  </span>
                  <span className="font-medium">{t.count}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard title="Aging report — longest untouched open records">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Lead</th>
                  <th className="py-2 pr-3 font-semibold">Task</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Last activity</th>
                  <th className="py-2 font-semibold">Days idle</th>
                </tr>
              </thead>
              <tbody>
                {aging.map(({ lead, days }) => (
                  <tr key={lead.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: lead.id }}
                        className="text-primary hover:underline"
                      >
                        <LeadIdentityHeader
                          variant="inline"
                          customerName={`${lead.customer?.first_name ?? ""} ${lead.customer?.last_name ?? ""}`.trim()}
                          address={lead.property?.address_line1 ?? null}
                          leadNumber={lead.lead_number}
                        />
                      </Link>
                    </td>
                    <td className="py-2 pr-3"><TaskBadge code={lead.task_code} /></td>
                    <td className="py-2 pr-3 text-xs">{titleCase(lead.source)}</td>
                    <td className="py-2 pr-3 text-xs">{shortDate(lead.updated_at)}</td>
                    <td className={`py-2 font-medium ${days > 14 ? "text-destructive" : ""}`}>{days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
