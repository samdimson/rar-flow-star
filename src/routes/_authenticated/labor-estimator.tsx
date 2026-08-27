import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/crm/access-denied";
import { LaborEstimator } from "@/components/crm/labor-estimator";
import { useEstimatorAccess } from "@/lib/crm/access";

const title = "Labor Cost Estimator — Rise Above Roofing Oklahoma CRM";
const description =
  "Simplified roofing labor cost estimator: pick a labor type, enter squares and save the total to a customer estimate.";

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
  const { allowed, loading } = useEstimatorAccess();

  return (
    <AppShell icon={Wrench}
      title="Labor Cost Estimator"
      subtitle="Labor rate per square — choose a labor type and enter squares"
    >
      {loading ? null : allowed ? (
        <LaborEstimator {...(leadId ? { leadId } : {})} />
      ) : (
        <AccessDenied message="Only owners and managers can access the cost estimators." />
      )}
    </AppShell>
  );
}
