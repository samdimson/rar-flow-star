import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currencyExact } from "@/lib/crm/format";

export const ESTIMATE_ITEMS = [
  "Shingles",
  "Hip & Ridge Cap",
  "Starter Shingles",
  "Synthetic Underlayment",
  "Ice & Water Shield",
  '1¼" Coil Roofing Nails',
  "3-in-1 Pipe Boots",
  "Roofing Caulk/Sealant",
  "Cap Staples",
  "Spray Paint",
  '7/16" OSB Roof Decking (4x8)',
  '1½" Drip Edge (10ft)',
  "Roof Turbine Vents",
  '4" Vent Caps',
  "H-Clips",
  '2" Ring-Shank Nails (OSB)',
  "Other",
] as const;

const UNITS = ["Square", "Bundle", "Roll", "Box", "Each", "Linear ft", "Sheet", "Tube", "Can"];

type LineRow = {
  id?: string;
  item: string;
  customItem?: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

const blankRow = (): LineRow => ({ item: "", quantity: "", unit: "", unit_price: "" });

const toRow = (r: { id: string; item: string; quantity: number | string; unit: string | null; unit_price: number | string }): LineRow => {
  const known = (ESTIMATE_ITEMS as readonly string[]).includes(r.item);
  return {
    id: r.id,
    item: known ? r.item : "Other",
    ...(known ? {} : { customItem: r.item }),
    quantity: String(r.quantity ?? ""),
    unit: r.unit ?? "",
    unit_price: String(r.unit_price ?? ""),
  };
};

const lineTotal = (r: LineRow) => (Number(r.quantity) || 0) * (Number(r.unit_price) || 0);

export function EstimatorPanel({ estimateId, canEdit }: { estimateId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: existing = [], isLoading } = useQuery({
    queryKey: ["estimate_line_items", estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimate_line_items")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [rows, setRows] = useState<LineRow[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(existing.length > 0 ? existing.map(toRow) : [blankRow()]);
    setRemoved([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId, existing.length, isLoading]);

  const set = (index: number, patch: Partial<LineRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const removeRow = (index: number) => {
    const row = rows[index];
    if (row?.id) setRemoved((prev) => [...prev, row.id as string]);
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);

  const save = async () => {
    const payload = rows
      .map((r, index) => ({
        row: r,
        index,
        name: r.item === "Other" ? (r.customItem ?? "").trim() : r.item,
      }))
      .filter((r) => r.name !== "");
    if (payload.length !== rows.filter((r) => r.item !== "" || r.quantity !== "" || r.unit_price !== "").length) {
      toast.error("Every line needs an item name.");
      return;
    }
    setSaving(true);
    try {
      if (removed.length > 0) {
        const { error } = await supabase.from("estimate_line_items").delete().in("id", removed);
        if (error) throw error;
      }
      const records = payload.map(({ row, index, name }) => ({
        ...(row.id ? { id: row.id } : {}),
        estimate_id: estimateId,
        item: name,
        quantity: Number(row.quantity) || 0,
        unit: row.unit || null,
        unit_price: Number(row.unit_price) || 0,
        sort_order: index,
      }));
      if (records.length > 0) {
        const { error } = await supabase.from("estimate_line_items").upsert(records);
        if (error) throw error;
      }
      const total = records.reduce((s, r) => s + r.quantity * r.unit_price, 0);
      const { error: estError } = await supabase
        .from("estimates")
        .update({ total_amount: total })
        .eq("id", estimateId);
      if (estError) throw estError;
      setRemoved([]);
      await queryClient.invalidateQueries({ queryKey: ["estimate_line_items", estimateId] });
      await queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save estimate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-2 pr-2 font-semibold">Item</th>
              <th className="pb-2 pr-2 font-semibold">Quantity</th>
              <th className="pb-2 pr-2 font-semibold">Unit</th>
              <th className="pb-2 pr-2 font-semibold">Unit Price</th>
              <th className="pb-2 pr-2 text-right font-semibold">Total</th>
              {canEdit ? <th className="pb-2" aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`} className="border-t border-border align-top">
                <td className="py-2 pr-2">
                  <Select value={r.item} onValueChange={(v) => set(i, { item: v })} disabled={!canEdit}>
                    <SelectTrigger aria-label="Item">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ESTIMATE_ITEMS.map((it) => (
                        <SelectItem key={it} value={it}>
                          {it}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.item === "Other" ? (
                    <Input
                      className="mt-1.5"
                      placeholder="Item name"
                      value={r.customItem ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => set(i, { customItem: e.target.value })}
                    />
                  ) : null}
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    step="any"
                    aria-label="Quantity"
                    value={r.quantity}
                    disabled={!canEdit}
                    onChange={(e) => set(i, { quantity: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <Select value={r.unit} onValueChange={(v) => set(i, { unit: v })} disabled={!canEdit}>
                    <SelectTrigger aria-label="Unit">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    step="any"
                    aria-label="Unit price"
                    value={r.unit_price}
                    disabled={!canEdit}
                    onChange={(e) => set(i, { unit_price: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2 pt-4 text-right font-medium">{currencyExact(lineTotal(r))}</td>
                {canEdit ? (
                  <td className="py-2 pt-3">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Remove line">
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((p) => [...p, blankRow()])}>
              <Plus className="mr-1 size-4" /> Add row
            </Button>
          ) : null}
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Grand total</Label>
          <span className="text-lg font-semibold">{currencyExact(grandTotal)}</span>
        </div>
        {canEdit ? (
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save line items"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
