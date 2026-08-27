import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MilestonePayoutRow = Database["public"]["Tables"]["milestone_payouts"]["Row"];
export type CommissionTierRow = Database["public"]["Tables"]["commission_tiers"]["Row"];

export type PayoutWithLead = MilestonePayoutRow & {
  lead: { id: string; lead_number: string; task_code: string; net_amount: number | null } | null;
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
  1: "Milestone 1 — $500 advance (task 5.2 — rescission clears)",
  2: "Milestone 2 — 50% of commission (task 5.1 — contract signed)",
  3: "Milestone 3 — remaining 50% less $500 (task 6.5 — job complete)",
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

export function useMilestonePayouts(opts: { repId?: string | null; leadId?: string | null }) {
  const { repId = null, leadId = null } = opts;
  return useQuery({
    queryKey: ["milestone-payouts", repId, leadId],
    enabled: !!repId || !!leadId,
    queryFn: async () => {
      let query = supabase
        .from("milestone_payouts")
        .select("*, lead:leads(id, lead_number, task_code, net_amount)")
        .order("triggered_at", { ascending: false });
      if (repId) query = query.eq("rep_id", repId);
      if (leadId) query = query.eq("lead_id", leadId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PayoutWithLead[];
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
