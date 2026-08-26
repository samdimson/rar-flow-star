import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { TaskBadge } from "@/components/stage-badge";
import { useChangeOrders, useLeads, useProductionJobs, useProfiles } from "@/lib/crm/api";
import { shortDate, titleCase } from "@/lib/crm/format";

const title = "Production — Rise Above Roofing Oklahoma CRM";
const description =
  "Production board for permits, material orders, crews, install dates, weather delays, QC and Certificates of Completion.";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProductionPage,
});

function ProductionPage() {
  const { data: jobs = [], isLoading } = useProductionJobs();
  const { data: leads = [] } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const { data: changeOrders = [] } = useChangeOrders();

  const leadFor = (id: string) => leads.find((l) => l.id === id);
  const pendingPermits = jobs.filter((j) => ["pending", "submitted"].includes(j.permit_status));
  const awaitingMaterials = jobs.filter((j) => j.material_order_status !== "delivered");
  const scheduled = jobs.filter((j) => j.install_date && new Date(j.install_date).getTime() >= Date.now());
  const openChangeOrders = changeOrders.filter((c) => c.status === "pending");

  return (
    <AppShell title="Production" subtitle="Every job from job creation through Certificate of Completion">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Production jobs" value={jobs.length} />
          <KpiCard label="Permits pending" value={pendingPermits.length} tone="warning" />
          <KpiCard label="Awaiting materials" value={awaitingMaterials.length} tone="warning" />
          <KpiCard label="Installs scheduled" value={scheduled.length} tone="positive" />
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading production" />
        ) : jobs.length === 0 ? (
          <EmptyState message="No production jobs yet. They are created automatically at task 5.3 — Job Created." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Job</th>
                  <th className="px-3 py-2.5 font-semibold">Workflow</th>
                  <th className="px-3 py-2.5 font-semibold">Manager / crew</th>
                  <th className="px-3 py-2.5 font-semibold">Permit</th>
                  <th className="px-3 py-2.5 font-semibold">Materials</th>
                  <th className="px-3 py-2.5 font-semibold">Install</th>
                  <th className="px-3 py-2.5 font-semibold">QC / COC</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const lead = leadFor(j.lead_id);
                  return (
                    <tr key={j.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-3 py-2.5">
                        {lead ? (
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: lead.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {lead.lead_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                        <span className="block text-xs text-muted-foreground">{lead?.property?.address_line1}</span>
                      </td>
                      <td className="px-3 py-2.5">{lead ? <TaskBadge code={lead.task_code} /> : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {profiles.find((p) => p.id === j.production_manager_id)?.full_name ?? "Unassigned"}
                        <span className="block text-muted-foreground">{j.crew_name || "No crew"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {titleCase(j.permit_status)}
                        <span className="block text-muted-foreground">{shortDate(j.permit_approved_at)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {titleCase(j.material_order_status)}
                        <span className="block text-muted-foreground">{shortDate(j.material_delivery_date)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {shortDate(j.install_date)}
                        {j.rescheduled_to ? (
                          <span className="block text-chart-4">resched {shortDate(j.rescheduled_to)}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        QC {shortDate(j.qc_passed_at)}
                        <span className="block text-muted-foreground">COC {shortDate(j.coc_signed_at)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <SectionCard title={`Open change orders (${openChangeOrders.length})`}>
          {openChangeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending change orders.</p>
          ) : (
            <ul className="divide-y divide-border">
              {openChangeOrders.map((c) => {
                const lead = leadFor(c.lead_id);
                return (
                  <li key={c.id} className="py-2.5 text-sm">
                    <p className="font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead ? (
                        <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="text-primary hover:underline">
                          {lead.lead_number}
                        </Link>
                      ) : null}{" "}
                      · supplement {c.supplement_submitted ? "submitted" : "pending"} · homeowner{" "}
                      {c.homeowner_approved ? "approved" : "pending"}
                    </p>
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
