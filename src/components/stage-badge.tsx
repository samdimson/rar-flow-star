import { cn } from "@/lib/utils";
import { STAGES, type Stage } from "@/lib/crm-data";

const tone: Record<Stage, string> = {
  new: "bg-muted text-muted-foreground",
  qualified: "bg-chart-2/15 text-chart-2",
  proposal: "bg-chart-4/20 text-chart-4",
  negotiation: "bg-chart-1/15 text-chart-1",
  won: "bg-chart-3/15 text-chart-3",
  lost: "bg-destructive/10 text-destructive",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const label = STAGES.find((s) => s.id === stage)?.label ?? stage;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone[stage],
        className,
      )}
    >
      {label}
    </span>
  );
}
