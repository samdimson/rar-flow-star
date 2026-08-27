import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { TaskBadge } from "@/components/stage-badge";
import { useAuth } from "@/hooks/use-auth";
import { useAllRoles, useCommissions, useLeads, useProfiles, useTasks } from "@/lib/crm/api";
import { currency, titleCase } from "@/lib/crm/format";

const title = "Sales Reps — Rise Above Roofing Oklahoma CRM";
const description =
  "Rep dashboards: leads, contact attempts, inspections, qualified claims, contracts sold, revenue and commissions.";

export const Route = createFileRoute("/_authenticated/reps")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RepsPage,
});

function RepsPage() {
  const { canViewFinance, canViewAllLeads, user } = useAuth();
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: roles = [] } = useAllRoles();
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: commissions = [] } = useCommissions();

  const visible = canViewAllLeads ? profiles : profiles.filter((p) => p.id === user?.id);

  if (isLoading) {
    return (
      <AppShell icon={Wrench} title="Sales Reps">
        <LoadingBlock label="Loading reps" />
      </AppShell>
    );
  }

  return (
    <AppShell icon={Wrench} title="Sales Reps" subtitle="Individual performance, pipeline and follow-up load">
      <div className="space-y-5">
        {visible.length === 0 ? (
          <EmptyState message="No team members found." />
        ) : (
          visible.map((p) => {
            const mine = leads.filter((l) => l.assigned_rep_id === p.id);
            const attempted = mine.filter((l) => l.task_code !== "1.1");
            const inspections = mine.filter((l) => l.stage_id >= 2);
            const qualified = mine.filter((l) => l.stage_id >= 3);
            const sold = mine.filter((l) => l.stage_id >= 5);
            const inProgress = mine.filter((l) => l.stage_id === 6);
            const won = mine.filter((l) => l.status === "won");
            const revenue = won.reduce((s, l) => s + Number(l.contract_amount ?? 0), 0);
            const myCommissions = commissions.filter((c) => c.rep_id === p.id);
            const commissionTotal = myCommissions.reduce((s, c) => s + Number(c.amount), 0);
            const commissionPaid = myCommissions
              .filter((c) => c.paid_at)
              .reduce((s, c) => s + Number(c.amount), 0);
            const openTasks = tasks.filter((t) => t.assigned_to === p.id && t.status === "open");
            const repRoles = roles.filter((r) => r.user_id === p.id).map((r) => titleCase(r.role));

            return (
              <SectionCard
                key={p.id}
                title={`${p.full_name || p.email} — ${repRoles.join(", ") || "no role"}`}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard label="Leads" value={mine.length} hint={`${attempted.length} contacted`} />
                  <KpiCard label="Inspections" value={inspections.length} hint={`${qualified.length} claim qualified`} />
                  <KpiCard
                    label="Contracts sold"
                    value={sold.length}
                    hint={`${mine.length ? Math.round((sold.length / mine.length) * 100) : 0}% conversion`}
                  />
                  <KpiCard
                    label={canViewFinance ? "Revenue won" : "Jobs won"}
                    value={canViewFinance ? currency(revenue) : won.length}
                    tone="positive"
                    hint={canViewFinance ? `${currency(commissionPaid)} of ${currency(commissionTotal)} commission paid` : undefined}
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Jobs in progress ({inProgress.length})
                    </p>
                    {inProgress.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="mt-1 space-y-1.5">
                        {inProgress.map((l) => (
                          <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                            <Link
                              to="/leads/$leadId"
                              params={{ leadId: l.id }}
                              className="text-primary hover:underline"
                            >
                              {l.lead_number}
                            </Link>
                            <TaskBadge code={l.task_code} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Open follow-ups ({openTasks.length})
                    </p>
                    {openTasks.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {openTasks.slice(0, 6).map((t) => (
                          <li key={t.id} className="truncate">
                            {t.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </SectionCard>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
