import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  FileSignature,
  HardHat,
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
import { useInvoices, useLeads, usePayments, useProfiles, useTasks } from "@/lib/crm/api";
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
  const { data: tasks = [] } = useTasks();
  const { data: profiles = [] } = useProfiles();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();

  if (isLoading) {
    return (
      <AppShell title="Management Dashboard">
        <LoadingBlock label="Loading pipeline" />
      </AppShell>
    );
  }

  const now = Date.now();
  const in30 = leads.filter((l) => now - new Date(l.created_at).getTime() < 30 * 86_400_000);
  const contacted = in30.filter((l) => l.task_code !== "1.1");
  const contactRate = in30.length ? Math.round((contacted.length / in30.length) * 100) : 0;

  const at = (codes: string[]) => leads.filter((l) => codes.includes(l.task_code));
  const inStage = (stage: number) => leads.filter((l) => l.stage_id === stage);

  const inspectionsScheduled = at(["1.3"]);
  const inspectionsComplete = at(["2.1"]);
  const qualified = at(["2.3"]);
  const claimsPending = inStage(3);
  const estimating = inStage(4);
  const sold = leads.filter((l) => ["5.1", "5.2"].includes(l.task_code));
  const awaitingProduction = at(["5.3", "5.4", "5.5", "5.6"]);
  const inProduction = inStage(6);
  const closeout = inStage(7);
  const won = leads.filter((l) => l.status === "won");

  const revenue = won.reduce((s, l) => s + Number(l.contract_amount ?? l.estimated_value ?? 0), 0);
  const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(invoiced - collected, 0);

  const openTasks = tasks.filter((t) => t.status === "open");
  const overdue = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);

  const stalled = leads.filter(
    (l) =>
      l.status === "open" &&
      now - new Date(l.updated_at).getTime() > 14 * 86_400_000 &&
      !["2.2", "7.3", "8.3"].includes(l.task_code),
  );

  const funnel = STAGES.map((s) => {
    const rows = inStage(s.id);
    return {
      ...s,
      count: rows.length,
      value: rows.reduce((sum, l) => sum + Number(l.contract_amount ?? l.estimated_value ?? 0), 0),
    };
  });
  const maxStage = Math.max(1, ...funnel.map((f) => f.count));

  const repRows = profiles
    .map((p) => {
      const mine = leads.filter((l) => l.assigned_rep_id === p.id);
      const myWon = mine.filter((l) => l.status === "won");
      return {
        id: p.id,
        name: p.full_name || p.email || "Unnamed",
        leads: mine.length,
        inspections: mine.filter((l) => l.stage_id >= 2).length,
        sold: mine.filter((l) => l.stage_id >= 5).length,
        won: myWon.length,
        revenue: myWon.reduce((s, l) => s + Number(l.contract_amount ?? 0), 0),
        rate: mine.length ? Math.round((mine.filter((l) => l.stage_id >= 5).length / mine.length) * 100) : 0,
      };
    })
    .filter((r) => r.leads > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <AppShell
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
          <KpiCard label="New leads (30d)" value={in30.length} hint={`${contactRate}% contact rate`} icon={<Users className="size-4" />} />
          <KpiCard
            label="Inspections"
            value={`${inspectionsScheduled.length} / ${inspectionsComplete.length}`}
            hint="Scheduled / completed"
            icon={<CalendarClock className="size-4" />}
          />
          <KpiCard
            label="Claim qualified"
            value={qualified.length}
            hint={`${claimsPending.length} claims in filing`}
            icon={<ShieldCheck className="size-4" />}
          />
          <KpiCard
            label="Contracts sold"
            value={sold.length}
            hint={`${estimating.length} estimates in progress`}
            icon={<FileSignature className="size-4" />}
          />
          <KpiCard
            label="Jobs awaiting production"
            value={awaitingProduction.length}
            hint="Permit, materials, scheduling"
            icon={<HardHat className="size-4" />}
          />
          <KpiCard label="Jobs in production" value={inProduction.length} hint="Crews on site" tone="warning" icon={<HardHat className="size-4" />} />
          <KpiCard label="Awaiting closeout" value={closeout.length} hint="Depreciation & final payment" icon={<Banknote className="size-4" />} />
          <KpiCard
            label={canViewFinance ? "Revenue won" : "Jobs won"}
            value={canViewFinance ? currency(revenue) : won.length}
            hint={canViewFinance ? `${currency(outstanding)} outstanding from carriers` : `${won.length} closed won`}
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
                        {l.lead_number}
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
