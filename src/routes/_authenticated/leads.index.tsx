import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock } from "@/components/crm/primitives";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { StageBadge, StatusBadge, TaskBadge } from "@/components/stage-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLeads, useProfiles } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";
import { LEAD_SOURCES, STAGES } from "@/lib/crm/workflow";

const title = "Leads — Rise Above Roofing Oklahoma CRM";
const description =
  "Search, filter and sort every roofing lead by stage, workflow task, source, rep and property address.";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LeadsPage,
});

type SortKey = "recent" | "value" | "stage" | "name";

function LeadsPage() {
  const { canViewFinance } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [rep, setRep] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const repName = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name || profiles.find((p) => p.id === id)?.email || "Unassigned";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (stage !== "all" && String(l.stage_id) !== stage) return false;
      if (source !== "all" && l.source !== source) return false;
      if (rep !== "all" && l.assigned_rep_id !== rep) return false;
      if (!q) return true;
      const haystack = [
        l.lead_number,
        l.customer?.first_name,
        l.customer?.last_name,
        l.customer?.email,
        l.customer?.phone,
        l.property?.address_line1,
        l.property?.city,
        l.property?.postal_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "value")
        return Number(b.contract_amount ?? b.estimated_value) - Number(a.contract_amount ?? a.estimated_value);
      if (sort === "stage") return b.stage_id - a.stage_id;
      if (sort === "name")
        return `${a.customer?.last_name}`.localeCompare(`${b.customer?.last_name}`);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [leads, query, stage, source, rep, sort]);

  return (
    <AppShell
      title="Leads"
      subtitle={`${rows.length} of ${leads.length} records`}
      actions={<LeadFormDialog />}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, address, phone, email or lead #"
              className="pl-8"
              aria-label="Search leads"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger aria-label="Filter by stage"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.id} — {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger aria-label="Filter by source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rep} onValueChange={setRep}>
            <SelectTrigger aria-label="Filter by rep"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reps</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44" aria-label="Sort leads"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Last activity</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="name">Customer name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading leads" />
        ) : rows.length === 0 ? (
          <EmptyState message="No leads match these filters." action={<LeadFormDialog />} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Lead</th>
                  <th className="px-3 py-2.5 font-semibold">Property</th>
                  <th className="px-3 py-2.5 font-semibold">Stage</th>
                  <th className="px-3 py-2.5 font-semibold">Workflow task</th>
                  <th className="px-3 py-2.5 font-semibold">Rep</th>
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Value</th> : null}
                  <th className="px-3 py-2.5 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-3 py-2.5">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {l.lead_number}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {l.customer?.first_name} {l.customer?.last_name}
                      </span>
                      <StatusBadge status={l.status} className="mt-1" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block max-w-[220px] truncate">{l.property?.address_line1 ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {l.property?.city}
                        {l.property?.city ? ", " : ""}
                        {l.property?.state}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><StageBadge stageId={l.stage_id} /></td>
                    <td className="px-3 py-2.5"><TaskBadge code={l.task_code} /></td>
                    <td className="px-3 py-2.5 text-xs">{repName(l.assigned_rep_id)}</td>
                    <td className="px-3 py-2.5 text-xs">{titleCaseSource(l.source)}</td>
                    {canViewFinance ? (
                      <td className="px-3 py-2.5 font-medium">
                        {currency(l.contract_amount ?? l.estimated_value)}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{shortDate(l.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
