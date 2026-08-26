import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCrm } from "@/lib/crm-store";
import { STAGES, currency, type Stage } from "@/lib/crm-data";

const title = "Sales Pipeline — RAR CRM Work Flow";
const description =
  "Kanban view of every lead by stage, from first touch to closed won, with one-click stage moves.";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Pipeline,
});

function Pipeline() {
  const { leads, moveLead } = useCrm();
  const stageIds = STAGES.map((s) => s.id);

  return (
    <AppShell
      title="Pipeline"
      subtitle="Move deals forward or back through the stages your team actually uses."
    >
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          const total = items.reduce((sum, l) => sum + l.value, 0);
          return (
            <section key={stage.id} className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between rounded-md bg-muted px-3 py-2">
                <h2 className="text-sm font-semibold text-foreground">{stage.label}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </header>
              <p className="-mt-2 px-1 text-xs text-muted-foreground tabular-nums">
                {currency(total)}
              </p>

              {items.map((lead) => {
                const idx = stageIds.indexOf(lead.stage as Stage);
                return (
                  <Card key={lead.id} className="gap-0 py-3">
                    <CardContent className="px-3">
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {lead.company}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{lead.name}</p>
                      <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                        {currency(lead.value)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lead.owner} · {lead.source}
                      </p>
                      <div className="mt-3 flex justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={idx <= 0}
                          aria-label={`Move ${lead.company} back a stage`}
                          onClick={() => moveLead(lead.id, stageIds[idx - 1]!)}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={idx >= stageIds.length - 1}
                          aria-label={`Move ${lead.company} forward a stage`}
                          onClick={() => moveLead(lead.id, stageIds[idx + 1]!)}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No deals
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
