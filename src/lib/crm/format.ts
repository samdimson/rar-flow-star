export const currency = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const currencyExact = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n ?? 0));

export const shortDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const dateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const relativeDays = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  return diff;
};

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const todayIso = () => isoDate(new Date());

export const daysFromNowIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const initials = (name: string | null | undefined) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const titleCase = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
