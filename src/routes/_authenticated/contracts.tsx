import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSignature, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useContracts, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { currency, relativeDays, shortDate, titleCase } from "@/lib/crm/format";

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

const typeLabel = (value: string | null | undefined) =>
  CONTRACT_CATEGORIES.find((c) => c.value === (value ?? "contract"))?.label ?? titleCase(value);

function ContractsPage() {
  const { canViewFinance } = useAuth();
  const { data: contracts = [], isLoading } = useContracts();
  const { data: documents = [] } = useDocuments();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const signed = contracts.filter((c) => c.signed_at);
  const inRescission = contracts.filter(
    (c) => c.rescission_ends_at && new Date(c.rescission_ends_at).getTime() > Date.now(),
  );
  const value = contracts.reduce((s, c) => s + Number(c.contract_amount ?? 0), 0);

  const q = debounced.trim().toLowerCase();
  const rows = contracts.filter((c) => {
    const type = c.contract_type ?? "contract";
    if (category !== "all" && type !== category) return false;
    if (!q) return true;
    const customer = c.lead?.customer;
    return [customer?.first_name, customer?.last_name, c.lead?.lead_number, c.lead?.property?.address_line1]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const docFor = (leadId: string | null, type: string) =>
    documents.find((d) => d.lead_id === leadId && d.category === type) ?? null;

  const openDoc = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <AppShell icon={FileSignature} title="Contracts" subtitle="Signed agreements and rescission windows">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Contracts signed" value={signed.length} />
          <KpiCard label="In rescission window" value={inRescission.length} tone="warning" />
          {canViewFinance ? <KpiCard label="Contract value" value={currency(value)} tone="positive" /> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="flex-1"
            placeholder="Search by customer name, lead number, or address…"
            aria-label="Search contracts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading contracts" />
        ) : rows.length === 0 ? (
          <EmptyState
            message={
              contracts.length === 0
                ? "No contracts yet. One is created when a lead reaches 5.1 — Contract Signed, Sold."
                : "No contracts match your search or category filter."
            }
          />
        ) : (
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
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: c.lead.id }}
                            className="text-primary hover:underline"
                          >
                            {c.lead.lead_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-orange-500">
                        {c.lead?.customer
                          ? `${c.lead.customer.first_name} ${c.lead.customer.last_name}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-sky-400">
                        {c.lead?.property?.address_line1 ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium">
                          {typeLabel(type)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{shortDate(c.signed_at)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {shortDate(c.rescission_ends_at)}
                        {days !== null && days >= 0 ? (
                          <span className="block text-chart-4">{days} day(s) left</span>
                        ) : null}
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
                            onClick={() => void openDoc(doc)}
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
        )}
      </div>
    </AppShell>
  );
}
