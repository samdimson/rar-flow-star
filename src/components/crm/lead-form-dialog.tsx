import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateLead, useProfiles, type NewLeadInput } from "@/lib/crm/api";
import { LEAD_SOURCES, PROPERTY_TYPES, ROOF_TYPES } from "@/lib/crm/workflow";

const EMPTY: NewLeadInput = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address_line1: "",
  city: "",
  state: "OK",
  postal_code: "",
  property_type: "residential_single",
  roof_type: "asphalt_shingle",
  roof_age: "",
  source: "door_to_door",
  assigned_rep_id: "",
  estimated_value: "",
  storm_date: "",
  carrier: "",
  policy_number: "",
  notes: "",
};

type DuplicateInfo = { lead_number: string; rep_name: string };

export function LeadFormDialog() {
  const { canEdit, canManage, user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const create = useCreateLead();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewLeadInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [override, setOverride] = useState(false);

  if (!canEdit) return null;

  const checkDuplicateProperty = async () => {
    const address = form.address_line1.trim();
    const zip = form.postal_code.trim();
    setDuplicate(null);
    setOverride(false);
    if (!address || !zip) return;

    setCheckingDuplicate(true);
    try {
      const { data: props, error: propError } = await supabase
        .from("properties")
        .select("id")
        .ilike("address_line1", address)
        .eq("postal_code", zip);
      if (propError) throw propError;
      const ids = (props ?? []).map((p) => p.id);
      if (ids.length === 0) return;

      const { data: leads, error: leadError } = await supabase
        .from("leads")
        .select("lead_number, assigned_rep_id, status")
        .in("property_id", ids)
        .not("status", "in", "(lost,won)")
        .limit(1);
      if (leadError) throw leadError;
      const match = leads?.[0];
      if (!match) return;

      const rep = profiles.find((p) => p.id === match.assigned_rep_id);
      setDuplicate({
        lead_number: match.lead_number,
        rep_name: rep?.full_name || rep?.email || "an unassigned rep",
      });
    } catch {
      // network/permission issues shouldn't block lead entry
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const set = <K extends keyof NewLeadInput>(key: K, value: NewLeadInput[K]) => {
    if (key === "address_line1" || key === "postal_code") {
      setDuplicate(null);
      setOverride(false);
    }
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const REQUIRED_FIELDS: {
    key:
      | "first_name"
      | "last_name"
      | "phone"
      | "address_line1"
      | "city"
      | "state"
      | "postal_code"
      | "property_type"
      | "roof_type";
    label: string;
  }[] = [
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "phone", label: "Phone" },
    { key: "address_line1", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "postal_code", label: "ZIP" },
    { key: "property_type", label: "Property type" },
    { key: "roof_type", label: "Roof type" },
  ];


  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const f of REQUIRED_FIELDS) {
      if (!String(form[f.key] ?? "").trim()) nextErrors[f.key] = `${f.label} is required`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    create.mutate(
      { ...form, assigned_rep_id: form.assigned_rep_id || user?.id || "" },
      {
        onSuccess: () => {
          setForm(EMPTY);
          setErrors({});
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Creates the customer, property and lead record at workflow task 1.1 with a first-contact task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Homeowner
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="l-first">
                  First name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="l-first"
                  aria-invalid={Boolean(errors["first_name"])}
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
                {errors["first_name"] ? <p className="text-xs font-medium text-destructive">{errors["first_name"]}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-last">
                  Last name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="l-last"
                  aria-invalid={Boolean(errors["last_name"])}
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
                {errors["last_name"] ? <p className="text-xs font-medium text-destructive">{errors["last_name"]}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-phone">
                  Phone<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="l-phone"
                  aria-invalid={Boolean(errors["phone"])}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                {errors["phone"] ? <p className="text-xs font-medium text-destructive">{errors["phone"]}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-email">Email</Label>
                <Input id="l-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>

          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Property
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="l-address">
                Address<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="l-address"
                aria-invalid={Boolean(errors["address_line1"])}
                value={form.address_line1}
                onChange={(e) => set("address_line1", e.target.value)}
                placeholder="1420 NW 18th St"
              />
              {errors["address_line1"] ? (
                <p className="text-xs font-medium text-destructive">{errors["address_line1"]}</p>
              ) : null}
              {checkingDuplicate ? (
                <p className="text-xs text-muted-foreground">Checking for an existing active lead…</p>
              ) : null}
              {duplicate ? (
                <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <p className="flex items-start gap-2 text-xs font-medium text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      This property already has an active lead assigned to {duplicate.rep_name} (
                      {duplicate.lead_number}). Creating a duplicate will be blocked.
                    </span>
                  </p>
                  {canManage ? (
                    <label className="flex items-start gap-2 text-xs text-foreground">
                      <Checkbox
                        checked={override}
                        onCheckedChange={(v) => setOverride(v === true)}
                        className="mt-0.5"
                      />
                      <span>I confirm this is a separate property or I am reassigning this lead</span>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="l-city">
                  City<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input id="l-city" aria-invalid={Boolean(errors["city"])} value={form.city} onChange={(e) => set("city", e.target.value)} />
                {errors["city"] ? <p className="text-xs font-medium text-destructive">{errors["city"]}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-state">
                  State<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input id="l-state" aria-invalid={Boolean(errors["state"])} value={form.state} onChange={(e) => set("state", e.target.value)} />
                {errors["state"] ? <p className="text-xs font-medium text-destructive">{errors["state"]}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-zip">
                  ZIP<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input id="l-zip" aria-invalid={Boolean(errors["postal_code"])} value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
                {errors["postal_code"] ? <p className="text-xs font-medium text-destructive">{errors["postal_code"]}</p> : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="l-ptype">
                  Property type<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Select
                  value={form.property_type}
                  onValueChange={(v) => set("property_type", v as NewLeadInput["property_type"])}
                >
                  <SelectTrigger id="l-ptype" aria-invalid={Boolean(errors["property_type"])}>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors["property_type"] ? (
                  <p className="text-xs font-medium text-destructive">{errors["property_type"]}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-rtype">
                  Roof type<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Select value={form.roof_type} onValueChange={(v) => set("roof_type", v as NewLeadInput["roof_type"])}>
                  <SelectTrigger id="l-rtype" aria-invalid={Boolean(errors["roof_type"])}>
                    <SelectValue placeholder="Select roof type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOF_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors["roof_type"] ? (
                  <p className="text-xs font-medium text-destructive">{errors["roof_type"]}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-rage">Roof age (years)</Label>
                <Input id="l-rage" type="number" min="0" value={form.roof_age} onChange={(e) => set("roof_age", e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Lead &amp; insurance
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="l-source">Lead source</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v as NewLeadInput["source"])}>
                  <SelectTrigger id="l-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-rep">Assigned sales rep</Label>
                <Select value={form.assigned_rep_id || user?.id || ""} onValueChange={(v) => set("assigned_rep_id", v)}>
                  <SelectTrigger id="l-rep">
                    <SelectValue placeholder="Select rep" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-value">Estimated value ($)</Label>
                <Input id="l-value" type="number" min="0" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-storm">Storm / date of damage</Label>
                <Input id="l-storm" type="date" value={form.storm_date} onChange={(e) => set("storm_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-carrier">Insurance carrier</Label>
                <Input id="l-carrier" value={form.carrier} onChange={(e) => set("carrier", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-policy">Policy number</Label>
                <Input id="l-policy" value={form.policy_number} onChange={(e) => set("policy_number", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-notes">Notes</Label>
              <Textarea id="l-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
