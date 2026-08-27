import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpsert } from "@/lib/crm/api";
import { laborRate } from "@/lib/crm/labor";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

/** Recompute lead.net_amount = (contract_amount - materials - labor) * 0.85 after a 15% overhead deduction. */
async function recalcLeadNetAmount(leadId: string) {
  const { data: lead } = await supabase.from("leads").select("contract_amount").eq("id", leadId).maybeSingle();
  const { data: estimates } = await supabase
    .from("estimates")
    .select("id, labor_type, labor_squares")
    .eq("lead_id", leadId);
  const estimateIds = (estimates ?? []).map((e) => e.id);
  let lines: { quantity: number | null; unit_price: number | null; source: string | null }[] = [];
  if (estimateIds.length > 0) {
    const { data } = await supabase
      .from("estimate_line_items")
      .select("quantity, unit_price, source")
      .in("estimate_id", estimateIds);
    lines = data ?? [];
  }
  const sumFor = (predicate: (s: string) => boolean) =>
    lines
      .filter((l) => predicate(l.source ?? "material"))
      .reduce((s, l) => s + Number(l.quantity ?? 0) * Number(l.unit_price ?? 0), 0);
  const materialsTotal = sumFor((s) => s !== "labor");
  // labor = squares * rate when the estimate carries the simplified fields
  const squares = (estimates ?? []).reduce((s, e) => s + Number(e.labor_squares ?? 0), 0);
  const laborTotal =
    squares > 0
      ? (estimates ?? []).reduce(
          (s, e) => s + Number(e.labor_squares ?? 0) * laborRate(e.labor_type),
          0,
        )
      : sumFor((s) => s === "labor");
  const grossAfterCosts = Number(lead?.contract_amount ?? 0) - materialsTotal - laborTotal;
  const overheadAmount = Number((grossAfterCosts * 0.15).toFixed(2));
  const netAmount = Number((grossAfterCosts - overheadAmount).toFixed(2));
  await supabase.from("leads").update({ net_amount: netAmount, overhead_amount: overheadAmount }).eq("id", leadId);
}

type Tables = Database["public"]["Tables"];

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime" | "textarea" | "select" | "checkbox" | "email" | "tel";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  /** Value used when the record has no stored value for this field. */
  defaultValue?: string | number | boolean;

  /** Excluded from the saved payload (used for UI-only helper inputs). */
  transient?: boolean;
  /** Render/validate this field only when the predicate passes. */
  showIf?: (values: Record<string, unknown>) => boolean;
};

type Values = Record<string, unknown>;

const toInput = (spec: FieldSpec, value: unknown) => {
  if (value === null || value === undefined) return spec.type === "checkbox" ? false : "";
  if (spec.type === "datetime" && typeof value === "string") return value.slice(0, 16);
  if (spec.type === "date" && typeof value === "string") return value.slice(0, 10);
  return value as string | number | boolean;
};

const fromInput = (spec: FieldSpec, value: unknown) => {
  if (spec.type === "checkbox") return Boolean(value);
  if (value === "" || value === undefined) return null;
  if (spec.type === "number") return Number(value);
  if (spec.type === "datetime") return new Date(value as string).toISOString();
  return value;
};

export function RecordForm<K extends keyof Tables>({
  table,
  label,
  fields,
  initial,
  extra,
  submitLabel = "Save",
  onSaved,
  onCancel,
  columns = 2,
  className,
  resetAfterSave = false,
  transformPayload,
}: {
  table: K;
  label: string;
  fields: FieldSpec[];
  initial?: Values | null | undefined;
  extra?: Values;
  submitLabel?: string;
  onSaved?: (row?: Values | null) => void;
  onCancel?: () => void;
  columns?: 1 | 2 | 3;
  className?: string;
  resetAfterSave?: boolean;
  transformPayload?: (payload: Values, values: Values) => Values;
}) {
  const upsert = useUpsert(table, label);
  const build = () =>
    Object.fromEntries(
      fields.map((f) => {
        const stored = initial?.[f.name];
        const source = stored === null || stored === undefined ? f.defaultValue : stored;
        return [f.name, toInput(f, source)];
      }),
    ) as Values;

  const [values, setValues] = useState<Values>(build);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(build());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.["id"], initial?.["updated_at"]]);

  const set = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const visible = fields.filter((f) => !f.showIf || f.showIf(values));
    for (const f of visible) {
      if (!f.required || f.type === "checkbox") continue;
      const raw = values[f.name];
      if (raw === null || raw === undefined || String(raw).trim() === "") {
        nextErrors[f.name] = `${f.label} is required`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    let payload: Values = { ...extra };
    const isCreate = !initial?.["id"];
    for (const f of fields) {
      if (f.transient) continue;
      const next = fromInput(f, values[f.name]);
      // On create, omit empty values so database column defaults apply.
      if (isCreate && next === null) continue;
      payload[f.name] = next;
    }
    if (transformPayload) payload = transformPayload(payload, values);
    if (initial?.["id"]) payload["id"] = initial["id"];

    upsert.mutate(payload, {
      onSuccess: (row) => {
        if (table === "leads" && "contract_amount" in payload) {
          const leadId = (row as Values | null)?.["id"] ?? payload["id"];
          if (typeof leadId === "string") void recalcLeadNetAmount(leadId);
        }
        if (resetAfterSave) setValues(build());
        onSaved?.(row as Values | null);
      },
    });
  };

  const gridClass = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];

  return (
    <form onSubmit={submit} className={cn("space-y-4", className)}>
      <div className={cn("grid gap-3", gridClass)}>
        {fields.filter((f) => !f.showIf || f.showIf(values)).map((f) => {
          const id = `${String(table)}-${f.name}`;
          const value = values[f.name];
          return (
            <div key={f.name} className={cn("space-y-1.5", f.full || f.type === "textarea" ? "sm:col-span-full" : "")}>
              {f.type === "checkbox" ? (
                <label className="flex items-center gap-2 pt-5 text-sm">
                  <Checkbox
                    id={id}
                    checked={Boolean(value)}
                    onCheckedChange={(c) => set(f.name, Boolean(c))}
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <Label htmlFor={id}>
                    {f.label}
                    {f.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => set(f.name, e.target.value)} />
                  ) : f.type === "select" ? (
                    <Select value={String(value ?? "")} onValueChange={(v) => set(f.name, v)}>
                      <SelectTrigger id={id}>
                        <SelectValue placeholder={f.placeholder ?? "Select"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      type={
                        f.type === "datetime"
                          ? "datetime-local"
                          : f.type === "number"
                            ? "number"
                            : (f.type ?? "text")
                      }
                      step={f.type === "number" ? "any" : undefined}
                      aria-invalid={Boolean(errors[f.name])}
                      placeholder={f.placeholder}
                      value={String(value ?? "")}
                      onChange={(e) => set(f.name, e.target.value)}
                    />
                  )}
                  {errors[f.name] ? (
                    <p className="text-xs font-medium text-destructive">{errors[f.name]}</p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function EditableSection({
  children,
  form,
  canEdit,
}: {
  children: ReactNode;
  form: (close: () => void) => ReactNode;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (editing && canEdit) return <>{form(() => setEditing(false))}</>;
  return (
    <div className="space-y-3">
      {children}
      {canEdit ? (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      ) : null}
    </div>
  );
}
