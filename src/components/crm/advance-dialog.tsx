import { useState } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  missingRequirements,
  requirementLabel,
  useAdvanceLead,
  useClaim,
  useDocuments,
  type ClaimRow,
  type LeadRow,
} from "@/lib/crm/api";
import {
  REQUIRED_FIELD_TAB,
  TAB_LABELS,
  TASK_BY_CODE,
  type RequiredField,
} from "@/lib/crm/workflow";
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";

type WithRelations = {
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  property?: { address_line1?: string | null } | null;
};

const leadCustomerName = (lead: LeadRow) => {
  const c = (lead as LeadRow & WithRelations).customer;
  return c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : "";
};
const leadAddress = (lead: LeadRow) =>
  (lead as LeadRow & WithRelations).property?.address_line1 ?? "";

const INSPECTION_FIELDS: RequiredField[] = [
  "damage_type",
  "damage_areas",
  "roof_condition",
  "inspection_notes",
  "inspection_photos",
];

export function AdvanceDialog({
  lead,
  claim,
  trigger,
  setActiveTab,
}: {
  lead: LeadRow;
  claim?: ClaimRow | null | undefined;
  trigger?: React.ReactNode;
  setActiveTab?: (tab: string) => void;
}) {
  const { canEdit } = useAuth();
  const [open, setOpen] = useState(false);
  const current = TASK_BY_CODE[lead.task_code];
  const options = current?.next ?? [];
  const [target, setTarget] = useState(options[0] ?? "");
  const [reason, setReason] = useState("");
  const [confirmDenial, setConfirmDenial] = useState(false);
  const advance = useAdvanceLead();
  // Required-field checks for rcv_amount live on insurance_claims, so always
  // read the claim row for this lead rather than trusting the optional prop.
  const { data: fetchedClaim } = useClaim(lead.id);
  const effectiveClaim = fetchedClaim ?? claim ?? null;
  const { data: leadDocs = [] } = useDocuments({ column: "lead_id", value: lead.id });
  const photoCount = leadDocs.filter((d) => d.category === "photo").length;

  const effectiveTarget = options.includes(target) ? target : (options[0] ?? "");
  const missing = effectiveTarget
    ? missingRequirements(lead, effectiveClaim, effectiveTarget, lead.task_code, photoCount)
    : [];
  const targetTask = effectiveTarget ? TASK_BY_CODE[effectiveTarget] : undefined;

  if (!canEdit) return null;

  // Dead-end guard: when the next step is gated on the inspection report, send
  // the rep straight to that tab instead of a dialog they can't get past.
  const inspectionGate = options.find((code) =>
    (TASK_BY_CODE[code]?.required ?? []).some((f) => INSPECTION_FIELDS.includes(f)),
  );
  const inspectionBlocked =
    inspectionGate && setActiveTab
      ? missingRequirements(lead, effectiveClaim, inspectionGate, lead.task_code, photoCount).some(
          (f) => INSPECTION_FIELDS.includes(f),
        )
      : false;

  if (inspectionBlocked && setActiveTab) {
    return (
      <Button
        size="sm"
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => setActiveTab("inspection")}
      >
        Advance stage <ArrowRight className="size-4" />
      </Button>
    );
  }

  const missingTabs = setActiveTab
    ? Array.from(new Set(missing.map((f) => REQUIRED_FIELD_TAB[f]).filter(Boolean)))
    : [];


  const needsDenialConfirm = lead.task_code === "3.4" && effectiveTarget === "3.5";

  const submit = () => {
    if (!effectiveTarget) return;
    if (needsDenialConfirm && !confirmDenial) {
      setConfirmDenial(true);
      return;
    }
    setConfirmDenial(false);
    advance.mutate(
      { lead, toTaskCode: effectiveTarget, reason: reason || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setReason("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Advance stage <ArrowRight className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <LeadIdentityHeader
              leadNumber={lead.lead_number}
              customerName={leadCustomerName(lead)}
              address={leadAddress(lead)}
            />
            <span className="mt-1 block text-base">Move forward</span>
          </DialogTitle>
          <DialogDescription>
            Currently at {TASK_BY_CODE[lead.task_code]?.displayCode ?? lead.task_code} — {current?.name}. Required fields are enforced before advancing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="advance-target">Next workflow task</Label>
            <Select value={effectiveTarget} onValueChange={setTarget}>
              <SelectTrigger id="advance-target">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.map((code) => {
                  const t = TASK_BY_CODE[code];
                  return (
                    <SelectItem key={code} value={code}>
                      {t?.displayCode ?? code} — {t?.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {targetTask ? <p className="text-xs text-muted-foreground">{targetTask.description}</p> : null}
          </div>

          {missing.length > 0 ? (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertDescription>
                Missing required information: {missing.map(requirementLabel).join(", ")}.
              </AlertDescription>
            </Alert>
          ) : null}

          {targetTask?.followUps?.length ? (
            <div className="rounded-md bg-secondary/60 p-3 text-xs text-secondary-foreground">
              <p className="font-semibold">Automation that will run</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {targetTask.followUps.map((f) => (
                  <li key={f.title}>
                    Task “{f.title}” due in {f.dueInDays} day{f.dueInDays === 1 ? "" : "s"}
                  </li>
                ))}
                {targetTask.appointment ? <li>Calendar event: {targetTask.appointment.title}</li> : null}
                {targetTask.startsRescission ? <li>3-business-day rescission window tracked</li> : null}
                {targetTask.ensure?.map((e) => <li key={e}>Creates {e.replace(/_/g, " ")} record</li>)}
              </ul>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="advance-reason">Note (recorded on the timeline)</Label>
            <Textarea
              id="advance-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional context for this stage change"
              rows={2}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!effectiveTarget || advance.isPending}>
            {advance.isPending ? "Saving…" : "Confirm move"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDenial} onOpenChange={setConfirmDenial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the claim as denied or underpaid. If the claim was approved, advance to 4.1 instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Yes — claim was denied/underpaid</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
