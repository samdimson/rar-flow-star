import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLeads, useProfiles, useTasks, useUpsert } from "@/lib/crm/api";
import { dateTime, titleCase } from "@/lib/crm/format";

const title = "Tasks — Rise Above Roofing Oklahoma CRM";
const description =
  "Every automated and manual follow-up task across leads, claims, production and post-job customer care.";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { canEdit, user } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: leads = [] } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const save = useUpsert("tasks", "Task");
  const [owner, setOwner] = useState("all");
  const [state, setState] = useState("open");

  const now = Date.now();
  const rows = tasks.filter((t) => {
    if (state === "open" && t.status !== "open") return false;
    if (state === "completed" && t.status !== "completed") return false;
    if (state === "overdue" && !(t.status === "open" && t.due_at && new Date(t.due_at).getTime() < now)) return false;
    if (owner === "mine" && t.assigned_to !== user?.id) return false;
    if (owner !== "all" && owner !== "mine" && t.assigned_to !== owner) return false;
    return true;
  });

  const open = tasks.filter((t) => t.status === "open");
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const dueToday = open.filter((t) => t.due_at && new Date(t.due_at).toDateString() === new Date().toDateString());

  const leadFor = (id: string | null) => leads.find((l) => l.id === id);

  return (
    <AppShell icon={ClipboardList} title="Tasks" subtitle="Automated workflow follow-ups plus anything your team adds.">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Open tasks" value={open.length} />
          <KpiCard label="Due today" value={dueToday.length} tone="warning" />
          <KpiCard label="Overdue" value={overdue.length} tone="danger" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-56" aria-label="Filter by owner"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="mine">Assigned to me</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SectionCard title={`${rows.length} task${rows.length === 1 ? "" : "s"}`}>
          {isLoading ? (
            <LoadingBlock label="Loading tasks" />
          ) : rows.length === 0 ? (
            <EmptyState message="No tasks match this filter." />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((t) => {
                const lead = leadFor(t.lead_id);
                const late = t.status === "open" && t.due_at && new Date(t.due_at).getTime() < now;
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead ? (
                          <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="text-primary hover:underline">
                            {lead.lead_number} · <span className="text-orange-500">{lead.customer?.last_name}</span>
                          </Link>
                        ) : (
                          "No linked lead"
                        )}
                        {" · "}
                        <span className={late ? "text-destructive" : ""}>
                          {t.due_at ? dateTime(t.due_at) : "No due date"}
                        </span>
                        {" · "}
                        {titleCase(t.priority)}
                        {t.auto_generated ? " · automated" : ""}
                      </p>
                    </div>
                    {t.status === "open" && canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => save.mutate({ id: t.id, status: "completed", completed_at: new Date().toISOString() })}
                      >
                        <CheckCircle2 className="size-4" /> Complete
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{titleCase(t.status)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
