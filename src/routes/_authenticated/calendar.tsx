import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { useAppointments, useLeads } from "@/lib/crm/api";
import { dateTime, isoDate, titleCase } from "@/lib/crm/format";
import { cn } from "@/lib/utils";

const title = "Calendar — Rise Above Roofing Oklahoma CRM";
const description =
  "Inspection, adjuster meeting, production and follow-up appointments on one roofing operations calendar.";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CalendarPage,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const { data: appointments = [] } = useAppointments();
  const { data: leads = [] } = useLeads();
  const [cursor, setCursor] = useState(() => new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayKey = isoDate(new Date());

  const byDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const key = a.starts_at.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  const upcoming = appointments
    .filter((a) => new Date(a.starts_at).getTime() >= Date.now())
    .slice(0, 12);

  const leadFor = (id: string | null) => leads.find((l) => l.id === id);

  return (
    <AppShell
      title="Calendar"
      subtitle={cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            Next <ChevronRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {DAY_LABELS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const key = isoDate(d);
              const events = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[92px] rounded-md border border-border/60 p-1.5",
                    d.getMonth() !== month && "bg-muted/40 text-muted-foreground",
                    key === todayKey && "border-primary",
                  )}
                >
                  <span className="text-xs font-semibold">{d.getDate()}</span>
                  <ul className="mt-1 space-y-1">
                    {events.slice(0, 3).map((e) => {
                      const lead = leadFor(e.lead_id);
                      return (
                        <li key={e.id} className="truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-primary">
                          {lead ? (
                            <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="hover:underline">
                              {e.title}
                            </Link>
                          ) : (
                            e.title
                          )}
                        </li>
                      );
                    })}
                    {events.length > 3 ? (
                      <li className="px-1 text-[11px] text-muted-foreground">+{events.length - 3} more</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <SectionCard title="Upcoming">
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming appointments." />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => {
                const lead = leadFor(a.lead_id);
                return (
                  <li key={a.id} className="py-2.5">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {titleCase(a.kind)} · {dateTime(a.starts_at)}
                    </p>
                    {lead ? (
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: lead.id }}
                        className="text-xs text-primary hover:underline"
                      >
                        {lead.lead_number} · {lead.property?.address_line1}
                      </Link>
                    ) : null}
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
