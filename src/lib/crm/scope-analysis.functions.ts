import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";
const BUCKET = "crm-files";

export type ScopeCategory = { category: string | null; rcv: string | null; acv: string | null };

export type ScopeSummary = {
  carrier: string | null;
  claim_number: string | null;
  policy_number: string | null;
  rcv_total: string | null;
  acv_total: string | null;
  deductible_net: string | null;
  deductible_gross: string | null;
  depreciation_total: string | null;
  depreciation_recoverable: string | null;
  depreciation_non_recoverable: string | null;
  code_upgrade_amount: string | null;
  documentation_required: string | null;
  excluded_items: string | null;
  category_breakdown: ScopeCategory[];
  overall_summary: string | null;
  source_file?: string | null;
  analyzed_at?: string | null;
};

export type AnalyzeScopeInput = {
  leadId: string;
  documentId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
};

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The model did not return a scope summary.");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

const str = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const money = (value: unknown): number | null => {
  const n = Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
};

function categories(value: unknown): ScopeCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      category: str(row["category"]),
      rcv: str(row["rcv"]),
      acv: str(row["acv"]),
    }))
    .filter((row) => row.category || row.rcv || row.acv);
}

const PROMPT = `Analyze this insurance carrier property damage estimate (Xactimate or similar) for a roofing contractor in Oklahoma. Extract claim identifiers, RCV/ACV/deductible, depreciation (recoverable vs non-recoverable), conditional/code-upgrade amounts + required documentation, excluded items + reasons, per-category $ breakdown. Return strict JSON matching ScopeSummary.

JSON keys, exactly: carrier, claim_number, policy_number, rcv_total, acv_total, deductible_net, deductible_gross, depreciation_total, depreciation_recoverable, depreciation_non_recoverable, code_upgrade_amount, documentation_required, excluded_items, category_breakdown, overall_summary.
All values are concise plain-text strings except category_breakdown, which is an array of objects { "category": string, "rcv": string, "acv": string }. Use "Not stated in document" when the estimate does not address a field. overall_summary is 2-3 sentences for the sales rep.`;

export const analyzeScopeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AnalyzeScopeInput) => data)
  .handler(async ({ data, context }): Promise<{ summary: ScopeSummary }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project (missing gateway key).");

    const download = await context.supabase.storage.from(BUCKET).download(data.storagePath);
    if (download.error || !download.data) {
      throw new Error(download.error?.message ?? "Could not read the uploaded scope file.");
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    if (bytes.length === 0) throw new Error("The uploaded scope file is empty.");
    const base64 = toBase64(bytes);
    const mime = data.mimeType || (data.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    const filePart =
      mime === "application/pdf"
        ? { type: "file", file: { filename: data.fileName, file_data: `data:${mime};base64,${base64}` } }
        : { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, filePart] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) throw new Error("AI is rate limited right now — try the analysis again shortly.");
      if (response.status === 402) throw new Error("AI credits are exhausted for this workspace. Add credits to continue.");
      if (response.status === 403) throw new Error("AI access is blocked by workspace policy.");
      throw new Error(`Scope analysis failed [${response.status}]: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    const summary: ScopeSummary = {
      carrier: str(parsed["carrier"]),
      claim_number: str(parsed["claim_number"]),
      policy_number: str(parsed["policy_number"]),
      rcv_total: str(parsed["rcv_total"]),
      acv_total: str(parsed["acv_total"]),
      deductible_net: str(parsed["deductible_net"]),
      deductible_gross: str(parsed["deductible_gross"]),
      depreciation_total: str(parsed["depreciation_total"]),
      depreciation_recoverable: str(parsed["depreciation_recoverable"]),
      depreciation_non_recoverable: str(parsed["depreciation_non_recoverable"]),
      code_upgrade_amount: str(parsed["code_upgrade_amount"]),
      documentation_required: str(parsed["documentation_required"]),
      excluded_items: str(parsed["excluded_items"]),
      category_breakdown: categories(parsed["category_breakdown"]),
      overall_summary: str(parsed["overall_summary"]),
      source_file: data.fileName,
      analyzed_at: new Date().toISOString(),
    };

    const existing = await context.supabase
      .from("insurance_claims")
      .select("id, carrier, claim_number, policy_number, rcv_amount, acv_amount, deductible, depreciation_amount")
      .eq("lead_id", data.leadId)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      scope_summary: summary,
      scope_document_id: data.documentId,
    };
    const row = existing.data;
    if (!row?.carrier && summary.carrier) patch["carrier"] = summary.carrier;
    if (!row?.claim_number && summary.claim_number) patch["claim_number"] = summary.claim_number;
    if (!row?.policy_number && summary.policy_number) patch["policy_number"] = summary.policy_number;
    if (!row?.rcv_amount && money(summary.rcv_total)) patch["rcv_amount"] = money(summary.rcv_total);
    if (!row?.acv_amount && money(summary.acv_total)) patch["acv_amount"] = money(summary.acv_total);
    if (!row?.deductible && money(summary.deductible_net)) patch["deductible"] = money(summary.deductible_net);
    if (!row?.depreciation_amount && money(summary.depreciation_total)) {
      patch["depreciation_amount"] = money(summary.depreciation_total);
    }

    if (row?.id) {
      const { error } = await context.supabase.from("insurance_claims").update(patch).eq("id", row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("insurance_claims")
        .insert({ lead_id: data.leadId, ...patch });
      if (error) throw new Error(error.message);
    }

    return { summary };
  });
