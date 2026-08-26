import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StageBadge } from "@/components/stage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCrm } from "@/lib/crm-store";
import {
  OPEN_STAGES,
  STAGES,
  currency,
  stageWeight,
  type Stage,
} from "@/lib/crm-data";

const title = "Dashboard — RAR CRM Work Flow";
const description =
  "Pipeline health, weighted forecast and recent activity for the RAR sales team in one admin dashboard.";

export const Route = createFileRoute("/")({
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
  const { leads, activities } = useCrm();

  const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
  const won = leads.filter((l) => l.stage === "won");
  const lost = leads.filter((l) => l.stage === "lost");
  const openValue = open.reduce((sum, l) => sum + l.value, 0);
  const forecast = open.reduce((sum, l) => sum + l.value * stageWeight[l.stage], 0);
  const winRate =
    won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;

  const byStage = STAGES.map((s) => {
    const items = leads.filter((l) => l.stage === s.id);
    return {
      ...s,
      count: items.length,
      value: items.reduce((sum, l) => sum + l.value, 0),
    };
  });
  const maxStageValue = Math.max(...byStage.map((s) => s.value), 1);

  const topDeals = [...open].sort((a, b) => b.value - a.value).slice(0, 5);
  const leadName = (id: string) => leads.find((l) => l.id === id)?.company ?? id;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Snapshot of pipeline health across the whole team."
      actions={
        <Button asChild size="sm">
          <Link to="/leads">Manage leads</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Users className="size-4" />}
          label="Open leads"
          value={String(open.length)}
          hint={`${leads.length} total records`}
        />
        <Kpi
          icon={<Target className="size-4" />}
          label="Open pipeline"
          value={currency(openValue)}
          hint="Sum of all active deals"
        />
        <Kpi
          icon={<TrendingUp className="size-4" />}
          label="Weighted forecast"
          value={currency(forecast)}
          hint="Value × stage probability"
        />
        <Kpi
          icon={<Trophy className="size-4" />}
          label="Win rate"
          value={`${winRate}%`}
          hint={`${won.length} won / ${lost.length} lost`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {byStage.map((s) => (
              <div key={s.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">
                    {s.count} · {currency(s.value)}
                  </span>
                </div>
                <Progress
                  className="mt-2 h-2"
                  value={(s.value / maxStageValue) * 100}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.slice(0, 7).map((a) => (
              <div key={a.id} className="border-l-2 border-border pl-3">
                <p className="text-sm text-foreground">{a.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {leadName(a.leadId)} · {a.at} · {a.type}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Largest open deals</CardTitle>
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open pipeline <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {topDeals.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {l.company}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.name} · owner {l.owner}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StageBadge stage={l.stage as Stage} />
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {currency(l.value)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
