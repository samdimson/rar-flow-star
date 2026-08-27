import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers, useLeads, useProperties } from "@/lib/crm/api";
import { currencyExact, shortDate } from "@/lib/crm/format";
import { LABOR_TYPES, laborLabel, laborRate, type LaborType } from "@/lib/crm/labor";

export function LaborEstimator({ leadId: fixedLeadId }: { leadId?: string }) {
  const { user, canEdit } = useAuth();
  const queryClient = useQueryClient();
  const lockedToLead = !!fixedLeadId;

  const [customerId, setCustomerId] = useState("");
  const [laborType, setLaborType] = useState<LaborType>("tear_off_replace");
  const [squares, setSquares] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { data: leads = [] } = useLeads();

  const leadIds = useMemo(() => {
    if (fixedLeadId) return [fixedLeadId];
    if (!customerId) return [];
    return leads.filter((l) => l.customer_id === customerId).map((l) => l.id);
  }, [fixedLeadId, customerId, leads]);

  const { data: estimate } = useQuery({
    queryKey: ["labor-estimate", leadIds.join(",")],
    enabled: leadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("id, updated_at, lead_id, labor_type, labor_squares")
        .in("lead_id", leadIds)
        .eq("source", "internal")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  useEffect(() => {
    setLaborType((estimate?.labor_type as LaborType | null) ?? "tear_off_replace");
    setSquares(estimate?.labor_squares != null ? String(estimate.labor_squares) : "");
  }, [estimate]);

  const rate = laborRate(laborType);
  const squareCount = Math.max(0, Math.floor(Number(squares) || 0));
  const total = squareCount * rate;

  const save = async () => {
    const targetLeadId = fixedLeadId ?? leadIds[0];
    if (!targetLeadId) {
      toast.error(lockedToLead ? "Missing lead." : "Select a customer with a lead first.");
      return;
    }
    if (squareCount <= 0) {
      toast.error("Enter the number of squares first.");
      return;
    }
    setSaving(true);
    try {
      let estimateId = estimate?.id;
      if (estimateId) {
        const { error } = await supabase
          .from("estimates")
          .update({ labor_type: laborType, labor_squares: squareCount, notes: "Cost estimator" })
          .eq("id", estimateId);
        if (error) throw error;
        const { error: delError } = await supabase
          .from("estimate_line_items")
          .delete()
          .eq("estimate_id", estimateId)
          .eq("source", "labor");
        if (delError) throw delError;
      } else {
        const { data, error } = await supabase
          .from("estimates")
          .insert({
            lead_id: targetLeadId,
            source: "internal",
            status: "draft",
            total_amount: total,
            notes: "Cost estimator",
            labor_type: laborType,
            labor_squares: squareCount,
            ...(user?.id ? { created_by: user.id } : {}),
          })
          .select("id")
          .single();
        if (error) throw error;
        estimateId = data.id;
      }

      const { error: insError } = await supabase.from("estimate_line_items").insert({
        estimate_id: estimateId as string,
        item: laborLabel(laborType),
        quantity: squareCount,
        unit: "SQ",
        unit_price: rate,
        source: "labor",
        sort_order: 0,
      });
      if (insError) throw insError;

      // recompute estimate total + lead net amount (labor = squares * rate)
      const { data: allLines, error: allError } = await supabase
        .from("estimate_line_items")
        .select("quantity, unit_price, source")
        .eq("estimate_id", estimateId);
      if (allError) throw allError;
      const materialsTotal = (allLines ?? [])
        .filter((l) => (l.source ?? "material") !== "labor")
        .reduce((s, l) => s + Number(l.quantity) * Number(l.unit_price), 0);
      const estimateTotal = Number((materialsTotal + total).toFixed(2));

      const { error: estError } = await supabase
        .from("estimates")
        .update({ total_amount: estimateTotal })
        .eq("id", estimateId);
      if (estError) throw estError;

      const { data: leadRow, error: leadError } = await supabase
        .from("leads")
        .select("contract_amount")
        .eq("id", targetLeadId)
        .maybeSingle();
      if (leadError) throw leadError;
      const contractAmount = Number(leadRow?.contract_amount ?? 0);
      const grossAfterCosts = contractAmount > 0 ? contractAmount - estimateTotal : 0;
      const overheadAmount = Number((grossAfterCosts * 0.15).toFixed(2));
      const netAmount = Number((grossAfterCosts - overheadAmount).toFixed(2));
      const { error: netError } = await supabase
        .from("leads")
        .update({ net_amount: netAmount, overhead_amount: overheadAmount })
        .eq("id", targetLeadId);
      if (netError) throw netError;

      await queryClient.invalidateQueries({ queryKey: ["labor-estimate"] });
      await queryClient.invalidateQueries({ queryKey: ["cost-estimator-estimate"] });
      await queryClient.invalidateQueries({ queryKey: ["estimates"] });
      await queryClient.invalidateQueries({ queryKey: ["estimate_line_items"] });
      await queryClient.invalidateQueries({ queryKey: ["lead-job-cost"] });
      await queryClient.invalidateQueries({ queryKey: ["lead-cost-breakdown"] });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Labor estimate saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save labor estimate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {lockedToLead ? (
        <p className="text-sm text-muted-foreground">Labor saves to this lead&apos;s internal estimate.</p>
      ) : (
        <div className="w-full max-w-md space-y-1.5">
          <Label htmlFor="labor-customer">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger id="labor-customer" aria-label="Customer">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {customers.map((c) => {
                const property = properties.find((p) => p.id === c.property_id);
                return (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {property ? ` — ${property.address_line1}, ${property.city}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-bold uppercase tracking-wide text-foreground">Labor Cost</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="labor-type">Labor Type</Label>
            <Select value={laborType} onValueChange={(v) => setLaborType(v as LaborType)}>
              <SelectTrigger id="labor-type" aria-label="Labor Type">
                <SelectValue placeholder="Select labor type" />
              </SelectTrigger>
              <SelectContent>
                {LABOR_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="labor-squares">Number of Squares</Label>
            <Input
              id="labor-squares"
              type="number"
              min={0}
              step={1}
              value={squares}
              onChange={(e) => setSquares(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Labor total</p>
            <p className="text-2xl font-bold text-foreground">{currencyExact(total)}</p>
            <p className="text-xs text-muted-foreground">
              {squareCount} SQ × {currencyExact(rate)}/SQ
            </p>
          </div>
          <div className="flex items-center gap-2">
            {estimate?.updated_at ? (
              <span className="text-xs text-muted-foreground">
                Last saved {shortDate(estimate.updated_at)}
              </span>
            ) : null}
            {canEdit ? (
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save to estimate"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
