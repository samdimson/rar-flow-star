import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Loader2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field, SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { analyzeScopeDocument, type ScopeSummary } from "@/lib/crm/scope-analysis.functions";
import { useDeleteRow, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { dateTime } from "@/lib/crm/format";

const BUCKET = "crm-files";
const ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

const SUMMARY_FIELDS: { key: keyof ScopeSummary; label: string }[] = [
  { key: "carrier", label: "Carrier" },
  { key: "claim_number", label: "Claim number" },
  { key: "policy_number", label: "Policy number" },
  { key: "rcv_total", label: "RCV total" },
  { key: "acv_total", label: "ACV total" },
  { key: "deductible_net", label: "Deductible (net)" },
  { key: "deductible_gross", label: "Deductible (gross)" },
  { key: "depreciation_total", label: "Depreciation total" },
  { key: "depreciation_recoverable", label: "Recoverable depreciation" },
  { key: "depreciation_non_recoverable", label: "Non-recoverable depreciation" },
  { key: "code_upgrade_amount", label: "Code upgrade / conditional" },
  { key: "documentation_required", label: "Documentation required" },
  { key: "excluded_items", label: "Excluded items" },
];

export function ScopeDocumentsPanel({
  leadId,
  userId,
  canEdit,
}: {
  leadId: string;
  userId: string | null;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeScopeDocument);
  const { data: docs = [] } = useDocuments({ column: "lead_id", value: leadId });
  const del = useDeleteRow("documents", "Scope document");
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentRow | null>(null);

  const scopeDocs = docs.filter((d) => d.storage_path.startsWith(`leads/${leadId}/scope/`));

  const runAnalysis = async (doc: DocumentRow) => {
    setAnalyzing(true);
    setError(null);
    try {
      await analyze({
        data: {
          leadId,
          documentId: doc.id,
          storagePath: doc.storage_path,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        },
      });
      await qc.invalidateQueries();
      toast.success("Scope analyzed");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Scope analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const upload = async (file: File) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
    if (!ok) {
      toast.error("Only PDF, JPG and PNG files are accepted.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const path = `leads/${leadId}/scope/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase
        .from("documents")
        .insert({
          lead_id: leadId,
          category: "xactimate_estimate",
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: path,
          caption: "Adjuster scope document",
          uploaded_by: userId,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      await qc.invalidateQueries();
      toast.success("Scope document uploaded");
      const doc = row as DocumentRow;
      setLastDoc(doc);
      await runAnalysis(doc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const open = async (doc: DocumentRow) => {
    const { data, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
    if (sErr || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (doc: DocumentRow) => {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    del.mutate(doc.id);
  };

  return (
    <SectionCard title="Adjuster scope documents">
      {canEdit ? (
        <div className="space-y-1.5">
          <Label htmlFor="scope-file">Upload carrier scope / estimate (PDF, JPG or PNG)</Label>
          <Input
            id="scope-file"
            type="file"
            accept={ACCEPT}
            disabled={busy || analyzing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Stored privately and analyzed automatically for RCV, ACV, depreciation and per-category amounts.
          </p>
        </div>
      ) : null}

      {analyzing ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Analyzing scope document…
        </p>
      ) : null}

      {error && !analyzing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
          {lastDoc ? (
            <Button variant="outline" size="sm" onClick={() => void runAnalysis(lastDoc)}>
              <RefreshCw className="size-4" /> Retry analysis
            </Button>
          ) : null}
        </div>
      ) : null}

      {scopeDocs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No scope documents uploaded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {scopeDocs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.file_name}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(d.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => void open(d)}>
                  <Download className="size-4" /> Open
                </Button>
                {canEdit ? (
                  <>
                    <Button variant="ghost" size="sm" disabled={analyzing} onClick={() => void runAnalysis(d)}>
                      <RefreshCw className="size-4" /> Analyze
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void remove(d)}>
                      <Trash2 className="size-4 text-destructive" />
                      <span className="sr-only">Delete {d.file_name}</span>
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function ScopeSummaryCard({ summary }: { summary: unknown }) {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as ScopeSummary;
  const rows = Array.isArray(s.category_breakdown) ? s.category_breakdown : [];
  return (
    <SectionCard title="AI scope summary">
      {s.overall_summary ? <p className="mb-3 text-sm text-muted-foreground">{s.overall_summary}</p> : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        {SUMMARY_FIELDS.map((f) => (
          <Field key={String(f.key)} label={f.label} value={(s[f.key] as string | null) || "—"} />
        ))}
      </dl>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">RCV</th>
                <th className="py-2 font-medium">ACV</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.category ?? "row"}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3">{r.category || "—"}</td>
                  <td className="py-2 pr-3">{r.rcv || "—"}</td>
                  <td className="py-2">{r.acv || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {s.analyzed_at ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Analyzed {dateTime(s.analyzed_at)}
          {s.source_file ? ` · ${s.source_file}` : ""} · read-only, verify against the carrier estimate.
        </p>
      ) : null}
    </SectionCard>
  );
}
