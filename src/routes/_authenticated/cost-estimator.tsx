import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { currencyExact } from "@/lib/crm/format";

const title = "Cost Estimator — Rise Above Roofing Oklahoma CRM";
const description =
  "Wholesale roofing material and labor cost estimator with live line totals and one-click save to a lead estimate.";

export const Route = createFileRoute("/_authenticated/cost-estimator")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CostEstimatorPage,
});

const SECTIONS = [
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

function CostEstimatorPage() {
  const { leadId } = Route.useSearch();
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const qtyOf = (key: string) => quantities[key] ?? 0;

  const grandTotal = useMemo(
    () =>
      SECTIONS.reduce(
        (sum, section, si) =>
          sum + section.items.reduce((s, item, ii) => s + qtyOf(`${si}-${ii}`) * item.price, 0),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities],
  );

  const nonZeroLines = () =>
    SECTIONS.flatMap((section, si) =>
      section.items
        .map((item, ii) => ({ item, qty: qtyOf(`${si}-${ii}`) }))
        .filter(({ qty }) => qty > 0)
        .map(({ item, qty }) => ({
          section: section.label,
          category: item.cat,
          description: item.desc,
          quantity: qty,
          unit: item.unit,
          unit_price: item.price,
          total: Number((qty * item.price).toFixed(2)),
        })),
    );

  const saveToEstimate = async () => {
    if (!leadId) {
      toast.error("Open the cost estimator from a lead to save an estimate.");
      return;
    }
    const lines = nonZeroLines();
    if (lines.length === 0) {
      toast.error("Enter at least one quantity first.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("estimates").insert({
        lead_id: leadId,
        source: "internal",
        status: "draft",
        total_amount: Number(grandTotal.toFixed(2)),
        notes: JSON.stringify(lines),
        ...(user?.id ? { created_by: user.id } : {}),
      });
      if (error) throw error;
      toast.success("Estimate saved to lead");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save estimate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Cost Estimator"
      subtitle="Fixed wholesale material and labor rates — enter quantities to build a total"
      actions={
        <>
          <Button variant="outline" onClick={() => setQuantities({})}>
            Reset all
          </Button>
          <Button onClick={saveToEstimate} disabled={saving}>
            {saving ? "Saving…" : "Save to estimate"}
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
              <th className="w-28 px-3 py-2.5 font-semibold">Quantity</th>
              <th className="w-20 px-3 py-2.5 font-semibold">Unit</th>
              <th className="w-28 px-3 py-2.5 text-right font-semibold">Unit Price</th>
              <th className="w-32 px-3 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section, si) => (
              <>
                <tr key={section.label} className="bg-blue-100">
                  <td colSpan={6} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-950">
                    {section.label}
                  </td>
                </tr>
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`;
                  const qty = qtyOf(key);
                  return (
                    <tr key={key} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{item.cat}</td>
                      <td className="px-3 py-2">{item.desc}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="h-8 w-24"
                          aria-label={`Quantity for ${item.desc}`}
                          value={qty === 0 ? "0" : String(qty)}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [key]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">{item.unit}</td>
                      <td className="px-3 py-2 text-right">{currencyExact(item.price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{currencyExact(qty * item.price)}</td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr className="border-t-2 border-border bg-yellow-200 font-bold text-yellow-950">
              <td className="px-3 py-3" colSpan={5}>
                Grand total
              </td>
              <td className="px-3 py-3 text-right text-base">{currencyExact(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}
