import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    positive: "text-chart-3",
    warning: "text-chart-4",
    danger: "text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1.5 truncate text-2xl font-semibold tracking-tight", toneClass)}>
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <span className="shrink-0 rounded-md bg-secondary p-2 text-secondary-foreground">{icon}</span> : null}
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}
