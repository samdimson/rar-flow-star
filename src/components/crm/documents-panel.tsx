import { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, SectionCard } from "@/components/crm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useDeleteRow, useDocuments, type DocumentRow } from "@/lib/crm/api";
import { dateTime } from "@/lib/crm/format";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/crm/workflow";
import { useQueryClient } from "@tanstack/react-query";

const BUCKET = "crm-files";

export function DocumentsPanel({ leadId }: { leadId: string }) {
  const { canEdit, user } = useAuth();
  const qc = useQueryClient();
  const { data: docs = [] } = useDocuments({ column: "lead_id", value: leadId });
  const del = useDeleteRow("documents", "Document");
  const [category, setCategory] = useState<DocumentCategory>("photo");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `${leadId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        lead_id: leadId,
        category,
        caption: caption || null,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        storage_path: path,
        uploaded_by: user?.id ?? null,
      });
      if (error) throw error;
      await supabase.from("activities").insert({
        lead_id: leadId,
        type: "document",
        subject: `Uploaded ${file.name}`,
        body: caption || null,
        actor_id: user?.id ?? null,
      });
      setCaption("");
      qc.invalidateQueries();
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const open = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (doc: DocumentRow) => {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    del.mutate(doc.id);
  };

  const grouped = DOCUMENT_CATEGORIES.map((c) => ({
    ...c,
    rows: docs.filter((d) => d.category === c.value),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-4">
      {canEdit ? (
        <SectionCard title="Upload document or photo">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-cat">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger id="doc-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-caption">Caption</Label>
              <Input id="doc-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">File</Label>
              <Input
                id="doc-file"
                type="file"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Upload className="size-3.5" aria-hidden="true" />
            Stored privately; links are signed and expire after 5 minutes.
          </p>
        </SectionCard>
      ) : null}

      {docs.length === 0 ? (
        <EmptyState message="No documents or photos uploaded yet." />
      ) : (
        grouped.map((g) => (
          <SectionCard key={g.value} title={`${g.label} (${g.rows.length})`}>
            <ul className="divide-y divide-border">
              {g.rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.caption ? `${d.caption} · ` : ""}
                      {dateTime(d.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void open(d)}>
                      <Download className="size-4" /> Open
                    </Button>
                    {canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => void remove(d)}>
                        <Trash2 className="size-4 text-destructive" />
                        <span className="sr-only">Delete {d.file_name}</span>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </div>
  );
}
