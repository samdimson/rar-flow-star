import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { CostEstimator, LABOR_SECTIONS } from "@/components/crm/cost-estimator";

const title = "Labor Cost Estimator — Rise Above Roofing Oklahoma CRM";
const description =
  "Wholesale roofing labor cost estimator with live line totals and one-click save to a customer estimate.";

export const Route = createFileRoute("/_authenticated/labor-estimator")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search["leadId"] === "string" ? (search["leadId"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LaborEstimatorPage,
});

function LaborEstimatorPage() {
  const { leadId } = Route.useSearch();

  return (
    <AppShell
      title="Labor Cost Estimator"
      subtitle="Wholesale labor rates — enter quantities to build a total"
    >
      <CostEstimator
        heading="Labor Cost Estimator"
        sections={LABOR_SECTIONS}
        source="labor"
        {...(leadId ? { leadId } : {})}
      />
    </AppShell>
  );
}
