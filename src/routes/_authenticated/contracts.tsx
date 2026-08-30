import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, FileSignature, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useContracts, useDocuments, type ContractWithLead, type DocumentRow } from "@/lib/crm/api";
import { currency, relativeDays, shortDate, titleCase } from "@/lib/crm/format";
import { cn } from "@/lib/utils";

const title = "Contracts — Rise Above Roofing Oklahoma CRM";
const description =
  "Signed roofing contracts, service agreements, Direction to Pay status and mandatory three-business-day rescission tracking.";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ContractsPage,
});

const CONTRACT_CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "service_agreement", label: "Service Agreement" },
  { value: "contract", label: "Roofing Contract" },
  { value: "change_order", label: "Change Order" },
  { value: "supplement", label: "Supplement Agreement" },
  { value: "direction_to_pay", label: "Direction to Pay" },
  { value: "coc", label: "Certificate of Completion" },
];

const SECTIONS = CONTRACT_CATEGORIES.filter((c) => c.value !== "all");

const typeLabel = (value: string | null | undefined) =>
  CONTRACT_CATEGORIES.find((c) => c.value === (value ?? "contract"))?.label ?? titleCase(value);

const matches = (c: ContractWithLead, q: string) => {
  if (!q) return true;
  const customer = c.lead?.customer;
  return [customer?.first_name, customer?.last_name, c.lead?.lead_number, c.lead?.property?.address_line1]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
};

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ContractsTable({
  rows,
  canViewFinance,
  docFor,
  openDoc,
}: {
  rows: ContractWithLead[];
  canViewFinance: boolean;
  docFor: (leadId: string | null, type: string) => DocumentRow | null;
  openDoc: (doc: DocumentRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Lead</th>
            <th className="px-3 py-2.5 font-semibold">Customer</th>
            <th className="px-3 py-2.5 font-semibold">Property</th>
            <th className="px-3 py-2.5 font-semibold">Type</th>
            <th className="px-3 py-2.5 font-semibold">Signed</th>
            <th className="px-3 py-2.5 font-semibold">Rescission ends</th>
            <th className="px-3 py-2.5 font-semibold">Direction to Pay</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            {canViewFinance ? <th className="px-3 py-2.5 font-semibold">Amount</th> : null}
            <th className="px-3 py-2.5 font-semibold">PDF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const days = relativeDays(c.rescission_ends_at);
            const type = c.contract_type ?? "contract";
            const doc = docFor(c.lead_id, type);
            return (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-3 py-2.5">
                  {c.lead ? (
                    <Link to="/leads/$leadId" params={{ leadId: c.lead.id }} className="text-primary hover:underline">
                      {c.lead.lead_number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5 text-orange-500">
                  {c.lead?.customer ? `${c.lead.customer.first_name} ${c.lead.customer.last_name}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-sky-400">{c.lead?.property?.address_line1 ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium">
                    {typeLabel(type)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs">{shortDate(c.signed_at)}</td>
                <td className="px-3 py-2.5 text-xs">
                  {shortDate(c.rescission_ends_at)}
                  {days !== null && days >= 0 ? <span className="block text-chart-4">{days} day(s) left</span> : null}
                </td>
                <td className="px-3 py-2.5 text-xs">{c.direction_to_pay_signed ? "Signed" : "Pending"}</td>
                <td className="px-3 py-2.5 text-xs">{titleCase(c.status)}</td>
                {canViewFinance ? (
                  <td className="px-3 py-2.5 font-medium">
                    {c.contract_amount == null ? "—" : currency(c.contract_amount)}
                  </td>
                ) : null}
                <td className="px-3 py-2.5">
                  {doc ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${typeLabel(type)} PDF`}
                      onClick={() => openDoc(doc)}
                    >
                      <FileText className="size-4 text-primary" aria-hidden="true" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategorySection({
  label,
  contracts,
  canViewFinance,
  docFor,
  openDoc,
}: {
  label: string;
  contracts: ContractWithLead[];
  canViewFinance: boolean;
  docFor: (leadId: string | null, type: string) => DocumentRow | null;
  openDoc: (doc: DocumentRow) => void;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query).trim().toLowerCase();
  const rows = contracts.filter((c) => matches(c, debounced));

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <CollapsibleTrigger className="flex items-center gap-2 text-left">
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")}
              aria-hidden="true"
            />
            <CardTitle className="text-sm font-semibold">
              {label}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{contracts.length}</span>
            </CardTitle>
          </CollapsibleTrigger>
          <Input
            className="w-full max-w-xs"
            placeholder="Search…"
            aria-label={`Search ${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches in this section.</p>
            ) : (
              <ContractsTable rows={rows} canViewFinance={canViewFinance} docFor={docFor} openDoc={openDoc} />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ContractsPage() {
  const { canViewFinance } = useAuth();
  const { data: contracts = [], isLoading } = useContracts();
  const { data: documents = [] } = useDocuments();
  const [archiveQuery, setArchiveQuery] = useState("");
  const archiveDebounced = useDebounced(archiveQuery).trim().toLowerCase();

  const isArchived = (c: ContractWithLead) => (c.lead?.task_code ?? "").startsWith("8.");
  const active = contracts.filter((c) => !isArchived(c));
  const archived = contracts
    .filter(isArchived)
    .filter((c) => matches(c, archiveDebounced))
    .sort((a, b) => new Date(b.signed_at ?? 0).getTime() - new Date(a.signed_at ?? 0).getTime());

  const docFor = (leadId: string | null, type: string) =>
    documents.find((d) => d.lead_id === leadId && d.category === type) ?? null;

  const openDoc = (doc: DocumentRow) => {
    void (async () => {
      const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(doc.storage_path, 300);
      if (error || !data) {
        toast.error("Could not open file");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener");
    })();
  };

  const hasArchived = contracts.some(isArchived);

  return (
    <AppShell icon={FileSignature} title="Contracts" subtitle="Signed agreements and rescission windows">
      <div className="space-y-5">
        {isLoading ? (
          <LoadingBlock label="Loading contracts" />
        ) : contracts.length === 0 ? (
          <EmptyState message="No contracts yet. One is created when a lead reaches 5.1 — Contract Signed, Sold." />
        ) : (
          <>
            {SECTIONS.map((section) => {
              const rows = active.filter((c) => (c.contract_type ?? "contract") === section.value);
              return (
                <CategorySection
                  key={section.value}
                  label={section.label}
                  contracts={rows}
                  alwaysShow
                  emptyMessage={`No ${section.label.toLowerCase()} contracts yet.`}
                  canViewFinance={canViewFinance}
                  docFor={docFor}
                  openDoc={openDoc}
                />
              );
            })}

            {hasArchived ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold">Archive</CardTitle>
                  <Input
                    className="w-full max-w-xs"
                    placeholder="Search archive…"
                    aria-label="Search archived contracts"
                    value={archiveQuery}
                    onChange={(e) => setArchiveQuery(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  {archived.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No archived contracts match.</p>
                  ) : (
                    <ContractsTable
                      rows={archived}
                      canViewFinance={canViewFinance}
                      docFor={docFor}
                      openDoc={openDoc}
                    />
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
