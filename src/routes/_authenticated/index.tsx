import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  FileSignature,
  HardHat,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { StageBadge, TaskBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardStats, useLeads, useTasks } from "@/lib/crm/api";
import { currency, relativeDays, shortDate } from "@/lib/crm/format";
import { STAGES } from "@/lib/crm/workflow";

const title = "Management Dashboard — Rise Above Roofing Oklahoma CRM";
const description =
  "Live roofing KPIs: new leads, contact rate, inspections, qualified claims, contracts sold, jobs in production, revenue and outstanding insurance payments.";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { canViewFinance, profile } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tasks = [] } = useTasks();

  if (isLoading || statsLoading || !stats) {
    return (
      <AppShell icon={LayoutDashboard} title="Management Dashboard">
        <LoadingBlock label="Loading pipeline" />
      </AppShell>
    );
  }

  const now = Date.now();
  const contactRate = stats.new_leads_30d
    ? Math.round((stats.contacted_30d / stats.new_leads_30d) * 100)
    : 0;

  const taskCount = (...codes: string[]) =>
    codes.reduce((sum, c) => sum + (stats.task_counts[c] ?? 0), 0);
  const stageRow = (stage: number) => stats.stage_counts.find((s) => s.stage_id === stage);
  const stageCount = (stage: number) => stageRow(stage)?.count ?? 0;

  const inspectionsScheduled = taskCount("1.3");
  const inspectionsComplete = taskCount("2.1");
  const qualified = taskCount("2.3");
  const claimsPending = stageCount(3);
  const estimating = stageCount(4);
  const sold = taskCount("5.1", "5.2");
  const awaitingProduction = taskCount("5.3", "5.4", "5.5", "5.6");
  const inProduction = stageCount(6);
  const closeout = stageCount(7);
  const wonCount = stats.won_count;

  const revenue = stats.total_contract_value;
  const outstanding = Math.max(stats.invoiced_total - stats.collected_total, 0);

  const openTasks = tasks.filter((t) => t.status === "open");
  const overdue = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);

  const stalled = leads.filter(
    (l) =>
      l.status === "open" &&
      now - new Date(l.updated_at).getTime() > 14 * 86_400_000 &&
      !["2.2", "7.3", "8.3"].includes(l.task_code),
  );

  const funnel = STAGES.map((s) => {
    const row = stageRow(s.id);
    return { ...s, count: row?.count ?? 0, value: Number(row?.value ?? 0) };
  });
  const maxStage = Math.max(1, ...funnel.map((f) => f.count));

  const repRows = stats.rep_performance.map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    rate: r.leads ? Math.round((r.sold / r.leads) * 100) : 0,
  }));


  return (
    <AppShell icon={LayoutDashboard}
      title="Management Dashboard"
      subtitle={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} — live view of every roofing lead and job.`}
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/pipeline">Open pipeline</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/leads">New lead</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="New leads (30d)" value={stats.new_leads_30d} hint={`${contactRate}% contact rate`} icon={<Users className="size-4" />} />
          <KpiCard
            label="Inspections"
            value={`${inspectionsScheduled} / ${inspectionsComplete}`}
            hint="Scheduled / completed"
            icon={<CalendarClock className="size-4" />}
          />
          <KpiCard
            label="Claim qualified"
            value={qualified}
            hint={`${claimsPending} claims in filing`}
            icon={<ShieldCheck className="size-4" />}
          />
          <KpiCard
            label="Contracts sold"
            value={sold}
            hint={`${estimating} estimates in progress`}
            icon={<FileSignature className="size-4" />}
          />
          <KpiCard
            label="Jobs awaiting production"
            value={awaitingProduction}
            hint="Permit, materials, scheduling"
            icon={<HardHat className="size-4" />}
          />
          <KpiCard label="Jobs in production" value={inProduction} hint="Crews on site" tone="warning" icon={<HardHat className="size-4" />} />
          <KpiCard label="Awaiting closeout" value={closeout} hint="Depreciation & final payment" icon={<Banknote className="size-4" />} />
          <KpiCard
            label={canViewFinance ? "Revenue won" : "Jobs won"}
            value={canViewFinance ? currency(revenue) : wonCount}
            hint={canViewFinance ? `${currency(outstanding)} outstanding from carriers` : `${wonCount} closed won`}
            tone="positive"
            icon={<TrendingUp className="size-4" />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Pipeline funnel by stage" className="lg:col-span-2">
            <div className="space-y-3">
              {funnel.map((f) => (
                <div key={f.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <StageBadge stageId={f.id} />
                    </span>
                    <span className="text-muted-foreground">
                      {f.count} {f.count === 1 ? "record" : "records"}
                      {canViewFinance && f.value > 0 ? ` · ${currency(f.value)}` : ""}
                    </span>
                  </div>
                  <Progress value={(f.count / maxStage) * 100} className="mt-1.5 h-1.5" />
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard
              title="Overdue tasks"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/tasks">View all</Link>
                </Button>
              }
            >
              {overdue.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nothing overdue. Nice work.</p>
              ) : (
                <ul className="space-y-2.5">
                  {overdue.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.title}</span>
                        <span className="text-xs text-destructive">
                          {Math.abs(relativeDays(t.due_at) ?? 0)} day(s) overdue
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title={`Stalled jobs (14+ days)`}>
              {stalled.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No stalled records.</p>
              ) : (
                <ul className="space-y-2.5">
                  {stalled.slice(0, 5).map((l) => (
                    <li key={l.id} className="text-sm">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {l.lead_number} ·{" "}
                        <span className="text-orange-500">
                          {l.customer?.first_name} {l.customer?.last_name}
                        </span>
                      </Link>
                      <span className="block truncate text-xs text-sky-400">
                        {l.property?.address_line1} · last touched {shortDate(l.updated_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Sales rep performance"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/reps">Rep detail</Link>
            </Button>
          }
        >
          {repRows.length === 0 ? (
            <EmptyState message="No leads assigned yet. Create your first lead to start tracking rep performance." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Rep</th>
                    <th className="py-2 pr-3 font-semibold">Leads</th>
                    <th className="py-2 pr-3 font-semibold">Inspected</th>
                    <th className="py-2 pr-3 font-semibold">Sold</th>
                    <th className="py-2 pr-3 font-semibold">Closed won</th>
                    <th className="py-2 pr-3 font-semibold">Conversion</th>
                    {canViewFinance ? <th className="py-2 font-semibold">Revenue</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {repRows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3">{r.leads}</td>
                      <td className="py-2 pr-3">{r.inspections}</td>
                      <td className="py-2 pr-3">{r.sold}</td>
                      <td className="py-2 pr-3">{r.won}</td>
                      <td className="py-2 pr-3">{r.rate}%</td>
                      {canViewFinance ? <td className="py-2">{currency(r.revenue)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recently updated records">
          {leads.length === 0 ? (
            <EmptyState message="No leads yet." />
          ) : (
            <ul className="divide-y divide-border">
              {[...leads]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 8)
                .map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {l.lead_number} · <span className="text-orange-500">{l.customer?.first_name} {l.customer?.last_name}</span>
                      </Link>
                      <p className="truncate text-xs text-sky-400">
                        {l.property?.address_line1}, {l.property?.city}
                      </p>
                    </div>
                    <TaskBadge code={l.task_code} />
                  </li>
                ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
