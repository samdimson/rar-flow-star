import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { JobsCommissionTable } from "@/components/crm/jobs-commission-table";
import { MilestoneTable } from "@/components/crm/milestone-table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useAllRoles, useProfiles } from "@/lib/crm/api";
import { useCommissionTiers, useJobsCommissionDetail, useMilestonePayouts, useRepCommission } from "@/lib/crm/commissions";
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
  const { data: payouts = [], isLoading } = useMilestonePayouts({ repId, leadId: showAllReps ? "__all__" : null });
  const { data: jobs = [], isLoading: jobsLoading } = useJobsCommissionDetail({ repId, allReps: showAllReps });

  const repOptions = useMemo(() => {
    const repIds = new Set(
      roles.filter((r) => r.role === "sales_rep" || r.role === "admin" || r.role === "owner_manager").map((r) => r.user_id),
    );
    return profiles.filter((p) => repIds.has(p.id));
  }, [profiles, roles]);

  const totals = useMemo(() => {
    const sum = (status: string) =>
      payouts.filter((p) => p.status === status).reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    return { pending: sum("pending"), paid: sum("paid"), clawback: sum("clawback") };
  }, [payouts]);

  if (loading) {
    return (
      <AppShell title="Commissions">
        <LoadingBlock />
      </AppShell>
    );
  }

  const closed = Number(commission?.lifetime_closed ?? 0);
  const nextMin = commission?.next_tier_min ?? null;
  const progress = nextMin ? Math.min(100, Math.round((closed / nextMin) * 100)) : 100;
  const repName = profiles.find((p) => p.id === repId)?.full_name ?? "You";

  return (
    <AppShell
      title="Commissions"
      subtitle="Tier rates, progress and milestone payouts"
      actions={
        isManager && repOptions.length ? (
          <Select
            value={repId ?? ""}
            onValueChange={(v) => setSelectedRep(v)}
          >
            <SelectTrigger className="w-56" aria-label="Select rep">
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {repOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null
      }
    >
      <div className="space-y-4">
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

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Total pending" value={currencyExact(totals.pending)} />
          <KpiCard label="Total paid" value={currencyExact(totals.paid)} />
          <KpiCard label="Total clawback" value={currencyExact(totals.clawback)} />
        </div>

        <SectionCard title={`Milestone payouts — ${repName}`}>
          {isLoading ? (
            <LoadingBlock label="Loading payouts" />
          ) : !repId ? (
            <EmptyState message="Select a rep to view milestone payouts." />
          ) : (
            <MilestoneTable payouts={payouts} canManage={canManage} />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
