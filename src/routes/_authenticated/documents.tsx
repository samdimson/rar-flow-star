import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentCustomers, useDocuments, useLeads, type DocumentRow } from "@/lib/crm/api";
import { dateTime } from "@/lib/crm/format";
import { DOCUMENT_CATEGORIES } from "@/lib/crm/workflow";

const title = "Documents & Photos — Rise Above Roofing Oklahoma CRM";
const description =
  "Central library of adjuster reports, scopes, estimates, contracts, permits, invoices, warranties and job photos.";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: docs = [], isLoading } = useDocuments();
  const { data: leads = [] } = useLeads();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = docs.filter((d) => {
    if (category !== "all" && d.category !== category) return false;
    if (!q) return true;
    const lead = leads.find((l) => l.id === d.lead_id);
    return [d.file_name, d.caption, lead?.lead_number, lead?.property?.address_line1]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const open = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <AppShell
      icon={FolderOpen}
      title="Documents & Photos"
      subtitle={`${docs.length} files stored privately`}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_240px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search file name, caption, lead or address"
            aria-label="Search documents"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SectionCard title={`${rows.length} file${rows.length === 1 ? "" : "s"}`}>
          {isLoading ? (
            <LoadingBlock label="Loading documents" />
          ) : rows.length === 0 ? (
            <EmptyState message="No files match. Upload from a lead's Documents tab." />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((d) => {
                const lead = leads.find((l) => l.id === d.lead_id);
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_CATEGORIES.find((c) => c.value === d.category)?.label} · {dateTime(d.created_at)}
                        {lead ? " · " : ""}
                        {lead ? (
                          <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="text-primary hover:underline">
                            {lead.lead_number}
                          </Link>
                        ) : null}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void open(d)}>
                      <Download className="size-4" /> Open
                    </Button>
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
