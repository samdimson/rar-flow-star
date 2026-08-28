import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices, useLeads, usePayments, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { currency, shortDate, titleCase } from "@/lib/crm/format";
import { useAuth } from "@/hooks/use-auth";
import { useEstimatorAccess } from "@/lib/crm/access";
import { RcvInvoiceDialog } from "@/components/crm/rcv-invoice-dialog";

const title = "Invoices & Payments — Rise Above Roofing Oklahoma CRM";
const description =
  "Invoices, deductible and depreciation collections, and outstanding balances owed by carriers and homeowners.";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { canViewFinance, loading } = useAuth();
  const rcvAccess = useEstimatorAccess();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: leads = [] } = useLeads();
  const { data: docs = [] } = useDocuments();
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (loading) {
    return (
      <AppShell icon={Banknote} title="Invoices & Payments">
        <LoadingBlock />
      </AppShell>
    );
  }

  if (!canViewFinance) {
    return (
      <AppShell icon={Banknote} title="Invoices & Payments">
        <EmptyState message="Your role does not have access to financial records." />
      </AppShell>
    );
  }

  const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(invoiced - collected, 0);
  const leadFor = (id: string) => leads.find((l) => l.id === id);

  const leadPayments = (leadId: string) =>
    payments.filter((p) => p.lead_id === leadId);

  const invoiceDoc = (invoice: { lead_id: string; invoice_number?: string | null }) =>
    docs.find(
      (d) =>
        d.lead_id === invoice.lead_id &&
        d.category === "invoice" &&
        (invoice.invoice_number ? d.file_name?.includes(invoice.invoice_number) : true),
    );

  const openPdf = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      toast.error("Could not open PDF");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const outstandingInvoices = invoices.filter((i) => i.status !== "paid");
  const archivedInvoices = invoices.filter((i) => i.status === "paid");

  const InvoiceCard = ({
    invoice,
    archived,
  }: {
    invoice: (typeof invoices)[number];
    archived?: boolean;
  }) => {
    const lead = leadFor(invoice.lead_id);
    const customer = lead?.customer;
    const property = lead?.property;
    const paid = leadPayments(invoice.lead_id).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(Number(invoice.amount) - paid, 0);
    const doc = invoiceDoc(invoice);
    const paidDate = leadPayments(invoice.lead_id)
      .map((p) => p.received_at)
      .filter(Boolean)
      .sort()
      .at(-1);

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-orange-500">
                  {customer ? `${customer.first_name} ${customer.last_name}` : "Customer"}
                </span>
                {lead ? (
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: lead.id }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {lead.lead_number}
                  </Link>
                ) : null}
              </div>
              <p className="text-sm text-sky-400">
                {property
                  ? `${property.address_line1}${property.city ? `, ${property.city}` : ""}${property.state ? ` ${property.state}` : ""}${property.postal_code ? ` ${property.postal_code}` : ""}`
                  : "—"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                <span className="font-medium">{invoice.invoice_number || "Invoice"}</span>
                <Badge variant={archived ? "default" : "secondary