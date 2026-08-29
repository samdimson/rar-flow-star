import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, PenLine } from "lucide-react";

import { SignaturePad } from "@/components/crm/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClaim, useLead } from "@/lib/crm/api";
import { currencyExact, shortDate } from "@/lib/crm/format";
import { signRoofingContract } from "@/lib/crm/roofing-contract.functions";
import {
  RC_ADDRESS,
  RC_CIB,
  RC_COMPANY,
  RC_EMAIL,
  RC_PARTY_FIELDS,
  RC_PHONE,
  RC_PRICE_FIELDS,
  RC_SCOPE_FIELDS,
  RC_WEBSITE,
  ROOFING_CONTRACT_TERMS,
  contractHomeownerTotal,
  contractPayment2,
  num,
  type RcFieldSpec,
  type RoofingContractFields,
} from "@/lib/crm/roofing-contract";
import { roofTypeLabel } from "@/lib/crm/workflow";

const EMPTY: RoofingContractFields = {
  homeownerName: "",
  coOwnerName: "",
  propertyAddress: "",
  cityStateZip: "",
  phone: "",
  email: "",
  contractDate: "",
  roofSystemType: "",
  shingleBrand: "",
  shingleColor: "",
  squares: "",
  tearOffLayers: "1 layer",
  deckingReplacement: "No",
  deckingSheets: "",
  underlayment: "Synthetic",
  iceWaterShield: "Yes",
  iceWaterLocations: "eaves / valleys / penetrations",
  dripEdge: "Yes",
  dripEdgeColor: "",
  ridgeCap: "",
  pipeBoots: "",
  ventilation: "",
  gutters: "No",
  guttersDescription: "",
  permitRequired: "Yes",
  scopeNotes: "",
  carrier: "",
  claimNumber: "",
  rcvAmount: "",
  deductibleAmount: "",
  depreciationAmount: "",
  supplementAmount: "",
  acvAmount: "",
  homeownerPrintedName: "",
  repName: "",
};

const ROOF_SYSTEM_FROM_DB: Record<string, string> = {
  asphalt_shingle: "Asphalt Shingle",
  metal: "Metal",
  tile: "Tile",
  flat_tpo: "TPO",
  flat_mod: "Modified Bitumen",
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-500">{children}</h2>
);

export function RoofingContractForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const { data: lead, isLoading } = useLead(leadId);
  const { data: claim } = useClaim(leadId);
  const run = useServerFn(signRoofingContract);
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<RoofingContractFields>(EMPTY);
  const [prefilled, setPrefilled] = useState(false);
  const [homeownerSignature, setHomeownerSignature] = useState<string | null>(null);
  const [repSignature, setRepSignature] = useState<string | null>(null);
  const [scrolledTerms, setScrolledTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recipient: string | null; emailed: boolean } | null>(null);
  const termsRef = useRef<HTMLDivElement | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!lead || prefilled) return;
    const customer = lead.customer;
    const property = lead.property;
    const anyLead = lead as unknown as { labor_squares?: number | null };
    const scope = (claim as { scope_summary?: ScopeSummaryLike | null } | null)?.scope_summary ?? null;
    const scopeFromSummary = (() => {
      if (!scope || typeof scope !== "object") return "";
      const rows = Array.isArray(scope.category_breakdown) ? scope.category_breakdown : [];
      const parts = rows
        .filter((r) => r?.category)
        .map((r) => `${r.category} ${r.rcv ? (String(r.rcv).startsWith("$") ? r.rcv : `$${r.rcv}`) : ""}`.trim());
      const carrier = scope.carrier || claim?.carrier || "carrier";
      const lines: string[] = [];
      if (parts.length) lines.push(`Per ${carrier} estimate: ${parts.join(", ")}.`);
      if (scope.excluded_items) lines.push(`Excluded by carrier: ${scope.excluded_items}`);
      return lines.join(" ");
    })();
    setFields((prev) => ({
      ...prev,
      scopeNotes: prev.scopeNotes || scopeFromSummary,
      homeownerName: [customer?.first_name, customer?.last_name].filter(Boolean).join(" "),
      propertyAddress: property?.address_line1 ?? "",
      cityStateZip: property
        ? `${property.city}, ${property.state} ${property.postal_code}`.trim()
        : "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      contractDate: today,
      roofSystemType: property?.roof_type
        ? (ROOF_SYSTEM_FROM_DB[property.roof_type] ?? "Other")
        : "",
      squares: anyLead.labor_squares ? String(anyLead.labor_squares) : "",
      carrier: claim?.carrier ?? "",
      claimNumber: claim?.claim_number ?? "",
      rcvAmount: claim?.rcv_amount != null ? String(claim.rcv_amount) : "",
      deductibleAmount: claim?.deductible != null ? String(claim.deductible) : "",
      depreciationAmount: claim?.depreciation_amount != null ? String(claim.depreciation_amount) : "",
      acvAmount: claim?.acv_amount != null ? String(claim.acv_amount) : "",
    }));
    setPrefilled(true);
  }, [lead, claim, prefilled, today]);

  const onTermsScroll = () => {
    const el = termsRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledTerms(true);
  };

  useEffect(() => {
    const el = termsRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setScrolledTerms(true);
  }, [lead]);

  const set = (key: keyof RoofingContractFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const renderField = (spec: RcFieldSpec) => (
    <div key={spec.key} className={`space-y-1.5 ${spec.full ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={`rc-${spec.key}`}>{spec.label}</Label>
      {spec.type === "select" ? (
        <Select value={fields[spec.key]} onValueChange={(value) => set(spec.key, value)}>
          <SelectTrigger id={`rc-${spec.key}`} className="h-11">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(spec.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : spec.type === "textarea" ? (
        <Textarea
          id={`rc-${spec.key}`}
          rows={3}
          value={fields[spec.key]}
          onChange={(e) => set(spec.key, e.target.value)}
        />
      ) : (
        <Input
          id={`rc-${spec.key}`}
          className="h-11"
          type={spec.type === "date" ? "date" : spec.type === "number" || spec.type === "money" ? "number" : "text"}
          inputMode={spec.type === "number" || spec.type === "money" ? "decimal" : undefined}
          step={spec.type === "money" ? "0.01" : undefined}
          value={fields[spec.key]}
          onChange={(e) => set(spec.key, e.target.value)}
        />
      )}
      {spec.hint ? <p className="text-xs text-muted-foreground">{spec.hint}</p> : null}
    </div>
  );

  const canSubmit =
    scrolledTerms &&
    !!homeownerSignature &&
    !!repSignature &&
    fields.homeownerPrintedName.trim().length > 0 &&
    !busy;

  const submit = async () => {
    if (!homeownerSignature || !repSignature) return;
    if (!fields.homeownerPrintedName.trim()) {
      setError("Homeowner printed name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await run({
        data: {
          leadId,
          origin: window.location.origin,
          fields,
          homeownerSignature,
          repSignature,
        },
      });
      await queryClient.invalidateQueries();
      setResult({ recipient: response.recipient ?? fields.email, emailed: response.emailed });
      if (!response.emailed && response.emailError) setError(response.emailError);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not execute the contract.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" /> Loading lead…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted-foreground">This lead could not be found.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">Contract executed.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.emailed
            ? `Copy emailed to ${result.recipient}.`
            : "Contract saved to Documents, but the email could not be sent."}
        </p>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Button className="mt-6" size="lg" onClick={onDone}>
          Return to lead
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Letterhead */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <img src="/logo.png" alt={`${RC_COMPANY} logo`} className="h-14 w-auto" />
          <div className="text-right text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-primary">{RC_COMPANY}</p>
            <p>12101 N MacArthur Blvd, Suite A160</p>
            <p>Edmond, OK 73025</p>
            <p>{RC_PHONE}</p>
            <p>{RC_EMAIL}</p>
            <p>{RC_WEBSITE}</p>
            <p>CIB Reg. #{RC_CIB}</p>
          </div>
        </div>
        <div className="h-[3px] w-full rounded bg-primary" />
        <h1 className="text-center text-2xl font-bold tracking-wide text-primary">
          ROOFING REPLACEMENT CONTRACT
        </h1>
      </header>

      {/* Section 1 — Parties */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <SectionHeading>Section 1 — Parties</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">{RC_PARTY_FIELDS.map(renderField)}</div>
        <dl className="grid gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Contractor</dt>
            <dd>{RC_COMPANY}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Contractor Address</dt>
            <dd>{RC_ADDRESS}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Contractor Phone</dt>
            <dd>{RC_PHONE}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">CIB Registration #</dt>
            <dd>{RC_CIB}</dd>
          </div>
        </dl>
      </section>

      {/* Section 2 — Scope of work */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <SectionHeading>Section 2 — Scope of work</SectionHeading>
        {lead.property?.roof_type ? (
          <p className="text-xs text-muted-foreground">
            Property roof on file: {roofTypeLabel(lead.property.roof_type)}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">{RC_SCOPE_FIELDS.map(renderField)}</div>
      </section>

      {/* Section 3 — Contract price & payment */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <SectionHeading>Section 3 — Contract price &amp; payment</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">{RC_PRICE_FIELDS.map(renderField)}</div>
        <dl className="grid gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Payment 2 — Recoverable depreciation
            </dt>
            <dd className="font-semibold">{currencyExact(contractPayment2(fields))}</dd>
            <p className="text-xs text-muted-foreground">Due upon release by carrier</p>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Homeowner out-of-pocket</dt>
            <dd className="font-semibold">{currencyExact(num(fields.deductibleAmount))}</dd>
            <p className="text-xs text-muted-foreground">Deductible</p>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Total homeowner responsibility</dt>
            <dd className="font-semibold text-orange-500">
              {currencyExact(contractHomeownerTotal(fields))}
            </dd>
          </div>
        </dl>
      </section>

      {/* Section 4 — Terms */}
      <section className="space-y-2">
        <SectionHeading>Section 4 — Terms &amp; conditions</SectionHeading>
        <div
          ref={termsRef}
          onScroll={onTermsScroll}
          className="max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
        >
          <ol className="space-y-3">
            {ROOFING_CONTRACT_TERMS.map((term, index) => (
              <li key={index} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold text-primary">{index + 1}.</span>
                <span>{term}</span>
              </li>
            ))}
          </ol>
        </div>
        <p
          className={`flex items-center gap-1.5 text-xs ${
            scrolledTerms ? "text-emerald-600" : "text-muted-foreground"
          }`}
        >
          {scrolledTerms ? (
            <>
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Terms reviewed — signatures unlocked.
            </>
          ) : (
            <>
              <AlertTriangle className="size-3.5" aria-hidden="true" /> Scroll to the bottom of the terms to
              enable the signature area.
            </>
          )}
        </p>
      </section>

      {/* Section 5 — Signatures */}
      <section className="space-y-4">
        <SectionHeading>Section 5 — Signatures</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <SignaturePad
            label="Homeowner Signature"
            disabled={!scrolledTerms}
            onChange={setHomeownerSignature}
          />
          <div className="space-y-1.5 sm:w-40">
            <Label htmlFor="rc-ho-date">Date</Label>
            <Input id="rc-ho-date" className="h-11" readOnly value={shortDate(today)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-homeownerPrintedName">
            Homeowner printed name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rc-homeownerPrintedName"
            className="h-11"
            value={fields.homeownerPrintedName}
            onChange={(e) => set("homeownerPrintedName", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <SignaturePad
            label={`${RC_COMPANY} Representative`}
            disabled={!scrolledTerms}
            onChange={setRepSignature}
          />
          <div className="space-y-1.5 sm:w-40">
            <Label htmlFor="rc-rep-date">Date</Label>
            <Input id="rc-rep-date" className="h-11" readOnly value={shortDate(today)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-repName">Representative name</Label>
          <Input
            id="rc-repName"
            className="h-11"
            value={fields.repName}
            onChange={(e) => set("repName", e.target.value)}
          />
        </div>
      </section>

      {error ? (
        <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertTriangle className="size-4" aria-hidden="true" /> {error}
          </p>
          <Button variant="outline" size="sm" onClick={() => void submit()} disabled={busy}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" className="h-12" disabled={!canSubmit} onClick={() => void submit()}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <PenLine className="size-4" aria-hidden="true" />
          )}
          {busy ? "Executing…" : "Sign & Execute Contract"}
        </Button>
        <Button variant="ghost" size="lg" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
