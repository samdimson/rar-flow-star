import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ServiceAgreementForm } from "@/components/crm/service-agreement-form";

export const Route = createFileRoute("/_authenticated/service-agreement")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search["leadId"] === "string" ? (search["leadId"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Service Agreement — Rise Above Roofing Oklahoma" },
      {
        name: "description",
        content:
          "Digital service agreement for Rise Above Roofing Oklahoma: review the terms and sign on any tablet.",
      },
      { property: "og:title", content: "Service Agreement — Rise Above Roofing Oklahoma" },
      {
        property: "og:description",
        content: "Review and sign the Rise Above Roofing Oklahoma service agreement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceAgreementPage,
});

function ServiceAgreementPage() {
  const { leadId } = Route.useSearch();
  const navigate = useNavigate();

  if (!leadId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">
          Open this page from a lead to sign its service agreement.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <ServiceAgreementForm
        leadId={leadId}
        onDone={() => void navigate({ to: "/leads/$leadId", params: { leadId } })}
      />
    </main>
  );
}
