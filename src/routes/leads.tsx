import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StageBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrm } from "@/lib/crm-store";
import { OWNERS, SOURCES, STAGES, currency, type Stage } from "@/lib/crm-data";

const title = "Leads — RAR CRM Work Flow";
const description =
  "Searchable lead register with owner, source, stage and deal value, plus fast lead capture.";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Leads,
});

function Leads() {
  const { leads, moveLead } = useCrm();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchQ =
        !q ||
        [l.name, l.company, l.email, l.id].some((v) => v.toLowerCase().includes(q));
      const matchStage = stageFilter === "all" || l.stage === stageFilter;
      const matchOwner = ownerFilter === "all" || l.owner === ownerFilter;
      return matchQ && matchStage && matchOwner;
    });
  }, [leads, query, stageFilter, ownerFilter]);

  return (
    <AppShell
      title="Leads"
      subtitle={`${rows.length} of ${leads.length} records shown`}
      actions={<NewLeadDialog />}
    >
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, email or ID"
          className="w-full sm:max-w-xs"
          aria-label="Search leads"
        />
        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as Stage | "all")}
        >
          <SelectTrigger className="w-40" aria-label="Filter by stage">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by owner">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {OWNERS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <span className="font-medium text-foreground">{l.name}</span>
                  <span className="block text-xs text-muted-foreground">{l.email}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.company}</TableCell>
                <TableCell className="text-muted-foreground">{l.owner}</TableCell>
                <TableCell className="text-muted-foreground">{l.source}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {currency(l.value)}
                </TableCell>
                <TableCell>
                  <Select
                    value={l.stage}
                    onValueChange={(v) => moveLead(l.id, v as Stage)}
                  >
                    <SelectTrigger
                      className="h-8 w-36"
                      aria-label={`Stage for ${l.company}`}
                    >
                      <StageBadge stage={l.stage as Stage} />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.lastActivity}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No leads match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
}

function NewLeadDialog() {
  const { addLead } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    value: "",
    stage: "new" as Stage,
    owner: OWNERS[0],
    source: SOURCES[0],
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.name.trim() || !form.company.trim()) {
      toast.error("Contact name and company are required.");
      return;
    }
    addLead({
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      value: Number(form.value) || 0,
      stage: form.stage,
      owner: form.owner,
      source: form.source,
      notes: form.notes.trim() || undefined,
    });
    toast.success(`${form.company.trim()} added to the pipeline`);
    setOpen(false);
    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      value: "",
      stage: "new",
      owner: OWNERS[0],
      source: SOURCES[0],
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Capture the essentials now — you can enrich the record later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Company">
            <Input value={form.company} onChange={(e) => set("company", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Deal value (USD)">
            <Input
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </Field>
          <Field label="Stage">
            <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner">
            <Select value={form.owner} onValueChange={(v) => set("owner", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNERS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source">
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
