import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { laborRate } from "@/lib/crm/labor";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MilestonePayoutRow = Database["public"]["Tables"]["milestone_payouts"]["Row"];
export type CommissionTierRow = Database["public"]["Tables"]["commission_tiers"]["Row"];

export type PayoutWithLead = MilestonePayoutRow & {
  lead: {
    id: string;
    lead_number: string;
    task_code: string;
    net_amount: number | null;
    customer?: { first_name: string | null; last_name: string | null } | null;
    property?: { address_line1: string | null } | null;
  } | null;
};

export type RepCommission = {
  lifetime_closed: number;
  tier_label: string | null;
  tier_rate: number | null;
  next_tier_label: string | null;
  next_tier_min: number | null;
  total_net: number | null;
  commission_amount: number | null;
  milestone_1_payout: number | null;
  milestone_2_payout: number | null;
  milestone_3_payout: number | null;
};

export const MILESTONE_LABELS: Record<number, string> = {
  1: "Milestone 1 — $500 advance (task 5.2 — rescission period clears)",
  2: "Milestone 2 — 50% of commission (task 3.4 → 4.1 — insurance claim approved by carrier)",
  3: "Milestone 3 — remaining 50% less $500 (task 6.5 — job complete, COC signed)",
};

export const PAYOUT_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  clawback: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
};

export function useCommissionTiers() {
  return useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_tiers")
        .select("*")
        .order("min_closed", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommissionTierRow[];
    },
  });
}

export function useRepCommission(repId: string | null) {
  return useQuery({
    queryKey: ["rep-commission", repId],
    enabled: !!repId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rep_commission", { rep_id: repId! });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as RepCommission | undefined;
      return row ?? null;
    },
  });
}

export function useMilestonePayouts(opts: { repId?: string | null; leadId?: string | null; allReps?: boolean }) {
  const { repId = null, leadId = null, allReps = false } = opts;
  return useQuery({
    queryKey: ["milestone-payouts", repId, leadId, allReps],
    enabled: allReps || !!repId || !!leadId,
    queryFn: async () => {
      let query = supabase
        .from("milestone_payouts")
        .select(
          "*, lead:leads(id, lead_number, task_code, net_amount, " +
            "customer:customers!customer_id(first_name, last_name), " +
            "property:properties!property_id(address_line1))",
        )
        .order("triggered_at", { ascending: false });
      if (repId) query = query.eq("rep_id", repId);
      if (leadId) query = query.eq("lead_id", leadId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PayoutWithLead[];
    },
  });
}

export type JobCommissionPayout = {
  milestone: number;
  amount: number;
  status: string;
  triggered_at: string;
  paid_at: string | null;
};

export type JobCommissionRow = {
  leadId: string;
  leadNumber: string;
  customer: string;
  address: string;
  taskCode: string;
  contractAmount: number;
  netAmount: number;
  tierRate: number;
  totalCommission: number;
  milestones: Record<number, JobCommissionPayout>;
  totalPaid: number;
  latestTriggeredAt: string;
};

export function useJobsCommissionDetail(opts: { repId: string | null; allReps: boolean }) {
  const { repId, allReps } = opts;
  return useQuery({
    queryKey: ["jobs-commission-detail", repId, allReps],
    enabled: allReps || !!repId,
    queryFn: async () => {
      let query = supabase
        .from("milestone_payouts")
        .select(
          "milestone, amount, status, triggered_at, paid_at, rep_id, lead_id, " +
            "lead:leads!lead_id(id, lead_number, task_code, net_amount, contract_amount, " +
            "customer:customers!customer_id(first_name, last_name), " +
            "property:properties!property_id(address_line1, city, state, postal_code))",
        )
        .order("triggered_at", { ascending: false });
      if (repId) query = query.eq("rep_id", repId);
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        milestone: number;
        amount: number;
        status: string;
        triggered_at: string;
        paid_at: string | null;
        rep_id: string | null;
        lead_id: string;
        lead: {
          id: string;
          lead_number: string;
          task_code: string;
          net_amount: number | null;
          contract_amount: number | null;
          customer: { first_name: string; last_name: string } | null;
          property: { address_line1: string; city: string; state: string; postal_code: string } | null;
        } | null;
      }>;

      // tier rate per distinct rep
      const repIds = [...new Set(rows.map((r) => r.rep_id).filter((v): v is string => !!v))];
      const rateMap = new Map<string, number>();
      await Promise.all(
        repIds.map(async (id) => {
          const { data: rate } = await supabase.rpc("get_rep_tier_rate", { _rep_id: id });
          rateMap.set(id, Number(rate ?? 0));
        }),
      );

      const byLead = new Map<string, JobCommissionRow>();
      for (const r of rows) {
        const lead = r.lead;
        if (!lead) continue;
        let job = byLead.get(r.lead_id);
        if (!job) {
          const tierRate = r.rep_id ? (rateMap.get(r.rep_id) ?? 0) : 0;
          const netAmount = Number(lead.net_amount ?? 0);
          job = {
            leadId: lead.id,
            leadNumber: lead.lead_number,
            customer: lead.customer ? `${lead.customer.first_name} ${lead.customer.last_name}`.trim() : "—",
            address: lead.property
              ? `${lead.property.address_line1}, ${lead.property.city}, ${lead.property.state} ${lead.property.postal_code}`
              : "—",
            taskCode: lead.task_code,
            contractAmount: Number(lead.contract_amount ?? 0),
            netAmount,
            tierRate,
            totalCommission: netAmount * tierRate,
            milestones: {},
            totalPaid: 0,
            latestTriggeredAt: r.triggered_at,
          };
          byLead.set(r.lead_id, job);
        }
        job.milestones[r.milestone] = {
          milestone: r.milestone,
          amount: Number(r.amount ?? 0),
          status: r.status,
          triggered_at: r.triggered_at,
          paid_at: r.paid_at,
        };
        if (r.status === "paid") job.totalPaid += Number(r.amount ?? 0);
        if (r.triggered_at > job.latestTriggeredAt) job.latestTriggeredAt = r.triggered_at;
      }

      return [...byLead.values()].sort((a, b) => b.latestTriggeredAt.localeCompare(a.latestTriggeredAt));
    },
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("milestone_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Milestone marked paid");
      void qc.invalidateQueries({ queryKey: ["milestone-payouts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/**
 * Materials/labor cost breakdown for a set of leads.
 * net = (contract - materials - labor) * 0.85 after 15% overhead deduction
 */
export const OVERHEAD_RATE = 0.15;

export function useLeadCostBreakdown(leadIds: string[]) {
  const key = [...leadIds].sort().join(",");
  return useQuery({
    queryKey: ["lead-cost-breakdown", key],
    enabled: leadIds.length > 0,
    queryFn: async () => {
      const { data: estimates, error: estError } = await supabase
        .from("estimates")
        .select("id, lead_id, labor_type, labor_squares")
        .in("lead_id", leadIds);
      if (estError) throw estError;
      const ids = (estimates ?? []).map((e) => e.id);
      let materials = 0;
      let labor = 0;
      // labor = squares * rate when the estimate carries the simplified fields
      const squares = (estimates ?? []).reduce((s, e) => s + Number(e.labor_squares ?? 0), 0);
      const laborFromSquares = (estimates ?? []).reduce(
        (s, e) => s + Number(e.labor_squares ?? 0) * laborRate(e.labor_type),
        0,
      );
      if (ids.length > 0) {
        const { data: lines, error } = await supabase
          .from("estimate_line_items")
          .select("quantity, unit_price, source")
          .in("estimate_id", ids);
        if (error) throw error;
        for (const l of lines ?? []) {
          const amount = Number(l.quantity ?? 0) * Number(l.unit_price ?? 0);
          if ((l.source ?? "material") === "labor") labor += amount;
          else materials += amount;
        }
      }
      if (squares > 0) labor = laborFromSquares;
      return { materials: Number(materials.toFixed(2)), labor: Number(labor.toFixed(2)) };
    },
  });
}

/* ---------------------------------------------------------------------------
 * Company-wide dashboard aggregates + rep leaderboard (managers only)
 * ------------------------------------------------------------------------- */

export type CompanyCommissionOverview = {
  activePipeline: number;
  pending: number;
  paidYtd: number;
  clawback: number;
  companyNetRetained: number;
};

export type LeaderboardRow = {
  repId: string;
  name: string;
  isOwner: boolean;
  tierLabel: string | null;
  tierRate: number | null;
  lifetimeClosed: number;
  commissionEarned: number;
  pending: number;
  paid: number;
  clawback: number;
  nextTierLabel: string | null;
  nextTierMin: number | null;
  progress: number;
};

export type CompanyCommissionSummary = {
  overview: CompanyCommissionOverview;
  leaderboard: LeaderboardRow[];
};

export function startOfYearIso() {
  return new Date(new Date().getUTCFullYear(), 0, 1).toISOString();
}

export function useCompanyCommissionSummary(
  reps: Array<{ id: string; name: string; isOwner: boolean }>,
  enabled: boolean,
) {
  const key = reps.map((r) => `${r.id}:${r.isOwner ? 1 : 0}`).sort().join(",");
  return useQuery({
    queryKey: ["company-commission-summary", key],
    enabled: enabled && reps.length > 0,
    queryFn: async (): Promise<CompanyCommissionSummary> => {
      const yearStart = startOfYearIso();

      const [{ data: leads, error: leadsError }, { data: payouts, error: payoutsError }] = await Promise.all([
        supabase.from("leads").select("status, contract_amount, net_amount, assigned_rep_id"),
        supabase.from("milestone_payouts").select("rep_id, amount, status, paid_at"),
      ]);
      if (leadsError) throw leadsError;
      if (payoutsError) throw payoutsError;

      const leadRows = leads ?? [];
      const payoutRows = payouts ?? [];

      const activePipeline = leadRows
        .filter((l) => l.status !== "won" && l.status !== "lost")
        .reduce((s, l) => s + Number(l.contract_amount ?? 0), 0);

      const sumPayouts = (filter: (p: (typeof payoutRows)[number]) => boolean) =>
        payoutRows.filter(filter).reduce((s, p) => s + Number(p.amount ?? 0), 0);

      const overviewBase = {
        activePipeline,
        pending: sumPayouts((p) => p.status === "pending"),
        paidYtd: sumPayouts((p) => p.status === "paid" && !!p.paid_at && p.paid_at >= yearStart),
        clawback: sumPayouts((p) => p.status === "clawback"),
      };

      const commissions = await Promise.all(
        reps.map(async (rep) => {
          const { data, error } = await supabase.rpc("get_rep_commission", { rep_id: rep.id });
          if (error) throw error;
          const row = (Array.isArray(data) ? data[0] : data) as RepCommission | undefined;
          return { rep, row: row ?? null };
        }),
      );

      const rateByRep = new Map<string, number>();
      for (const { rep, row } of commissions) rateByRep.set(rep.id, Number(row?.tier_rate ?? 0));
      const ownerIds = new Set(reps.filter((r) => r.isOwner).map((r) => r.id));

      const companyNetRetained = leadRows
        .filter((l) => l.status === "won" && !(l.assigned_rep_id && ownerIds.has(l.assigned_rep_id)))
        .reduce((s, l) => {
          const rate = l.assigned_rep_id ? (rateByRep.get(l.assigned_rep_id) ?? 0) : 0;
          return s + Number(l.net_amount ?? 0) * (1 - rate);
        }, 0);

      const leaderboard: LeaderboardRow[] = commissions
        .map(({ rep, row }) => {
          const mine = (status: string) =>
            payoutRows
              .filter((p) => p.rep_id === rep.id && p.status === status)
              .reduce((s, p) => s + Number(p.amount ?? 0), 0);
          const lifetimeClosed = Number(row?.lifetime_closed ?? 0);
          const nextTierMin = row?.next_tier_min ?? null;
          return {
            repId: rep.id,
            name: rep.name,
            isOwner: rep.isOwner,
            tierLabel: row?.tier_label ?? null,
            tierRate: row?.tier_rate != null ? Number(row.tier_rate) : null,
            lifetimeClosed,
            commissionEarned: Number(row?.commission_amount ?? 0),
            pending: mine("pending"),
            paid: mine("paid"),
            clawback: mine("clawback"),
            nextTierLabel: row?.next_tier_label ?? null,
            nextTierMin,
            progress: nextTierMin ? Math.min(100, Math.round((lifetimeClosed / nextTierMin) * 100)) : 100,
          };
        })
        .sort((a, b) => b.commissionEarned - a.commissionEarned);

      return { overview: { ...overviewBase, companyNetRetained }, leaderboard };
    },
  });
}
