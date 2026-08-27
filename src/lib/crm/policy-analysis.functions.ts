import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";
const BUCKET = "crm-files";

export type PolicySummary = {
  coverage_type: string | null;
  roof_coverage_included: string | null;
  deductible: string | null;
  depreciation: string | null;
  matching_clause: string | null;
  wind_hail_exclusions: string | null;
  policy_limits: string | null;
  loss_settlement_provisions: string | null;
  claim_filing_deadline: string | null;
  roof_age_or_condition_limitations: string | null;
  overall_summary: string | null;
  source_file?: string | null;
  analyzed_at?: string | null;
};

export type AnalyzePolicyInput = {
  leadId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
};

const FIELDS = `- coverage_type: replacement cost (RCV) vs actual cash value (ACV)
- roof_coverage_included: yes/no plus any conditions
- deductible: amount and type (flat dollar vs percentage of dwelling)
- depreciation: recoverable or non-recoverable
- matching_clause: yes/no and wording
- wind_hail_exclusions: exclusions or limitations relevant to wind and hail
- policy_limits: dwelling coverage amount and other relevant limits
- loss_settlement_provisions: how losses are settled
- claim_filing_deadline: deadline to file or report a claim
- roof_age_or_condition_limitations: schedules, payment reductions, or limits by roof age/condition`;

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
  if (start === -1 || end === -1) throw new Error("The model did not return a policy summary.");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

const str = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export const analyzePolicyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AnalyzePolicyInput) => data)
  .handler(async ({ data, context }): Promise<{ summary: PolicySummary }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project (missing gateway key).");

    const download = await context.supabase.storage.from(BUCKET).download(data.storagePath);
    if (download.error || !download.data) {
      throw new Error(download.error?.message ?? "Could not read the uploaded policy file.");
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    if (bytes.length === 0) throw new Error("The uploaded policy file is empty.");
    const base64 = toBase64(bytes);
    const mime = data.mimeType || (data.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    const filePart =
      mime === "application/pdf"
        ? { type: "file", file: { filename: data.fileName, file_data: `data:${mime};base64,${base64}` } }
        : { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };

    const prompt = `You are an insurance policy analyst for a roofing contractor in Oklahoma. Read the attached homeowner insurance policy document and extract the following roofing-relevant details:\n${FIELDS}\n\nReturn ONLY a JSON object with exactly these keys: coverage_type, roof_coverage_included, deductible, depreciation, matching_clause, wind_hail_exclusions, policy_limits, loss_settlement_provisions, claim_filing_deadline, roof_age_or_condition_limitations, overall_summary. Each value must be a concise plain-text string. Use "Not stated in document" when the policy does not address a field. overall_summary is 2-3 sentences for the sales rep.`;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, filePart] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) throw new Error("AI is rate limited right now — try the analysis again shortly.");
      if (response.status === 402) throw new Error("AI credits are exhausted for this workspace. Add credits to continue.");
      if (response.status === 403) throw new Error("AI access is blocked by workspace policy.");
      throw new Error(`Policy analysis failed [${response.status}]: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);

    const summary: PolicySummary = {
      coverage_type: str(parsed["coverage_type"]),
      roof_coverage_included: str(parsed["roof_coverage_included"]),
      deductible: str(parsed["deductible"]),
      depreciation: str(parsed["depreciation"]),
      matching_clause: str(parsed["matching_clause"]),
      wind_hail_exclusions: str(parsed["wind_hail_exclusions"]),
      policy_limits: str(parsed["policy_limits"]),
      loss_settlement_provisions: str(parsed["loss_settlement_provisions"]),
      claim_filing_deadline: str(parsed["claim_filing_deadline"]),
      roof_age_or_condition_limitations: str(parsed["roof_age_or_condition_limitations"]),
      overall_summary: str(parsed["overall_summary"]),
      source_file: data.fileName,
      analyzed_at: new Date().toISOString(),
    };

    const existing = await context.supabase
      .from("insurance_claims")
      .select("id")
      .eq("lead_id", data.leadId)
      .maybeSingle();

    if (existing.data?.id) {
      const { error } = await context.supabase
        .from("insurance_claims")
        .update({ policy_summary: summary })
        .eq("id", existing.data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("insurance_claims")
        .insert({ lead_id: data.leadId, policy_summary: summary });
      if (error) throw new Error(error.message);
    }

    return { summary };
  });
