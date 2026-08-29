import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { issueCoc } from "@/lib/crm/coc.functions";
import { dateTime } from "@/lib/crm/format";
import { canIssueCoc } from "@/lib/crm/workflow";

export function IssueCoc({
  leadId,
  cocSignedAt,
  cocEmailedAt,
  canEdit,
  taskCode,
}: {
  leadId: string;
  cocSignedAt: string | null;
  cocEmailedAt: string | null;
  canEdit: boolean;
  taskCode: string | null;
}) {
  const run = useServerFn(issueCoc);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const stageReady = canIssueCoc(taskCode);

  const issue = async () => {
    setBusy(true);
    try {
      const result = await run({ data: { leadId, origin: window.location.origin } });
      await queryClient.invalidateQueries();
      if (result.sent > 0) {
        toast.success(`COC issued and emailed to ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      } else {
        toast.warning("COC issued and saved, but no email could be sent.");
      }
      if (result.failures.length > 0) console.error(result.failures.join(" | "));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue the COC");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Certificate of Completion">
      {cocSignedAt ? (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <FileCheck2 className="size-4" aria-hidden="true" /> COC Issued
          </p>
          <p className="text-sm text-muted-foreground">{dateTime(cocSignedAt)}</p>
          {cocEmailedAt ? (
            <p className="text-xs text-muted-foreground">Emailed {dateTime(cocEmailedAt)}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Button onClick={() => void issue()} disabled={busy || !canEdit || !stageReady}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Generating…" : "Issue COC"}
          </Button>
          {!stageReady ? (
            <p className="text-xs text-amber-600">
              Available once production is complete (task 6.4 QC Complete or later).
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Generates the Notice of Completion PDF, files it under Documents, and emails it to the homeowner,
            adjuster, carrier and office.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
