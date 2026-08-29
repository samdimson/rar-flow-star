import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, PenLine } from "lucide-react";

import { SignaturePad } from "@/components/crm/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClaim, useLead } from "@/lib/crm/api";
import { shortDate } from "@/lib/crm/format";
import { signServiceAgreement } from "@/lib/crm/service-agreement.functions";
import {
  SA_COMPANY,
  SA_EMAIL,
  SA_PHONE,
  SA_WEBSITE,
  SERVICE_AGREEMENT_FIELD_LABELS,
  SERVICE_AGREEMENT_TERMS,
  type ServiceAgreementFields,
} from "@/lib/crm/service-agreement";

const EMPTY: ServiceAgreementFields = {
  homeownerName: "",
  propertyAddress: "",
  cityStateZip: "",
  phone: "",
  email: "",
  insuranceCompany: "",
  claimNumber: "",
  policyNumber: "",
  dateOfLoss: "",
};

export function ServiceAgreementForm({
  leadId,
  onDone,
}: {
  leadId: string;
  onDone: () => void;
}) {
  const { data: lead, isLoading } = useLead(leadId);
  const { data: claim } = useClaim(leadId);
  const run = useServerFn(signServiceAgreement);
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<ServiceAgreementFields>(EMPTY);
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
    setFields({
      homeownerName: [customer?.first_name, customer?.last_name].filter(Boolean).join(" "),
      propertyAddress: property?.address_line1 ?? "",
      cityStateZip: property
        ? `${property.city}, ${property.state} ${property.postal_code}`.trim()
        : "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      insuranceCompany: claim?.carrier ?? "",
      claimNumber: claim?.claim_number ?? "",
      policyNumber: claim?.policy_number ?? "",
      dateOfLoss: claim?.date_of_loss ?? "",
    });
    setPrefilled(true);
  }, [lead, claim, prefilled]);

  const onTermsScroll = () => {
    const el = termsRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledTerms(true);
  };

  useEffect(() => {
    const el = termsRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setScrolledTerms(true);
  }, [lead]);

  const canSubmit = scrolledTerms && !!homeownerSignature && !!repSignature && !busy;

  const submit = async () => {
    if (!homeownerSignature || !repSignature) return;
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
      setError(e instanceof Error ? e.message : "Could not submit the agreement.");
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
        <h2 className="mt-4 text-2xl font-semibold">Agreement signed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.emailed
            ? `Agreement signed and emailed to ${result.recipient}`
            : "Agreement signed and saved to Documents, but the email could not be sent."}
        </p>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Button className="mt-6" onClick={onDone}>
          Return to lead
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Letterhead */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <img src="/logo.png" alt={`${SA_COMPANY} logo`} className="h-14 w-auto" />
          <div className="text-right text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-primary">{SA_COMPANY}</p>
            <p>{SA_PHONE}</p>
            <p>{SA_EMAIL}</p>
            <p>{SA_WEBSITE}</p>
          </div>
        </div>
        <div className="h-[3px] w-full rounded bg-primary" />
        <h1 className="text-center text-2xl font-bold tracking-wide text-primary">SERVICE AGREEMENT</h1>
      </header>

      {/* Homeowner information */}
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
          Homeowner information
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICE_AGREEMENT_FIELD_LABELS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`sa-${key}`}>{label}</Label>
              <Input
                id={`sa-${key}`}
                type={key === "dateOfLoss" ? "date" : "text"}
                value={fields[key]}
                onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
          Terms &amp; conditions
        </h2>
        <div
          ref={termsRef}
          onScroll={onTermsScroll}
          className="max-h-80 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
        >
          <ol className="space-y-3">
            {SERVICE_AGREEMENT_TERMS.map((term, index) => (
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

      {/* Signatures */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-500">Signatures</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <SignaturePad
            label="Homeowner Signature"
            disabled={!scrolledTerms}
            onChange={setHomeownerSignature}
          />
          <div className="space-y-1.5 sm:w-40">
            <Label htmlFor="sa-ho-date">Date</Label>
            <Input id="sa-ho-date" readOnly value={shortDate(today)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <SignaturePad
            label={`${SA_COMPANY} Representative`}
            disabled={!scrolledTerms}
            onChange={setRepSignature}
          />
          <div className="space-y-1.5 sm:w-40">
            <Label htmlFor="sa-rep-date">Date</Label>
            <Input id="sa-rep-date" readOnly value={shortDate(today)} />
          </div>
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
        <Button size="lg" disabled={!canSubmit} onClick={() => void submit()}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <PenLine className="size-4" aria-hidden="true" />
          )}
          {busy ? "Submitting…" : "Sign & Submit Agreement"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
