import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crown, Download, Percent } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { JobsCommissionTable } from "@/components/crm/jobs-commission-table";
import { MilestoneTable } from "@/components/crm/milestone-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useAllRoles, useProfiles } from "@/lib/crm/api";
import {
  useCommissionTiers,
  useCompanyCommissionSummary,
  useJobsCommissionDetail,
  useLeadCostBreakdown,
  useMilestonePayouts,
  useRepCommission,
  startOfYearIso,
} from "@/lib/crm/commissions";
import { currencyExact } from "@/lib/crm/format";

const title = "Commissions — Rise Above Roofing Oklahoma CRM";
const description =
  "Track rep commission tiers, progress to the next tier and milestone payout status across every closed job.";

export const Route = createFileRoute("/_authenticated/commissions")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommissionsPage,
});

function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function CommissionsPage() {
  const { user, canManage, canViewFinance, loading } = useAuth();
  const isManager = canManage || canViewFinance;
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useAllRoles();
  const { data: tiers = [] } = useCommissionTiers();
  const [selectedRep, setSelectedRep] = useState<string | null>(null);

  const showAllReps = isManager && selectedRep === "all";
  const repId = showAllReps ? null : isManager ? (selectedRep ?? user?.id ?? null) : (user?.id ?? null);
  const { data: commission } = useRepCommission(repId);
  const { data: payouts = [] } = useMilestonePayouts({ repId, allReps: showAllReps });
  const { data: jobs = [], isLoading: jobsLoading } = useJobsCommissionDetail({ repId, allReps: showAllReps });

  const repOptions = useMemo(() => {
    const repIds = new Set(
      roles.filter((r) => r.role === "sales_rep" || r.role === "admin" || r.role === "owner_manager").map((r) => r.user_id),
    );
    return profiles.filter((p) => repIds.has(p.id));
  }, [profiles, roles]);

  const ownerIds = useMemo(
    () => new Set(roles.filter((r) => r.role === "owner_manager" || r.role === "admin").map((r) => r.user_id)),
    [roles],
  );

  const repsForSummary = useMemo(
    () =>
      repOptions.map((p) => ({
        id: p.id,
        name: p.full_name || p.email || "Unnamed rep",
        isOwner: ownerIds.has(p.id),
      })),
    [repOptions, ownerIds],
  );

  const { data: summary, isLoading: summaryLoading } = useCompanyCommissionSummary(repsForSummary, isManager);

  const totals = useMemo(() => {
    const yearStart = startOfYearIso();
    const ytd = payouts
      .filter((p) => p.status === "paid" && !!p.paid_at && p.paid_at >= yearStart)
      .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    return { ytd };
  }, [payouts]);

  const jobLeadIds = useMemo(() => jobs.map((j) => j.leadId), [jobs]);
  const { data: costs } = useLeadCostBreakdown(jobLeadIds);
  const breakdown = useMemo(() => {
    const contract = jobs.reduce((acc, j) => acc + Number(j.contractAmount ?? 0), 0);
    const materials = Number(costs?.materials ?? 0);
    const labor = Number(costs?.labor ?? 0);
    const gross = contract - materials - labor;
    const overhead = Number((gross * 0.15).toFixed(2));
    return { contract, materials, labor, gross, overhead, net: Number((gross - overhead).toFixed(2)) };
  }, [jobs, costs]);

  const repName = showAllReps ? "All reps" : (profiles.find((p) => p.id === repId)?.full_name ?? "You");

  const exportCsv = () => {
    const header = [
      "Rep",
      "Lead #",
      "Customer",
      "Contract Amount",
      "Materials",
      "Labor",
      "Overhead",
      "Net",
      "Rate",
      "Commission",
      "M1 Status",
      "M2 Status",
      "M3 Status",
      "Total Paid",
    ];
    const rows = jobs.map((job) => {
      const gross = job.netAmount / 0.85;
      const overhead = Number((gross * 0.15).toFixed(2));
      const costTotal = Number((job.contractAmount - gross).toFixed(2));
      return [
        repName,
        job.leadNumber,
        job.customer,
        job.contractAmount.toFixed(2),
        costTotal.toFixed(2),
        "",
        overhead.toFixed(2),
        job.netAmount.toFixed(2),
        `${(job.tierRate * 100).toFixed(0)}%`,
        job.totalCommission.toFixed(2),
        job.milestones[1]?.status ?? "",
        job.milestones[2]?.status ?? "",
        job.milestones[3]?.status ?? "",
        job.totalPaid.toFixed(2),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppShell icon={Percent} title="Commissions">
        <LoadingBlock />
      </AppShell>
    );
  }

  const closed = Number(commission?.lifetime_closed ?? 0);
  const nextMin = commission?.next_tier_min ?? null;
  const progress = nextMin ? Math.min(100, Math.round((closed / nextMin) * 100)) : 100;
  const chartData = (summary?.leaderboard ?? []).map((r) => ({
    name: r.name.split(" ")[0] ?? r.name,
    commission: Number(r.commissionEarned.toFixed(2)),
  }));

  return (
    <AppShell icon={Percent}
      title="Commissions"
      subtitle="Tier rates, progress and milestone payouts"
      actions={
        <div className="flex items-center gap-2">
          {isManager && repOptions.length ? (
            <Select
              value={showAllReps ? "all" : (repId ?? "")}
              onValueChange={(v) => setSelectedRep(v)}
            >
              <SelectTrigger className="w-56" aria-label="Select rep">
                <SelectValue placeholder="Select rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reps</SelectItem>
                {repOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {isManager ? (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={jobs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {isManager ? (
          <SectionCard title="Company Overview" contentClassName="space-y-4">
            {summaryLoading || !summary ? (
              <LoadingBlock label="Loading company totals" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard label="Active pipeline value" value={currencyExact(summary.overview.activePipeline)} />
                <KpiCard label="Commissions pending" value={currencyExact(summary.overview.pending)} tone="warning" />
                <KpiCard label="Commissions paid YTD" value={currencyExact(summary.overview.paidYtd)} tone="positive" />
                <KpiCard label="Clawback owed" value={currencyExact(summary.overview.clawback)} tone="danger" />
                <KpiCard label="Company net retained" value={currencyExact(summary.overview.companyNetRetained)} />
              </div>
            )}
          </SectionCard>
        ) : null}

        {isManager ? (
          <SectionCard title="Rep leaderboard">
            {summaryLoading || !summary ? (
              <LoadingBlock label="Loading leaderboard" />
            ) : summary.leaderboard.length === 0 ? (
              <EmptyState message="No reps found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Rep Name</th>
                      <th className="px-3 py-2 font-medium">Tier</th>
                      <th className="px-3 py-2 text-right font-medium">Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Lifetime Closed</th>
                      <th className="px-3 py-2 text-right font-medium">Commission Earned</th>
                      <th className="px-3 py-2 text-right font-medium">Pending</th>
                      <th className="px-3 py-2 text-right font-medium">Paid</th>
                      <th className="px-3 py-2 text-right font-medium">Clawback</th>
                      <th className="px-3 py-2 font-medium">Next tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.leaderboard.map((row) => (
                      <tr key={row.repId} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRep(row.repId)}
                            className="flex items-center gap-1.5 font-medium text-orange-500 hover:underline"
                          >
                            {row.isOwner ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : null}
                            {row.name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{row.isOwner ? "Owner" : (row.tierLabel ?? "—")}</td>
                        <td className="px-3 py-2 text-right">
                          {row.isOwner ? "—" : row.tierRate != null ? `${(row.tierRate * 100).toFixed(0)}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">{row.lifetimeClosed}</td>
                        <td className="px-3 py-2 text-right font-medium">{currencyExact(row.commissionEarned)}</td>
                        <td className="px-3 py-2 text-right">{currencyExact(row.pending)}</td>
                        <td className="px-3 py-2 text-right">{currencyExact(row.paid)}</td>
                        <td className="px-3 py-2 text-right">{currencyExact(row.clawback)}</td>
                        <td className="px-3 py-2">
                          {row.isOwner ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="w-32 space-y-1">
                              <Progress value={row.progress} className="h-1.5" />
                              <p className="text-[11px] text-muted-foreground">
                                {row.nextTierMin
                                  ? `${Math.max(0, row.nextTierMin - row.lifetimeClosed)} to ${row.nextTierLabel}`
                                  : "Top tier"}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        ) : null}

        {isManager && chartData.length > 0 ? (
          <SectionCard title="Commission earned by rep">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={70} />
                  <Tooltip formatter={(value: number) => currencyExact(value)} />
                  <Bar dataKey="commission" fill="#E8720C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Lifetime closed won" value={String(closed)} />
          <KpiCard
            label="Current tier"
            value={commission?.tier_label ?? "—"}
            hint={
              commission?.tier_rate != null
                ? `${(Number(commission.tier_rate) * 100).toFixed(0)}% rate`
                : undefined
            }
          />
          <KpiCard label="Commission earned (closed jobs)" value={currencyExact(commission?.commission_amount)} />
          <KpiCard label="Net base (closed jobs)" value={currencyExact(commission?.total_net)} />
        </div>

        <SectionCard title="Tier progress" contentClassName="space-y-3">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            {nextMin
              ? `${Math.max(0, nextMin - closed)} more closed job(s) to reach ${commission?.next_tier_label}.`
              : "Top tier reached — highest commission rate applied."}
          </p>
          <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {tiers.map((t) => (
              <li key={t.id} className={t.label === commission?.tier_label ? "font-semibold text-foreground" : ""}>
                {t.label} · {t.min_closed}–{t.max_closed ?? "∞"} closed
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Commission base breakdown">
          <dl className="max-w-md space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Contract Amount</dt>
              <dd className="font-medium">{currencyExact(breakdown.contract)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Less Materials</dt>
              <dd>−{currencyExact(breakdown.materials)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Less Labor</dt>
              <dd>−{currencyExact(breakdown.labor)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <dt className="text-muted-foreground">Gross after costs</dt>
              <dd>{currencyExact(breakdown.gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Less Overhead (15%)</dt>
              <dd>−{currencyExact(breakdown.overhead)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <dt>Net (commission base)</dt>
              <dd>{currencyExact(breakdown.net)}</dd>
            </div>
          </dl>
        </SectionCard>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total pending" value={currencyExact(totals.pending)} />
          <KpiCard label="Total paid" value={currencyExact(totals.paid)} />
          <KpiCard label="Total clawback" value={currencyExact(totals.clawback)} />
          <KpiCard label="YTD earned" value={currencyExact(totals.ytd)} tone="positive" />
        </div>

        <SectionCard title={`Milestone payouts — ${repName}`}>
          {isLoading ? (
            <LoadingBlock label="Loading payouts" />
          ) : !repId && !showAllReps ? (
            <EmptyState message="Select a rep to view milestone payouts." />
          ) : (
            <MilestoneTable payouts={payouts} canManage={canManage} />
          )}
        </SectionCard>

        <SectionCard title={`Jobs & Commission Detail — ${repName}`}>
          {jobsLoading ? (
            <LoadingBlock label="Loading jobs" />
          ) : jobs.length === 0 ? (
            <EmptyState message="No jobs with milestone payouts yet." />
          ) : (
            <JobsCommissionTable jobs={jobs} />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
