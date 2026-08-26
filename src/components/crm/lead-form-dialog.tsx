import { useState } from "react";
import { Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateLead, useProfiles, type NewLeadInput } from "@/lib/crm/api";
import { LEAD_SOURCES } from "@/lib/crm/workflow";

const EMPTY: NewLeadInput = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address_line1: "",
  city: "",
  state: "OK",
  postal_code: "",
  property_type: "Single family",
  roof_type: "",
  roof_age: "",
  source: "door_to_door",
  assigned_rep_id: "",
  estimated_value: "",
  storm_date: "",
  carrier: "",
  policy_number: "",
  notes: "",
};

export function LeadFormDialog() {
  const { canEdit, user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const create = useCreateLead();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewLeadInput>(EMPTY);

  if (!canEdit) return null;

  const set = <K extends keyof NewLeadInput>(key: K, value: NewLeadInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { ...form, assigned_rep_id: form.assigned_rep_id || user?.id || "" },
      {
        onSuccess: () => {
          setForm(EMPTY);
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
                <Label htmlFor="l-first">First name</Label>
                <Input id="l-first" required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-last">Last name</Label>
                <Input id="l-last" required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-phone">Phone</Label>
                <Input id="l-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
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
              <Label htmlFor="l-address">Property address</Label>
              <Input
                id="l-address"
                required
                value={form.address_line1}
                onChange={(e) => set("address_line1", e.target.value)}
                placeholder="1420 NW 18th St"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="l-city">City</Label>
                <Input id="l-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-state">State</Label>
                <Input id="l-state" value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-zip">ZIP</Label>
                <Input id="l-zip" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="l-ptype">Property type</Label>
                <Input id="l-ptype" value={form.property_type} onChange={(e) => set("property_type", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-rtype">Roof type</Label>
                <Input id="l-rtype" value={form.roof_type} onChange={(e) => set("roof_type", e.target.value)} placeholder="Architectural shingle" />
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
