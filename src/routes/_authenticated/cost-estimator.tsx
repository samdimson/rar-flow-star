import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/crm/access-denied";
import { CostEstimator, SECTIONS } from "@/components/crm/cost-estimator";
import { useEstimatorAccess } from "@/lib/crm/access";

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
  const { allowed, loading } = useEstimatorAccess();

  return (
    <AppShell
      title="Materials Cost Estimator"
      subtitle="Wholesale material and labor rates — enter quantities to build a total"
    >
      {loading ? null : allowed ? (
        <CostEstimator
          heading="Materials Cost Estimator"
          sections={SECTIONS}
          source="material"
          {...(leadId ? { leadId } : {})}
        />
      ) : (
        <AccessDenied message="Only owners and managers can access the cost estimators." />
      )}
    </AppShell>
  );
}
