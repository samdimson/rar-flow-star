/** Simplified labor pricing: a flat per-square rate chosen by labor type. */
export const LABOR_TYPES = [
  { value: "tear_off_replace", label: "Tear-Off & Replace — $70/SQ", rate: 70 },
  { value: "framing_improvement", label: "Framing Improvement — $100/SQ", rate: 100 },
] as const;

export type LaborType = (typeof LABOR_TYPES)[number]["value"];

export const laborRate = (type: string | null | undefined): number =>
  LABOR_TYPES.find((t) => t.value === type)?.rate ?? LABOR_TYPES[0].rate;

export const laborLabel = (type: string | null | undefined): string =>
  LABOR_TYPES.find((t) => t.value === type)?.label ?? LABOR_TYPES[0].label;

/** labor_total = squares * rate */
export const laborTotal = (type: string | null | undefined, squares: number | null | undefined): number =>
  Number((Math.max(0, Number(squares ?? 0)) * laborRate(type)).toFixed(2));
