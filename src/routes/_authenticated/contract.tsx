import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { RoofingContractForm } from "@/components/crm/roofing-contract-form";

export const Route = createFileRoute("/_authenticated/contract")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search["leadId"] === "string" ? (search["leadId"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Roofing Replacement Contract — Rise Above Roofing Oklahoma" },
      {
        name: "description",
        content:
          "Digital roofing replacement contract for Rise Above Roofing Oklahoma: review the scope, price and terms, then sign on any tablet.",
      },
      {
        property: "og:title",
        content: "Roofing Replacement Contract — Rise Above Roofing Oklahoma",
      },
      {
        property: "og:description",
        content: "Review and sign the Rise Above Roofing Oklahoma roofing replacement contract.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoofingContractPage,
});

function RoofingContractPage() {
  const { leadId } = Route.useSearch();
  const navigate = useNavigate();

  if (!leadId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">
          Open this page from a lead to sign its roofing contract.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <RoofingContractForm
        leadId={leadId}
        onDone={() => void navigate({ to: "/leads/$leadId", params: { leadId } })}
      />
    </main>
  );
}
