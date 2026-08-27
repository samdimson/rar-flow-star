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
import { analyzePolicyDocument, type PolicySummary } from "@/lib/crm/policy-analysis.functions";
import { useDeleteRow, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { dateTime } from "@/lib/crm/format";

const BUCKET = "crm-files";
const ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

const SUMMARY_FIELDS: { key: keyof PolicySummary; label: string }[] = [
  { key: "coverage_type", label: "Coverage type (RCV vs ACV)" },
  { key: "roof_coverage_included", label: "Roof coverage included" },
  { key: "deductible", label: "Deductible amount & type" },
  { key: "depreciation", label: "Depreciation" },
  { key: "matching_clause", label: "Matching clause" },
  { key: "wind_hail_exclusions", label: "Wind / hail exclusions" },
  { key: "policy_limits", label: "Policy limits (dwelling)" },
  { key: "loss_settlement_provisions", label: "Loss settlement provisions" },
  { key: "claim_filing_deadline", label: "Claim filing deadline" },
  { key: "roof_age_or_condition_limitations", label: "Roof age / condition limits" },
];

export function PolicyDocumentsPanel({
  leadId,
  userId,
  canEdit,
}: {
  leadId: string;
  userId: string | null;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzePolicyDocument);
  const { data: docs = [] } = useDocuments({ column: "lead_id", value: leadId });
  const del = useDeleteRow("documents", "Policy document");
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentRow | null>(null);

  const policyDocs = docs.filter((d) => d.storage_path.startsWith(`leads/${leadId}/policy/`));

  const runAnalysis = async (doc: DocumentRow) => {
    setAnalyzing(true);
    setError(null);
    try {
      await analyze({
        data: {
          leadId,
          storagePath: doc.storage_path,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        },
      });
      await qc.invalidateQueries();
      toast.success("Policy analyzed");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Policy analysis failed";
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
      const path = `leads/${leadId}/policy/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase
        .from("documents")
        .insert({
          lead_id: leadId,
          category: "insurance_scope",
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: path,
          caption: "Policy document",
          uploaded_by: userId,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      await qc.invalidateQueries();
      toast.success("Policy document uploaded");
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
    <SectionCard title="Policy documents">
      {canEdit ? (
        <div className="space-y-1.5">
          <Label htmlFor="policy-file">Upload policy (PDF, JPG or PNG)</Label>
          <Input
            id="policy-file"
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
            Stored privately and analyzed automatically for roofing-relevant coverage terms.
          </p>
        </div>
      ) : null}

      {analyzing ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Analyzing policy document…
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

      {policyDocs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No policy documents uploaded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {policyDocs.map((d) => (
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

export function PolicySummaryCard({ summary }: { summary: unknown }) {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as PolicySummary;
  return (
    <SectionCard title="AI policy summary">
      {s.overall_summary ? <p className="mb-3 text-sm text-muted-foreground">{s.overall_summary}</p> : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        {SUMMARY_FIELDS.map((f) => (
          <Field key={String(f.key)} label={f.label} value={(s[f.key] as string | null) || "—"} />
        ))}
      </dl>
      {s.analyzed_at ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Analyzed {dateTime(s.analyzed_at)}
          {s.source_file ? ` · ${s.source_file}` : ""} · read-only, verify against the policy document.
        </p>
      ) : null}
    </SectionCard>
  );
}
