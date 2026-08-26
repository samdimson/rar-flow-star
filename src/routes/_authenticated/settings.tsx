import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { RecordForm } from "@/components/crm/record-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAllRoles, useAuditLog, useCommissionRules, useProfiles } from "@/lib/crm/api";
import { dateTime, titleCase } from "@/lib/crm/format";
import { ROLES, type AppRole } from "@/lib/crm/workflow";

const title = "Settings & Admin — Rise Above Roofing Oklahoma CRM";
const description =
  "Manage team roles and permissions, commission rules and review the full timestamped audit history.";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { canManage, loading, user } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useAllRoles();
  const { data: rules = [] } = useCommissionRules();
  const { data: audit = [] } = useAuditLog();

  if (loading) {
    return (
      <AppShell title="Settings & Admin">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!canManage) {
    return (
      <AppShell title="Settings & Admin">
        <EmptyState message="Only Admins and Owners/Managers can access settings." />
      </AppShell>
    );
  }

  const setRole = async (userId: string, role: AppRole) => {
    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delError) {
      toast.error(delError.message);
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("audit_log").insert({
      actor_id: user?.id ?? null,
      entity: "user_roles",
      entity_id: userId,
      action: "update",
      summary: `Role set to ${role}`,
    });
    qc.invalidateQueries();
    toast.success("Role updated");
  };

  return (
    <AppShell title="Settings & Admin" subtitle="Roles, commission rules and audit history">
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team &amp; roles</TabsTrigger>
          <TabsTrigger value="commission">Commission rules</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4 space-y-4">
          <SectionCard title="Role reference">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {ROLES.map((r) => (
                <li key={r.value}>
                  <span className="font-medium">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.description}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={`Team members (${profiles.length})`}>
            <ul className="divide-y divide-border">
              {profiles.map((p) => {
                const current = roles.find((r) => r.user_id === p.id)?.role ?? "";
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.email}
                        {p.job_title ? ` · ${p.job_title}` : ""}
                      </p>
                    </div>
                    <Select value={current} onValueChange={(v) => void setRole(p.id, v as AppRole)}>
                      <SelectTrigger className="w-56" aria-label={`Role for ${p.full_name}`}>
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="commission" className="mt-4 space-y-4">
          <SectionCard title="Add commission rule">
            <RecordForm
              table="commission_rules"
              label="Commission rule"
              resetAfterSave
              submitLabel="Add rule"
              columns={3}
              fields={[
                { name: "name", label: "Rule name", required: true },
                {
                  name: "applies_to_role",
                  label: "Applies to role",
                  type: "select",
                  options: ROLES.map((r) => ({ value: r.value, label: r.label })),
                },
                {
                  name: "basis",
                  label: "Basis",
                  type: "select",
                  options: ["contract_amount", "gross_profit", "flat"].map((v) => ({ value: v, label: titleCase(v) })),
                },
                { name: "percent", label: "Percent (e.g. 8 = 8%)", type: "number" },
                { name: "flat_amount", label: "Flat amount ($)", type: "number" },
                { name: "is_active", label: "Active", type: "checkbox" },
              ]}
            />
          </SectionCard>

          <SectionCard title={`Rules (${rules.length})`}>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commission rules configured.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {titleCase(r.applies_to_role)} · {titleCase(r.basis)} · {r.is_active ? "active" : "inactive"}
                      </p>
                    </div>
                    <span className="font-medium">
                      {r.percent ? `${r.percent}%` : ""}
                      {r.flat_amount ? ` $${r.flat_amount}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <SectionCard title="Audit log (most recent 200 entries)">
            {audit.length === 0 ? (
              <EmptyState message="No audit entries yet." />
            ) : (
              <ul className="divide-y divide-border">
                {audit.slice(0, 200).map((a) => (
                  <li key={a.id} className="py-2.5">
                    <p className="text-sm font-medium">
                      {titleCase(a.action)} · {a.entity}
                    </p>
                    {a.summary ? <p className="text-sm text-muted-foreground">{a.summary}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {dateTime(a.created_at)}
                      {a.actor_id
                        ? ` · ${profiles.find((p) => p.id === a.actor_id)?.full_name ?? "unknown user"}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
