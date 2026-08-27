import { Fragment, useEffect, useMemo, useState } from "react";
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

export const SECTIONS = [
  {
    label: "SHINGLES",
    items: [
      { cat: "Shingles", desc: "TAMKO Heritage / Titan XT Architectural 3-Tab (30-yr) — Asphalt Shingle", unit: "SQ", price: 120.95 },
      { cat: "Shingles", desc: "TAMKO Stormfighter Flex4 Weather-Resistant Architectural Shingle", unit: "SQ", price: 138.95 },
      { cat: "Shingles", desc: "GAF Timberline HDZ Architectural Shingle", unit: "SQ", price: 130.0 },
      { cat: "Shingles", desc: "Owens Corning Duration Architectural Shingle", unit: "SQ", price: 125.0 },
      { cat: "Shingles", desc: "CertainTeed Landmark Architectural Shingle", unit: "SQ", price: 128.0 },
      { cat: "Shingles", desc: "IKO Dynasty Architectural Shingle", unit: "SQ", price: 118.0 },
    ],
  },
  {
    label: "HIP, RIDGE & STARTER",
    items: [
      { cat: "Ridge & Starter", desc: "Hip & Ridge Cap — TAMKO Heritage or equivalent", unit: "SQ", price: 77.75 },
      { cat: "Ridge & Starter", desc: "TAMKO ProLine H&R Weatherwood Ridge Cap", unit: "SQ", price: 200.0 },
      { cat: "Ridge & Starter", desc: "Starter Shingles — 100 LF/Bundle", unit: "BD", price: 53.0 },
      { cat: "Ridge & Starter", desc: "GAF ProStart Starter Strip", unit: "BD", price: 55.0 },
    ],
  },
  {
    label: "UNDERLAYMENT",
    items: [
      { cat: "Underlayment", desc: "TAMKO Syntec Guard Synthetic Underlayment 10 SQ", unit: "RL", price: 65.0 },
      { cat: "Underlayment", desc: "TAMKO Moisture Guard 193.5 SF Ice & Water Shield", unit: "RL", price: 75.0 },
      { cat: "Underlayment", desc: "ABC ProGuard 20 Synthetic Underlayment", unit: "RL", price: 105.0 },
      { cat: "Underlayment", desc: "Felt Paper 15# (400 SF/roll)", unit: "RL", price: 35.0 },
      { cat: "Underlayment", desc: "Felt Paper 30# (200 SF/roll)", unit: "RL", price: 42.0 },
      { cat: "Underlayment", desc: "Ice & Water Shield — Grace Ice & Water (65 SF)", unit: "RL", price: 95.0 },
    ],
  },
  {
    label: "FASTENERS & NAILS",
    items: [
      { cat: "Fasteners", desc: 'Coil Roofing Nails 1-1/4" EG — 7200 ct/box', unit: "BX", price: 45.94 },
      { cat: "Fasteners", desc: 'Coil Roofing Nails 1-3/4" EG — 7200 ct/box', unit: "BX", price: 52.0 },
      { cat: "Fasteners", desc: '2" Ring-Shank Nails OSB — 50 lb box', unit: "BX", price: 100.0 },
      { cat: "Fasteners", desc: 'Cap Staples A-11 3/8" — 9600 ct/box', unit: "BX", price: 9.0 },
      { cat: "Fasteners", desc: "Slap Staples — box", unit: "BX", price: 12.0 },
      { cat: "Fasteners", desc: 'Plastic Cap Nails 1" 2M/BX', unit: "BX", price: 25.99 },
    ],
  },
  {
    label: "DECKING & STRUCTURAL",
    items: [
      { cat: "Decking", desc: '7/16" OSB Roof Decking 4x8 sheets', unit: "SH", price: 10.0 },
      { cat: "Decking", desc: '1/2" OSB Roof Decking 4x8 sheets', unit: "SH", price: 12.5 },
      { cat: "Decking", desc: 'Plywood Clip H-Clip 7/16"', unit: "BX", price: 17.25 },
      { cat: "Decking", desc: "H-Clips — box of 250", unit: "BX", price: 8.5 },
    ],
  },
  {
    label: "FLASHING, DRIP EDGE & METAL",
    items: [
      { cat: "Flashing", desc: 'Galv Drip Edge 1-1/2" Woodgrain T-Bronze 10 ft', unit: "PC", price: 8.89 },
      { cat: "Flashing", desc: 'Aluminum Drip Edge 2" x 10 ft', unit: "PC", price: 4.5 },
      { cat: "Flashing", desc: 'Step Flashing 3"x4" — bundle of 100', unit: "BD", price: 45.0 },
      { cat: "Flashing", desc: "Valley Flashing W-Style 10 ft", unit: "PC", price: 18.0 },
      { cat: "Flashing", desc: 'Pipe Boot Flashing 1.5"–3" Gray', unit: "EA", price: 13.0 },
      { cat: "Flashing", desc: '3-in-1 Pipe Boot Flashing (covers 1"–6")', unit: "EA", price: 9.99 },
      { cat: "Flashing", desc: "Chimney Flashing Kit — Step & Counter", unit: "KT", price: 85.0 },
    ],
  },
  {
    label: "VENTILATION",
    items: [
      { cat: "Ventilation", desc: 'GAF 12" Turbine Weatherwood Vent', unit: "EA", price: 101.39 },
      { cat: "Ventilation", desc: '4" Round Vent Cap', unit: "EA", price: 43.29 },
      { cat: "Ventilation", desc: 'Roof Louver Vent 16"x16"', unit: "EA", price: 22.0 },
      { cat: "Ventilation", desc: "Ridge Vent — Hip & Ridge Vent 10 ft", unit: "PC", price: 18.0 },
      { cat: "Ventilation", desc: 'Soffit Vent 8"x16"', unit: "EA", price: 4.5 },
      { cat: "Ventilation", desc: "Power Attic Vent — Electric", unit: "EA", price: 145.0 },
    ],
  },
  {
    label: "SEALANTS, COATINGS & ADHESIVES",
    items: [
      { cat: "Sealants", desc: "Roofing Caulk / Sealant — 10 oz tube", unit: "TB", price: 8.5 },
      { cat: "Sealants", desc: "Henry 208R Wet-Patch Roof Cement — quart", unit: "QT", price: 14.0 },
      { cat: "Sealants", desc: "Titebond Ultimate Crystal Paintable Caulk", unit: "CAN", price: 7.5 },
      { cat: "Sealants", desc: "Spray Paint — weatherwood match 12 oz", unit: "CN", price: 6.89 },
      { cat: "Sealants", desc: "Black Jack Roof Coat — 1 gal", unit: "GL", price: 28.0 },
    ],
  },
  {
    label: "GUTTERS & DOWNSPOUTS (OPTIONAL)",
    items: [
      { cat: "Gutters", desc: 'Aluminum Gutter 5" K-Style 10 ft', unit: "PC", price: 9.5 },
      { cat: "Gutters", desc: 'Aluminum Downspout 3"x4" 10 ft', unit: "PC", price: 8.5 },
      { cat: "Gutters", desc: "Gutter Guard Aluminum Micro-Mesh 4 ft", unit: "PC", price: 6.0 },
      { cat: "Gutters", desc: "Gutter Hanger Screw-Style", unit: "EA", price: 0.85 },
      { cat: "Gutters", desc: "Downspout Elbow A/B", unit: "EA", price: 3.5 },
    ],
  },
  {
    label: "LABOR (REFERENCE)",
    items: [
      { cat: "Labor", desc: "Tear-off & Disposal — per SQ", unit: "SQ", price: 45.0 },
      { cat: "Labor", desc: "Installation Labor — per SQ (shingle)", unit: "SQ", price: 85.0 },
      { cat: "Labor", desc: "Decking Replacement — per sheet installed", unit: "SH", price: 80.0 },
      { cat: "Labor", desc: "Flashing Labor — per LF", unit: "LF", price: 8.0 },
      { cat: "Labor", desc: "Dumpster / Haul-away (flat)", unit: "EA", price: 350.0 },
    ],
  },
] as const;

export const LABOR_SECTIONS = [
  {
    label: "TEAR-OFF & DISPOSAL",
    items: [
      { cat: "Tear-off", desc: "Shingle tear-off — per SQ", unit: "SQ", price: 45.0 },
      { cat: "Tear-off", desc: "Double layer tear-off — per SQ", unit: "SQ", price: 65.0 },
      { cat: "Tear-off", desc: "Flat/low-slope tear-off — per SQ", unit: "SQ", price: 55.0 },
      { cat: "Tear-off", desc: "Decking removal — per sheet", unit: "SH", price: 15.0 },
      { cat: "Tear-off", desc: "Dumpster / haul-away (flat)", unit: "EA", price: 350.0 },
    ],
  },
  {
    label: "INSTALLATION — SHINGLES",
    items: [
      { cat: "Install", desc: "Architectural shingle install — per SQ", unit: "SQ", price: 85.0 },
      { cat: "Install", desc: "3-tab shingle install — per SQ", unit: "SQ", price: 75.0 },
      { cat: "Install", desc: "Hip & ridge cap install — per LF", unit: "LF", price: 3.5 },
      { cat: "Install", desc: "Starter course install — per LF", unit: "LF", price: 2.0 },
    ],
  },
  {
    label: "DECKING & STRUCTURAL",
    items: [
      { cat: "Decking", desc: "OSB/plywood decking install — per sheet", unit: "SH", price: 80.0 },
      { cat: "Decking", desc: "Fascia board replace — per LF", unit: "LF", price: 8.0 },
      { cat: "Decking", desc: "Rafter/truss sister repair — per EA", unit: "EA", price: 150.0 },
    ],
  },
  {
    label: "UNDERLAYMENT & ICE SHIELD",
    items: [
      { cat: "Underlayment", desc: "Synthetic underlayment install — per SQ", unit: "SQ", price: 12.0 },
      { cat: "Underlayment", desc: "Ice & water shield install — per SQ", unit: "SQ", price: 18.0 },
    ],
  },
  {
    label: "FLASHING & METAL WORK",
    items: [
      { cat: "Flashing", desc: "Drip edge install — per LF", unit: "LF", price: 2.5 },
      { cat: "Flashing", desc: "Step flashing install — per LF", unit: "LF", price: 8.0 },
      { cat: "Flashing", desc: "Valley metal install — per LF", unit: "LF", price: 9.0 },
      { cat: "Flashing", desc: "Pipe boot install — per EA", unit: "EA", price: 45.0 },
      { cat: "Flashing", desc: "Chimney flashing install — per EA", unit: "EA", price: 350.0 },
    ],
  },
  {
    label: "VENTILATION",
    items: [
      { cat: "Ventilation", desc: "Ridge vent install — per LF", unit: "LF", price: 9.0 },
      { cat: "Ventilation", desc: "Turbine / louver vent install — per EA", unit: "EA", price: 65.0 },
      { cat: "Ventilation", desc: "Power attic vent install — per EA", unit: "EA", price: 195.0 },
    ],
  },
] as const;

type MaterialItem = { cat: string; desc: string; unit: string; price: number };

const ALL_ITEMS: MaterialItem[] = [...SECTIONS, ...LABOR_SECTIONS].flatMap(
  (s) => s.items as readonly MaterialItem[],
);

const defaultPrices = (): Record<string, number> =>
  Object.fromEntries(ALL_ITEMS.map((i) => [i.desc, i.price]));


export function CostEstimator({ leadId: fixedLeadId }: { leadId?: string }) {
  const { user, canManage, canEdit } = useAuth();
  const queryClient = useQueryClient();
  const lockedToLead = !!fixedLeadId;

  const [customerId, setCustomerId] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>(defaultPrices);
  const [saving, setSaving] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [summaryMode, setSummaryMode] = useState(false);

  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { data: leads = [] } = useLeads();

  // ---- saved material prices ----
  const { data: savedPrices = [] } = useQuery({
    queryKey: ["material_prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_prices").select("description, unit_price");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const merged = defaultPrices();
    for (const row of savedPrices) {
      if (row.description in merged) merged[row.description] = Number(row.unit_price);
    }
    setPrices(merged);
  }, [savedPrices]);

  // ---- resolve lead(s) in scope ----
  const leadIds = useMemo(() => {
    if (fixedLeadId) return [fixedLeadId];
    if (!customerId) return [];
    return leads.filter((l) => l.customer_id === customerId).map((l) => l.id);
  }, [fixedLeadId, customerId, leads]);

  const { data: estimateData } = useQuery({
    queryKey: ["cost-estimator-estimate", leadIds.join(",")],
    enabled: leadIds.length > 0,
    queryFn: async () => {
      const { data: estimates, error } = await supabase
        .from("estimates")
        .select("id, updated_at, lead_id, total_amount")
        .in("lead_id", leadIds)
        .eq("source", "internal")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const estimate = estimates?.[0];
      if (!estimate) return { estimate: null, lines: [] as { item: string; quantity: number; unit_price: number }[] };
      const { data: lines, error: lineError } = await supabase
        .from("estimate_line_items")
        .select("item, quantity, unit_price")
        .eq("estimate_id", estimate.id);
      if (lineError) throw lineError;
      return { estimate, lines: lines ?? [] };
    },
  });

  useEffect(() => {
    if (!estimateData) {
      setQuantities({});
      return;
    }
    const q: Record<string, number> = {};
    for (const line of estimateData.lines) q[line.item] = Math.round(Number(line.quantity) || 0);
    setQuantities(q);
  }, [estimateData]);

  useEffect(() => {
    setSummaryMode(false);
  }, [leadIds.join(",")]);

  const priceOf = (desc: string) => prices[desc] ?? 0;
  const qtyOf = (desc: string) => quantities[desc] ?? 0;

  const grandTotal = useMemo(
    () => ALL_ITEMS.reduce((sum, item) => sum + qtyOf(item.desc) * priceOf(item.desc), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities, prices],
  );

  const nonZeroLines = () =>
    ALL_ITEMS.filter((item) => qtyOf(item.desc) > 0).map((item, index) => ({
      category: item.cat,
      item: item.desc,
      quantity: qtyOf(item.desc),
      unit: item.unit,
      unit_price: priceOf(item.desc),
      sort_order: index,
    }));

  const savePrices = async () => {
    setSavingPrices(true);
    try {
      const records = ALL_ITEMS.map((item) => ({
        category: item.cat,
        description: item.desc,
        unit: item.unit,
        unit_price: priceOf(item.desc),
        ...(user?.id ? { updated_by: user.id } : {}),
      }));
      const { error } = await supabase.from("material_prices").upsert(records, { onConflict: "description" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["material_prices"] });
      toast.success("Prices saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save prices");
    } finally {
      setSavingPrices(false);
    }
  };

  const saveToEstimate = async () => {
    const targetLeadId = fixedLeadId ?? leadIds[0];
    if (!targetLeadId) {
      toast.error(lockedToLead ? "Missing lead." : "Select a customer with a lead first.");
      return;
    }
    const lines = nonZeroLines();
    if (lines.length === 0) {
      toast.error("Enter at least one quantity first.");
      return;
    }
    setSaving(true);
    try {
      const total = Number(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0).toFixed(2));
      let estimateId = estimateData?.estimate?.id;
      if (estimateId) {
        const { error } = await supabase
          .from("estimates")
          .update({ total_amount: total, notes: "Cost estimator" })
          .eq("id", estimateId);
        if (error) throw error;
        const { error: delError } = await supabase.from("estimate_line_items").delete().eq("estimate_id", estimateId);
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
            ...(user?.id ? { created_by: user.id } : {}),
          })
          .select("id")
          .single();
        if (error) throw error;
        estimateId = data.id;
      }
      const { error: insError } = await supabase.from("estimate_line_items").insert(
        lines.map((l) => ({
          estimate_id: estimateId as string,
          item: l.item,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          sort_order: l.sort_order,
        })),
      );
      if (insError) throw insError;
      await queryClient.invalidateQueries({ queryKey: ["cost-estimator-estimate"] });
      await queryClient.invalidateQueries({ queryKey: ["estimates"] });
      await queryClient.invalidateQueries({ queryKey: ["estimate_line_items"] });
      setSummaryMode(true);
      toast.success("Estimate saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save estimate");
    } finally {
      setSaving(false);
    }
  };

  const lastSaved = estimateData?.estimate?.updated_at ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {lockedToLead ? (
          <p className="text-sm text-muted-foreground">
            Quantities and prices save to this lead&apos;s internal estimate.
          </p>
        ) : (
          <div className="w-full max-w-md space-y-1.5">
            <Label htmlFor="customer-select">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer-select" aria-label="Customer">
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
        <div className="flex flex-wrap items-center gap-2">
          {lastSaved ? (
            <span className="text-xs text-muted-foreground">Last saved {shortDate(lastSaved)}</span>
          ) : null}
          {summaryMode ? (
            <Button variant="outline" onClick={() => setSummaryMode(false)}>
              Edit estimate
            </Button>
          ) : !lockedToLead ? (
            <>
              <Button variant="outline" onClick={() => setQuantities({})}>
                Reset all
              </Button>
              {canManage ? (
                <Button variant="outline" onClick={savePrices} disabled={savingPrices}>
                  {savingPrices ? "Saving…" : "Save prices"}
                </Button>
              ) : null}
              {canEdit ? (
                <Button onClick={saveToEstimate} disabled={saving}>
                  {saving ? "Saving…" : "Save to estimate"}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {(
        [
          { heading: "Materials Cost Estimator", sections: SECTIONS as unknown as EstimatorSection[] },
          { heading: "Labor Cost Estimator", sections: LABOR_SECTIONS as unknown as EstimatorSection[] },
        ] as const
      ).map(({ heading, sections }) => {
        const sectionsTotal = sections.reduce(
          (sum, section) =>
            sum + section.items.reduce((s, item) => s + qtyOf(item.desc) * priceOf(item.desc), 0),
          0,
        );
        return (
          <section key={heading} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{heading}</h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              {summaryMode ? (
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="sticky top-0 z-10 bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Description</th>
                      <th className="w-28 px-3 py-2.5 font-semibold">Quantity</th>
                      <th className="w-20 px-3 py-2.5 font-semibold">Unit</th>
                      <th className="w-32 px-3 py-2.5 text-right font-semibold">Unit Price</th>
                      <th className="w-32 px-3 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => {
                      const sectionLines = section.items
                        .map((item) => ({ item, qty: qtyOf(item.desc), price: priceOf(item.desc) }))
                        .filter(({ qty }) => qty > 0);
                      if (sectionLines.length === 0) return null;
                      return (
                        <Fragment key={section.label}>
                          <tr className="bg-blue-100">
                            <td colSpan={5} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-950">
                              {section.label}
                            </td>
                          </tr>
                          {sectionLines.map(({ item, qty, price }) => (
                            <tr key={item.desc} className="border-t border-border">
                              <td className="px-3 py-2">{item.desc}</td>
                              <td className="px-3 py-2">{qty}</td>
                              <td className="px-3 py-2 text-xs">{item.unit}</td>
                              <td className="px-3 py-2 text-right">{currencyExact(price)}</td>
                              <td className="px-3 py-2 text-right font-medium">{currencyExact(qty * price)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary font-semibold">
                      <td className="px-3 py-2.5" colSpan={4}>
                        {heading} subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right">{currencyExact(sectionsTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Category</th>
                      <th className="px-3 py-2.5 font-semibold">Description</th>
                      <th className="w-28 px-3 py-2.5 font-semibold">Quantity</th>
                      <th className="w-20 px-3 py-2.5 font-semibold">Unit</th>
                      <th className="w-32 px-3 py-2.5 text-right font-semibold">Unit Price</th>
                      <th className="w-32 px-3 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <Fragment key={section.label}>
                        <tr className="bg-blue-100">
                          <td colSpan={6} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-950">
                            {section.label}
                          </td>
                        </tr>
                        {section.items.map((item) => {
                          const qty = qtyOf(item.desc);
                          const price = priceOf(item.desc);
                          return (
                            <tr key={item.desc} className="border-t border-border hover:bg-secondary/30">
                              <td className="px-3 py-2 text-xs text-muted-foreground">{item.cat}</td>
                              <td className="px-3 py-2">{item.desc}</td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="h-8 w-24"
                                  aria-label={`Quantity for ${item.desc}`}
                                  value={qty === 0 ? "0" : String(qty)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const parsed = raw === "" ? 0 : parseInt(raw, 10);
                                    setQuantities((prev) => ({
                                      ...prev,
                                      [item.desc]: Math.max(0, Number.isNaN(parsed) ? 0 : parsed),
                                    }));
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 text-xs">{item.unit}</td>
                              <td className="px-3 py-2 text-right">
                                {canManage ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="h-8 w-28 text-right"
                                    aria-label={`Unit price for ${item.desc}`}
                                    value={String(price)}
                                    onChange={(e) =>
                                      setPrices((prev) => ({
                                        ...prev,
                                        [item.desc]: Math.max(0, Number(e.target.value) || 0),
                                      }))
                                    }
                                  />
                                ) : (
                                  currencyExact(price)
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{currencyExact(qty * price)}</td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary font-semibold">
                      <td className="px-3 py-2.5" colSpan={5}>
                        {heading} subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right">{currencyExact(sectionsTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </section>
        );
      })}

      <div className="overflow-hidden rounded-lg border-2 border-border">
        <div className="flex items-center justify-between bg-yellow-200 px-3 py-3 font-bold text-yellow-950">
          <span>Grand total (materials + labor)</span>
          <span className="text-base">{currencyExact(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

