import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react", UserSquare2 };

import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { TaskBadge } from "@/components/stage-badge";
import { Input } from "@/components/ui/input";
import { useCustomers, useLeads, useProperties } from "@/lib/crm/api";
import { currency, shortDate } from "@/lib/crm/format";
import { useAuth } from "@/hooks/use-auth";

const title = "Customers — Rise Above Roofing Oklahoma CRM";
const description =
  "Every homeowner and property in the database, connected to their leads, jobs and lifetime roofing revenue.";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { canViewFinance } = useAuth();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { data: leads = [] } = useLeads();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = customers.filter((c) => {
    if (!q) return true;
    const property = properties.find((p) => p.id === c.property_id);
    return [c.first_name, c.last_name, c.email, c.phone, property?.address_line1, property?.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <AppShell icon={UserSquare2} title="Customers" subtitle={`${customers.length} homeowner records`}>
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers or property address"
            className="pl-8"
            aria-label="Search customers"
          />
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading customers" />
        ) : rows.length === 0 ? (
          <EmptyState message="No customers yet — they are created automatically with each new lead." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((c) => {
              const property = properties.find((p) => p.id === c.property_id);
              const theirLeads = leads.filter((l) => l.customer_id === c.id);
              const lifetime = theirLeads
                .filter((l) => l.status === "won")
                .reduce((s, l) => s + Number(l.contract_amount ?? 0), 0);
              return (
              <SectionCard key={c.id} title={<span className="text-orange-500">{c.first_name} {c.last_name}</span>}>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <p className="text-muted-foreground">{c.phone || "No phone"}</p>
                    <p className="truncate text-muted-foreground">{c.email || "No email"}</p>
                    <p className="sm:col-span-2 text-sky-400">
                      {property ? `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}` : "No property linked"}
                    </p>
                    {canViewFinance ? (
                      <p className="sm:col-span-2 text-xs text-muted-foreground">
                        Lifetime revenue {currency(lifetime)} · {theirLeads.length} record(s)
                      </p>
                    ) : null}
                  </dl>
                  <ul className="mt-3 space-y-2">
                    {theirLeads.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to="/leads/$leadId"
                          params={{ leadId: l.id }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {l.lead_number}
                        </Link>
                        <span className="flex items-center gap-2">
                          <TaskBadge code={l.task_code} />
                          <span className="text-xs text-muted-foreground">{shortDate(l.updated_at)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
