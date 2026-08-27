import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { STAGES, TASK_BY_CODE, tasksForStage, type StageId } from "@/lib/crm/workflow";

function StageTaskList({ stageId, taskCode }: { stageId: StageId; taskCode: string }) {
  const tasks = tasksForStage(stageId);
  return (
    <ul className="mt-2 space-y-1.5">
      {tasks.map((t) => {
        const isCurrent = t.code === taskCode;
        const isPast = !isCurrent && taskCode ? t.code < taskCode : false;
        return (
          <li key={t.code} className="flex items-start gap-2 text-left">
            <span className="mt-1 flex size-3.5 shrink-0 items-center justify-center">
              {isPast ? (
                <Check className="size-3.5 text-chart-3" aria-hidden="true" />
              ) : isCurrent ? (
                <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
              ) : (
                <span
                  className="size-2.5 rounded-full border border-border"
                  aria-hidden="true"
                />
              )}
            </span>
            <span
              className={cn(
                "min-w-0 text-xs",
                isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="font-mono">{t.code}</span> {t.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FullBar({ stageId, taskCode }: { stageId: number; taskCode: string }) {
  return (
    <div className="w-full">
      <ol className="flex w-full items-start">
        {STAGES.map((stage, index) => {
          const isCurrent = stage.id === stageId;
          const isDone = stage.id < stageId;
          return (
            <li key={stage.id} className="flex min-w-0 flex-1 items-start gap-0">
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      index === 0 ? "opacity-0" : isDone || isCurrent ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "grid shrink-0 place-items-center rounded-full",
                      isCurrent
                        ? "size-4 bg-primary ring-4 ring-primary/20"
                        : isDone
                          ? "size-3 bg-primary/60"
                          : "size-3 border border-border bg-background",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      index === STAGES.length - 1 ? "opacity-0" : isDone ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                </div>
                <p
                  className={cn(
                    "mt-1.5 px-1 text-center text-[11px] leading-tight",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {stage.name}
                </p>
                {isCurrent ? (
                  <StageTaskList stageId={stage.id} taskCode={taskCode} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StageProgress({ stageId, taskCode }: { stageId: number; taskCode: string }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const stage = STAGES.find((s) => s.id === stageId);
  const task = TASK_BY_CODE[taskCode];

  if (isMobile) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold text-foreground">{stage?.name ?? `Stage ${stageId}`}</span>
            <span className="text-muted-foreground"> · {task?.name ?? taskCode}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide stages" : "View all stages"}
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
        {expanded ? (
          <div className="mt-3 space-y-3">
            {STAGES.map((s) => {
              const isCurrent = s.id === stageId;
              const isDone = s.id < stageId;
              return (
                <div key={s.id} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1 shrink-0 rounded-full",
                      isCurrent
                        ? "size-3 bg-primary"
                        : isDone
                          ? "size-2.5 bg-primary/60"
                          : "size-2.5 border border-border",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs",
                        isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.id}. {s.name}
                    </p>
                    {isCurrent ? <StageTaskList stageId={s.id} taskCode={taskCode} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border bg-card p-4">
      <FullBar stageId={stageId} taskCode={taskCode} />
    </div>
  );
}
