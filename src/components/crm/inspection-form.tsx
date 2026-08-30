import { useMemo, useState } from "react";
import { ClipboardCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdvanceLead, useDocuments, type LeadRow } from "@/lib/crm/api";
import { ROOF_TYPES } from "@/lib/crm/workflow";
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";
import { cn } from "@/lib/utils";

const BUCKET = "crm-files";

const DAMAGE_TYPES = ["Hail", "Wind", "Hail & Wind", "Other"];
const DAMAGE_AREAS = ["Roof", "Gutters", "Downspouts", "Siding", "Windows", "Fence", "Other Structures"];
const ROOF_CONDITIONS = ["Good", "Fair", "Poor", "Severely Damaged"];
const MIN_PHOTOS = 10;

type LeadWithRelations = LeadRow & {
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  property?:
    | {
        id?: string | null;
        address_line1?: string | null;
        roof_age?: number | null;
        roof_type?: string | null;
        roof_stories?: number | null;
      }
    | null;
};

export function InspectionForm({
  lead,
  trigger,
  autoAdvanceTo,
  open: openProp,
  onOpenChange,
}: {
  lead: LeadWithRelations;
  trigger?: React.ReactNode;
  /** When set, a successful submit immediately advances the lead to this task code. */
  autoAdvanceTo?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { canEdit, user } = useAuth();
  const qc = useQueryClient();
  const advance = useAdvanceLead();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [damageType, setDamageType] = useState(lead.damage_type ?? "");
  const [damageAreas, setDamageAreas] = useState<string[]>(lead.damage_areas ?? []);
  const [roofCondition, setRoofCondition] = useState(lead.roof_condition ?? "");
  const [roofAge, setRoofAge] = useState(lead.property?.roof_age != null ? String(lead.property.roof_age) : "");
  const [roofType, setRoofType] = useState(lead.property?.roof_type ?? "");
  const [roofStories, setRoofStories] = useState(
    lead.property?.roof_stories != null ? String(lead.property.roof_stories) : "",
  );
  const [stormDate, setStormDate] = useState(lead.storm_date ?? "");
  const [notes, setNotes] = useState(lead.inspection_notes ?? "");

  const { data: docs = [] } = useDocuments({ column: "lead_id", value: lead.id });
  const photoCount = useMemo(() => docs.filter((d) => d.category === "photo").length, [docs]);

  const complete =
    damageType.trim() !== "" &&
    damageAreas.length > 0 &&
    roofCondition.trim() !== "" &&
    roofAge.trim() !== "" &&
    roofType.trim() !== "" &&
    roofStories.trim() !== "" &&
    stormDate.trim() !== "" &&
    notes.trim() !== "" &&
    photoCount >= MIN_PHOTOS;

  if (!canEdit) return null;

  const uploadPhotos = async (files: File[]) => {
    setBusy(true);
    try {
      for (const file of files) {
        const path = `${lead.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("documents").insert({
          lead_id: lead.id,
          category: "photo",
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: path,
          uploaded_by: user?.id ?? null,
        });
        if (error) throw error;
      }
      qc.invalidateQueries();
      toast.success(files.length > 1 ? `${files.length} photos uploaded` : "Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const leadPatch = {
        damage_type: damageType,
        damage_areas: damageAreas,
        roof_condition: roofCondition,
        inspection_notes: notes,
        storm_date: stormDate,
        // Carriers need a date of loss AND an inspection date on file; the
        // inspection just happened, so stamp it when it's still empty.
        inspection_date: lead.inspection_date ?? new Date().toISOString().slice(0, 10),
      };
      const { error: leadErr } = await supabase.from("leads").update(leadPatch).eq("id", lead.id);
      if (leadErr) throw leadErr;

      if (lead.property_id) {
        const { error: propErr } = await supabase
          .from("properties")
          .update({
            roof_age: Number(roofAge),
            roof_type: roofType as never,
            roof_stories: Number(roofStories),
          })
          .eq("id", lead.property_id);
        if (propErr) throw propErr;
      }

      await supabase.from("activities").insert({
        lead_id: lead.id,
        type: "note",
        subject: "Inspection report completed",
        body: notes,
        actor_id: user?.id ?? null,
      });

      qc.invalidateQueries();
      toast.success("Inspection report saved");
      setOpen(false);

      // The rep shouldn't have to click "Advance stage" separately — the report
      // itself was the blocking requirement, so move the lead forward now.
      if (autoAdvanceTo) {
        await advance.mutateAsync({
          lead: { ...(lead as LeadRow), ...leadPatch } as LeadRow,
          toTaskCode: autoAdvanceTo,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save inspection report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <ClipboardCheck className="mr-2 size-4" aria-hidden="true" />
            Complete Inspection Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <LeadIdentityHeader
              leadNumber={lead.lead_number}
              customerName={
                lead.customer ? `${lead.customer.first_name ?? ""} ${lead.customer.last_name ?? ""}`.trim() : ""
              }
              address={lead.property?.address_line1 ?? ""}
            />
          </DialogTitle>
          <DialogDescription>
            Capture damage findings, roof details and at least {MIN_PHOTOS} photos for the claim file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="insp-damage-type">Damage type</Label>
            <Select value={damageType} onValueChange={setDamageType}>
              <SelectTrigger id="insp-damage-type"><SelectValue placeholder="Select damage type" /></SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-condition">Roof condition</Label>
            <Select value={roofCondition} onValueChange={setRoofCondition}>
              <SelectTrigger id="insp-condition"><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                {ROOF_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Damaged areas</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {DAMAGE_AREAS.map((area) => (
                <label key={area} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={damageAreas.includes(area)}
                    onCheckedChange={(v) =>
                      setDamageAreas((prev) => (v === true ? [...prev, area] : prev.filter((a) => a !== area)))
                    }
                  />
                  {area}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-roof-age">Roof age (years)</Label>
            <Input id="insp-roof-age" type="number" min={0} value={roofAge} onChange={(e) => setRoofAge(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-roof-type">Roof type</Label>
            <Select value={roofType} onValueChange={setRoofType}>
              <SelectTrigger id="insp-roof-type"><SelectValue placeholder="Select roof type" /></SelectTrigger>
              <SelectContent>
                {ROOF_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-stories">Stories</Label>
            <Input
              id="insp-stories"
              type="number"
              min={1}
              value={roofStories}
              onChange={(e) => setRoofStories(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-storm-date">Date of loss (storm date)</Label>
            <Input id="insp-storm-date" type="date" value={stormDate} onChange={(e) => setStormDate(e.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="insp-notes">Inspection notes</Label>
            <Textarea
              id="insp-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe findings: damage locations, test squares, slopes affected, collateral damage…"
            />
          </div>

          <div className="space-y-2 rounded-md border border-border p-3 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="insp-photos">Inspection photos</Label>
              <span
                className={cn(
                  "text-sm font-semibold",
                  photoCount >= MIN_PHOTOS ? "text-green-600" : "text-muted-foreground",
                )}
              >
                {photoCount} of {MIN_PHOTOS} photos uploaded
              </span>
            </div>
            <Input
              id="insp-photos"
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void uploadPhotos(files);
                e.target.value = "";
              }}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Upload className="size-3.5" aria-hidden="true" />
              Saved to Documents as photos; stored privately with signed links.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!complete || saving || busy} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save inspection report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
