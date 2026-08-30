import { cn } from "@/lib/utils";
import { STAGES, TASK_BY_CODE, type StageId } from "@/lib/crm/workflow";

const stageTone: Record<StageId, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-chart-2/15 text-chart-2",
  3: "bg-chart-5/15 text-chart-5",
  4: "bg-chart-4/20 text-chart-4",
  5: "bg-chart-1/15 text-chart-1",
  6: "bg-chart-1/20 text-chart-1",
  7: "bg-chart-3/15 text-chart-3",
  8: "bg-chart-3/20 text-chart-3",
};

export function StageBadge({ stageId, className }: { stageId: number; className?: string }) {
  const stage = STAGES.find((s) => s.id === stageId);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        stageTone[(stageId as StageId) ?? 1] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="font-semibold">{stageId}</span>
      {stage?.name ?? "Unknown"}
    </span>
  );
}

export function TaskBadge({ code, className }: { code: string; className?: string }) {
  const task = TASK_BY_CODE[code];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs",
        className,
      )}
      title={task?.description}
    >
      <span className="font-mono text-[11px] font-semibold text-primary">{task?.displayCode ?? code}</span>
      <span className="truncate text-foreground">{task?.name ?? "Unknown task"}</span>
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone =
    status === "won"
      ? "bg-chart-3/15 text-chart-3"
      : status === "lost"
        ? "bg-destructive/10 text-destructive"
        : status === "nurture"
          ? "bg-chart-4/20 text-chart-4"
          : "bg-chart-2/15 text-chart-2";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", tone, className)}>
      {status}
    </span>
  );
}
