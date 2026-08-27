import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { CostEstimator } from "@/components/crm/cost-estimator";

const title = "Materials Cost Estimator — Rise Above Roofing Oklahoma CRM";
const description =
  "Wholesale roofing material and labor cost estimator with live line totals and one-click save to a customer estimate.";

export const Route = createFileRoute("/_authenticated/cost-estimator")({
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
  component: CostEstimatorPage,
});

function CostEstimatorPage() {
  const { leadId } = Route.useSearch();

  return (
    <AppShell
      title="Materials Cost Estimator"
      subtitle="Wholesale material and labor rates — enter quantities to build a total"
    >
      <CostEstimator {...(leadId ? { leadId } : {})} />
    </AppShell>
  );
}
