import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { EmptyState, SectionCard } from "@/components/crm/primitives";
import { RecordForm, type FieldSpec } from "@/components/crm/record-form";
import { Button } from "@/components/ui/button";
import { useSupplements, type SupplementRow } from "@/lib/crm/api";
import { currency, shortDate } from "@/lib/crm/format";
import { cn } from "@/lib/utils";

export const SUPPLEMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "partial", label: "Partial" },
] as const;

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-chart-2/15 text-chart-2",
  approved: "bg-chart-3/15 text-chart-3",
  denied: "bg-destructive/10 text-destructive",
  partial: "bg-chart-4/20 text-chart-4",
};

const supplementFields: FieldSpec[] = [
  {
    name: "status",
    label: "Status",
    type: "select",
    options: SUPPLEMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  },
  { name: "submitted_at", label: "Submitted", type: "date" },
  { name: "carrier_response_at", label: "Carrier response", type: "date" },
  { name: "requested_amount", label: "Requested ($)", type: "number" },
  { name: "approved_amount", label: "Approved ($)", type: "number" },
  { name: "adjuster_name", label: "Adjuster name" },
  { name: "adjuster_email", label: "Adjuster email", type: "email" },
  { name: "adjuster_phone", label: "Adjuster phone", type: "tel" },
  { name: "appeal_submitted_at", label: "Appeal submitted", type: "date" },
  { name: "appeal_outcome", label: "Appeal outcome" },
  { name: "scope_description", label: "Scope description", type: "textarea" },
  { name: "line_items", label: "Line items", type: "textarea" },
  { name: "xactimate_line_codes", label: "Xactimate line codes", type: "textarea" },
  { name: "code_upgrade_items", label: "Code upgrade items", type: "textarea" },
  { name: "supporting_docs_notes", label: "Supporting documents notes", type: "textarea" },
  { name: "denial_reason", label: "Denial reason", type: "textarea" },
  { name: "notes", label: "Notes", type: "textarea" },
];

function SupplementCard({
  supplement,
  leadId,
  userId,
  canEdit,
  defaultOpen,
  onSaved,
}: {
  supplement: Partial<SupplementRow> & { supplement_number?: number };
  leadId: string;
  userId: string | null;
  canEdit: boolean;
  defaultOpen: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isNew = !supplement.id;
  const status = supplement.status ?? "draft";

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          {isNew ? "New supplement" : `Supplement #${supplement.supplement_number}`}
        </span>
        <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {supplement.submitted_at ? <span>submitted {shortDate(supplement.submitted_at)}</span> : null}
          {supplement.requested_amount != null ? (
            <span>requested {currency(supplement.requested_amount)}</span>
          ) : null}
          {supplement.approved_amount != null ? (
            <span>approved {currency(supplement.approved_amount)}</span>
          ) : null}
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 font-medium capitalize",
              statusTone[status] ?? statusTone["draft"],
            )}
          >
            {status}
          </span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          <RecordForm
            table="supplements"
            label="Supplement"
            initial={isNew ? { status: "draft" } : (supplement as Record<string, unknown>)}
            extra={{ lead_id: leadId, ...(isNew ? { created_by: userId } : {}) }}
            fields={supplementFields}
            columns={3}
            submitLabel={isNew ? "Create supplement" : "Save supplement"}
            onSaved={() => onSaved?.()}
          />
          {!canEdit ? (
            <p className="mt-2 text-xs text-muted-foreground">You do not have permission to edit supplements.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SupplementsPanel({
  leadId,
  userId,
  canEdit,
}: {
  leadId: string;
  userId: string | null;
  canEdit: boolean;
}) {
  const { data: supplements = [], isLoading } = useSupplements({ column: "lead_id", value: leadId });
  const [drafts, setDrafts] = useState(0);

  const requested = supplements.reduce((s, r) => s + Number(r.requested_amount ?? 0), 0);
  const approved = supplements.reduce((s, r) => s + Number(r.approved_amount ?? 0), 0);

  return (
    <SectionCard
      title="Supplements"
      actions={
        canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setDrafts((d) => d + 1)}>
            <Plus className="size-4" /> Add supplement
          </Button>
        ) : undefined
      }
      contentClassName="space-y-3"
    >
      {supplements.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {supplements.length} supplement{supplements.length === 1 ? "" : "s"} · requested {currency(requested)} ·
          approved {currency(approved)}
        </p>
      ) : null}

      {supplements.map((s) => (
        <SupplementCard
          key={s.id}
          supplement={s}
          leadId={leadId}
          userId={userId}
          canEdit={canEdit}
          defaultOpen={false}
        />
      ))}

      {Array.from({ length: drafts }).map((_, i) => (
        <SupplementCard
          key={`draft-${i}`}
          supplement={{ status: "draft" }}
          leadId={leadId}
          userId={userId}
          canEdit={canEdit}
          defaultOpen
          onSaved={() => setDrafts((d) => Math.max(0, d - 1))}
        />
      ))}

      {!isLoading && supplements.length === 0 && drafts === 0 ? (
        <EmptyState message="No supplements yet. Add one when the carrier scope misses items." />
      ) : null}
    </SectionCard>
  );
}
