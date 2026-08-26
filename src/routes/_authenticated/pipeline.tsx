import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { AdvanceDialog } from "@/components/crm/advance-dialog";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { LoadingBlock } from "@/components/crm/primitives";
import { TaskBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAdvanceLead, useLeads, type LeadWithRelations } from "@/lib/crm/api";
import { currency, shortDate } from "@/lib/crm/format";
import { STAGES, TASK_BY_CODE, tasksForStage } from "@/lib/crm/workflow";
import { cn } from "@/lib/utils";

const title = "Pipeline — Rise Above Roofing Oklahoma CRM";
const description =
  "Kanban pipeline across the eight roofing workflow stages: lead, inspection, claim filing, estimate, contract, production, closeout and post-job.";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const { canEdit, canManage, canViewFinance } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const advance = useAdvanceLead();
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<number | null>(null);

  const drop = (stageId: number) => {
    setHoverStage(null);
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || !canEdit || lead.stage_id === stageId) return;

    const current = TASK_BY_CODE[lead.task_code];
    const target =
      current?.next?.find((code) => TASK_BY_CODE[code]?.stageId === stageId) ??
      tasksForStage(stageId as (typeof STAGES)[number]["id"])[0]?.code;
    if (!target) return;

    const isValid = current?.next?.includes(target) ?? false;
    if (!isValid && !canManage) {
      toast.error(`Not a valid next step from ${lead.task_code}. Use Advance stage to follow the workflow.`);
      return;
    }
    advance.mutate({ lead, toTaskCode: target, isOverride: !isValid, reason: "Moved on pipeline board" });
  };

  if (isLoading) {
    return (
      <AppShell title="Pipeline">
        <LoadingBlock label="Loading pipeline" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Pipeline"
      subtitle="Drag a card between stages — the workflow engine records history, tasks and automation."
      actions={<LeadFormDialog />}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const rows = leads.filter((l) => l.stage_id === stage.id);
          const value = rows.reduce((s, l) => s + Number(l.contract_amount ?? l.estimated_value ?? 0), 0);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setHoverStage(stage.id);
              }}
              onDragLeave={() => setHoverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => drop(stage.id)}
              className={cn(
                "flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-secondary/40 p-2.5",
                hoverStage === stage.id && "border-primary bg-primary/5",
              )}
            >
              <header className="mb-2 px-1">
                <h2 className="text-sm font-semibold">
                  {stage.id}. {stage.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {rows.length} {rows.length === 1 ? "record" : "records"}
                  {canViewFinance && value > 0 ? ` · ${currency(value)}` : ""}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {rows.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    canEdit={canEdit}
                    canViewFinance={canViewFinance}
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
                {rows.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function PipelineCard({
  lead,
  canEdit,
  canViewFinance,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadWithRelations;
  canEdit: boolean;
  canViewFinance: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="rounded-md border border-border bg-card p-2.5 shadow-sm"
    >
      <Link
        to="/leads/$leadId"
        params={{ leadId: lead.id }}
        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
      >
        {lead.customer?.first_name} {lead.customer?.last_name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{lead.property?.address_line1}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TaskBadge code={lead.task_code} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {lead.lead_number}
        {canViewFinance ? ` · ${currency(lead.contract_amount ?? lead.estimated_value)}` : ""}
        {lead.install_date ? ` · install ${shortDate(lead.install_date)}` : ""}
      </p>
      {canEdit ? (
        <div className="mt-2">
          <AdvanceDialog
            lead={lead}
            trigger={
              <Button variant="outline" size="sm" className="h-7 w-full text-xs">
                Advance
              </Button>
            }
          />
        </div>
      ) : null}
    </article>
  );
}
