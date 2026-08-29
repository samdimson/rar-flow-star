/**
 * Executes the RAR-T001..RAR-T080 seed against the database with the
 * service-role client. Idempotent: existing RAR-T0xx leads are skipped.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  LEAD_SPECS,
  REP_EMAILS,
  lineItemsFor,
  personFor,
  squaresFor,
  type LeadSpec,
  type RepKey,
} from "./seed-data";

export type SeedReport = {
  leads_created: number;
  customers_created: number;
  properties_created: number;
  invoices_created: number;
  payments_created: number;
  documents_created: number;
  tasks_created: number;
  appointments_created: number;
  activities_created: number;
  milestone_payouts_created: number;
  skipped: string[];
  errors: string[];
};

const db = supabaseAdmin as unknown as {
  from: (table: string) => any;
};

const dayMs = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * dayMs).toISOString();
const dateOnly = (days: number) => iso(days).slice(0, 10);
const stageOf = (code: string) => Number(code.split(".")[0]);
const leadNumber = (n: number) => `RAR-T${String(n).padStart(3, "0")}`;

/** Milestone-triggering task codes, in workflow order. */
const MILESTONE_CODES = ["4.1", "5.2", "6.5"] as const;
const ORDER = new Map<string, number>();
for (const spec of LEAD_SPECS) void spec;
[
  "1.1", "1.2", "1.3", "1.4",
  "2.1", "2.2", "2.3",
  "3.1", "3.2", "3.3", "3.4", "3.5", "3.6",
  "4.1", "4.2",
  "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
  "6.1", "6.2", "6.3", "6.4", "6.5",
  "7.1", "7.2", "7.3",
  "8.1", "8.2", "8.3",
].forEach((code, i) => ORDER.set(code, i));

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await db.from(table).insert(row).select("id").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data as { id: string }).id;
}

async function insertMany(table: string, rows: Record<string, unknown>[]): Promise<number> {
  if (!rows.length) return 0;
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  return rows.length;
}

export async function runSeed(): Promise<SeedReport> {
  const report: SeedReport = {
    leads_created: 0,
    customers_created: 0,
    properties_created: 0,
    invoices_created: 0,
    payments_created: 0,
    documents_created: 0,
    tasks_created: 0,
    appointments_created: 0,
    activities_created: 0,
    milestone_payouts_created: 0,
    skipped: [],
    errors: [],
  };

  // ---- reps ----
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, email")
    .in("email", Object.values(REP_EMAILS));
  if (profileError) throw new Error(`profiles: ${profileError.message}`);

  const byEmail = new Map<string, string>(
    ((profiles ?? []) as { id: string; email: string | null }[])
      .filter((p) => p.email)
      .map((p) => [p.email!.toLowerCase(), p.id]),
  );
  const repIds: Partial<Record<Exclude<RepKey, "random">, string>> = {};
  for (const [key, email] of Object.entries(REP_EMAILS)) {
    const id = byEmail.get(email.toLowerCase());
    if (id) repIds[key as Exclude<RepKey, "random">] = id;
    else report.errors.push(`Rep profile not found for ${email}`);
  }
  const pool = Object.values(repIds) as string[];
  const repFor = (spec: LeadSpec): string | null => {
    if (spec.rep && spec.rep !== "random") return repIds[spec.rep] ?? pool[spec.n % pool.length] ?? null;
    return pool.length ? pool[spec.n % pool.length]! : null;
  };

  // ---- already-seeded leads ----
  const numbers = LEAD_SPECS.map((s) => leadNumber(s.n));
  const { data: existing } = await db.from("leads").select("lead_number").in("lead_number", numbers);
  const done = new Set(((existing ?? []) as { lead_number: string }[]).map((l) => l.lead_number));

  for (const spec of LEAD_SPECS) {
    const number = leadNumber(spec.n);
    if (done.has(number)) {
      report.skipped.push(number);
      continue;
    }
    try {
      await seedLead(spec, number, repFor(spec), report);
    } catch (error) {
      report.errors.push(`${number}: ${(error as Error).message}`);
    }
  }

  const { count } = await db
    .from("milestone_payouts")
    .select("id", { count: "exact", head: true });
  report.milestone_payouts_created = count ?? 0;

  return report;
}

async function seedLead(
  spec: LeadSpec,
  number: string,
  repId: string | null,
  report: SeedReport,
): Promise<void> {
  const person = personFor(spec.n, { property_type: spec.property_type, roof_type: spec.roof_type });

  const propertyId = await insert("properties", {
    address_line1: person.address_line1,
    city: person.city,
    state: person.state,
    postal_code: person.postal_code,
    property_type: person.property_type,
    roof_type: person.roof_type,
    roof_age: person.roof_age,
    jurisdiction: person.city,
  });
  report.properties_created += 1;

  const customerId = await insert("customers", {
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: person.phone,
    address_line1: person.address_line1,
    city: person.city,
    state: person.state,
    postal_code: person.postal_code,
    property_id: propertyId,
    preferred_contact: spec.n % 3 === 0 ? "phone" : "email",
  });
  report.customers_created += 1;

  // Lead always starts at 1.1 so the workflow triggers fire naturally.
  const leadId = await insert("leads", {
    lead_number: number,
    customer_id: customerId,
    property_id: propertyId,
    assigned_rep_id: repId,
    production_manager_id: spec.job?.production_manager
      ? (await profileId(spec.job.production_manager))
      : null,
    stage_id: 1,
    task_code: "1.1",
    status: "open",
    source: spec.source ?? "door_to_door",
    estimated_value: spec.estimated_value ?? spec.contract_amount ?? 0,
    notes: spec.notes ?? null,
    storm_date: spec.storm_date ?? null,
    inspection_date: spec.inspection_days !== undefined ? dateOnly(spec.inspection_days) : null,
    next_follow_up_at: spec.next_follow_up_days !== undefined ? iso(spec.next_follow_up_days) : null,
  });
  report.leads_created += 1;

  await insertMany("lead_stage_history", [{ lead_id: leadId, to_task_code: "1.1", reason: "Seeded test data" }]);

  // ---- contract / financial fields ----
  if (spec.contract_amount !== undefined) {
    const { error } = await db
      .from("leads")
      .update({
        contract_amount: spec.contract_amount,
        contract_signed_at: spec.contract_signed_days !== undefined ? iso(spec.contract_signed_days) : null,
        rescission_ends_at: spec.rescission_ends_days !== undefined ? iso(spec.rescission_ends_days) : null,
        install_date: spec.install_days !== undefined ? dateOnly(spec.install_days) : null,
      })
      .eq("id", leadId);
    if (error) throw new Error(`leads(contract): ${error.message}`);
  }

  // ---- insurance claim ----
  const c = spec.claim;
  if (c) {
    await insert("insurance_claims", {
      lead_id: leadId,
      carrier: c.carrier ?? null,
      claim_number: c.claim_number ?? null,
      policy_number: c.policy_number ?? null,
      adjuster_name: c.adjuster_name ?? null,
      adjuster_phone: c.adjuster_phone ?? null,
      adjuster_email: c.adjuster_email ?? null,
      adjuster_meeting_at: c.adjuster_meeting_days !== undefined ? iso(c.adjuster_meeting_days) : null,
      adjuster_report_received_at: c.adjuster_report_days !== undefined ? iso(c.adjuster_report_days) : null,
      reinspection_at: c.reinspection_days !== undefined ? iso(c.reinspection_days) : null,
      date_of_loss: c.date_of_loss_days !== undefined ? dateOnly(c.date_of_loss_days) : null,
      date_filed: c.date_filed_days !== undefined ? dateOnly(c.date_filed_days) : null,
      rcv_amount: c.rcv_amount ?? null,
      acv_amount: c.acv_amount ?? null,
      deductible: c.deductible ?? null,
      depreciation_amount: c.depreciation_amount ?? null,
      type_of_loss: "hail",
      notes: c.notes ?? null,
    });
  }

  // ---- estimate + line items (drives net_amount / overhead_amount) ----
  const wantsItems = spec.financials && spec.contract_amount !== undefined;
  if (spec.estimate || wantsItems) {
    const total = spec.estimate?.total_amount ?? spec.contract_amount ?? 0;
    const squares = squaresFor(spec.contract_amount ?? total);
    const estimateId = await insert("estimates", {
      lead_id: leadId,
      total_amount: total,
      status: spec.estimate?.status ?? "approved",
      scope_gap_amount: spec.estimate?.scope_gap_amount ?? null,
      notes: spec.estimate?.notes ?? null,
      labor_type: "tear_off_replace",
      labor_squares: squares,
      estimate_number: `EST-${number}`,
    });

    if (wantsItems) {
      await insertMany(
        "estimate_line_items",
        lineItemsFor(spec.contract_amount!).map((li, i) => ({
          estimate_id: estimateId,
          item: li.item,
          quantity: li.quantity,
          unit: li.unit,
          unit_price: li.unit_price,
          source: li.source,
          sort_order: i,
        })),
      );
    }
  }

  // ---- production job ----
  const j = spec.job;
  const needsJob = !!j || ORDER.get(spec.task)! >= ORDER.get("5.3")!;
  if (needsJob) {
    const jobId = await insert("production_jobs", {
      lead_id: leadId,
      production_manager_id: j?.production_manager ? await profileId(j.production_manager) : null,
      install_date: j?.install_days !== undefined ? dateOnly(j.install_days) : null,
      permit_status: j?.permit_status ?? "not_required",
      permit_submitted_at: j?.permit_submitted_days !== undefined ? iso(j.permit_submitted_days) : null,
      permit_approved_at: j?.permit_status === "approved" ? iso(-3) : null,
      material_order_status: j?.material_order_status ?? "not_ordered",
      material_ordered_at: j?.material_ordered_days !== undefined ? iso(j.material_ordered_days) : null,
      material_delivery_date: j?.material_delivery_days !== undefined ? dateOnly(j.material_delivery_days) : null,
      weather_delay_notes: j?.weather_delay_notes ?? null,
      rescheduled_to: j?.rescheduled_days !== undefined ? dateOnly(j.rescheduled_days) : null,
      punch_list: j?.punch_list ?? null,
      qc_passed_at: j?.qc_passed_days !== undefined ? iso(j.qc_passed_days) : null,
      coc_signed_at: j?.coc_signed_days !== undefined ? iso(j.coc_signed_days) : null,
      walkthrough_at: j?.walkthrough_days !== undefined ? iso(j.walkthrough_days) : null,
      warranty_registered_at: j?.warranty_registered_days !== undefined ? iso(j.warranty_registered_days) : null,
      crew_name: j?.crew_name ?? null,
      notes: j?.notes ?? null,
    });

    if (spec.changeOrder) {
      await insert("change_orders", {
        lead_id: leadId,
        production_job_id: jobId,
        description: spec.changeOrder.description,
        amount: spec.changeOrder.amount,
        homeowner_approved: spec.changeOrder.homeowner_approved ?? false,
        supplement_submitted: spec.changeOrder.supplement_submitted ?? false,
        status: spec.changeOrder.status ?? "pending",
      });
    }
  }

  // ---- supplements ----
  for (const s of spec.supplements ?? []) {
    await insert("supplements", {
      lead_id: leadId,
      requested_amount: s.requested_amount ?? null,
      approved_amount: s.approved_amount ?? null,
      status: s.status ?? "draft",
      scope_description: s.scope_description ?? null,
      denial_reason: s.denial_reason ?? null,
      submitted_at: s.submitted_days !== undefined ? iso(s.submitted_days) : null,
    });
  }

  // ---- invoice + payments ----
  let invoiceId: string | null = null;
  if (spec.invoice) {
    invoiceId = await insert("invoices", {
      lead_id: leadId,
      invoice_number: spec.invoice.invoice_number,
      amount: spec.invoice.amount,
      status: spec.invoice.status,
      issued_at: spec.invoice.issued_days !== undefined ? iso(spec.invoice.issued_days) : iso(0),
      due_at: iso(30),
    });
    report.invoices_created += 1;
  }
  report.payments_created += await insertMany(
    "payments",
    (spec.payments ?? []).map((p) => ({
      lead_id: leadId,
      invoice_id: invoiceId,
      kind: p.kind,
      amount: p.amount,
      received_at: iso(p.days),
      method: "check",
    })),
  );

  // ---- documents / tasks / appointments / activities ----
  report.documents_created += await insertMany(
    "documents",
    (spec.documents ?? []).map((d) => ({
      lead_id: leadId,
      customer_id: customerId,
      category: d.category,
      file_name: d.file_name,
      storage_path: `${leadId}/${d.file_name}`,
      mime_type: d.file_name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    })),
  );

  report.tasks_created += await insertMany(
    "tasks",
    (spec.tasks ?? []).map((t) => ({
      lead_id: leadId,
      title: t.title,
      details: t.details ?? null,
      due_at: t.days !== undefined ? iso(t.days) : null,
      assigned_to: repId,
      status: "open",
      kind: "manual",
    })),
  );

  report.appointments_created += await insertMany(
    "appointments",
    (spec.appointments ?? []).map((ap) => ({
      lead_id: leadId,
      kind: ap.kind,
      title: ap.title,
      starts_at: iso(ap.days),
      ends_at: iso(ap.days + 0.05),
      attendees: ap.attendees ?? null,
      notes: ap.notes ?? null,
      assigned_to: repId,
      location: `${person.address_line1}, ${person.city}, OK ${person.postal_code}`,
    })),
  );

  report.activities_created += await insertMany(
    "activities",
    (spec.activities ?? []).map((ac) => ({
      lead_id: leadId,
      customer_id: customerId,
      type: ac.type,
      subject: ac.subject,
      body: ac.body ?? null,
      occurred_at: iso(ac.days ?? 0),
      actor_id: repId,
    })),
  );

  // ---- walk the workflow forward so milestone triggers fire ----
  const targetOrder = ORDER.get(spec.task);
  if (targetOrder === undefined) throw new Error(`unknown task_code ${spec.task}`);

  const steps = MILESTONE_CODES.filter((code) => ORDER.get(code)! < targetOrder);
  for (const code of [...steps, spec.task]) {
    const { error } = await db
      .from("leads")
      .update({ task_code: code, stage_id: stageOf(code) })
      .eq("id", leadId);
    if (error) throw new Error(`leads(task ${code}): ${error.message}`);
  }
  await insertMany("lead_stage_history", [
    { lead_id: leadId, from_task_code: "1.1", to_task_code: spec.task, reason: "Seeded test data" },
  ]);

  // ---- clawback scenario: milestone 1 paid, then lead lost ----
  if (spec.clawbackMilestone1) {
    await db
      .from("milestone_payouts")
      .update({ status: "paid", paid_at: iso(-6) })
      .eq("lead_id", leadId)
      .eq("milestone", 1);
  }

  // ---- final status ----
  if (spec.status && spec.status !== "open") {
    const { error } = await db
      .from("leads")
      .update({
        status: spec.status,
        closed_at: spec.closed_days !== undefined ? iso(spec.closed_days) : iso(0),
      })
      .eq("id", leadId);
    if (error) throw new Error(`leads(status): ${error.message}`);
  }

  // Mark paid payouts for won jobs so commission reporting has real data.
  if (spec.status === "won") {
    await db
      .from("milestone_payouts")
      .update({ status: "paid", paid_at: iso(spec.closed_days ?? 0) })
      .eq("lead_id", leadId)
      .eq("status", "pending");
  }
}

const profileCache = new Map<string, string | null>();
async function profileId(key: Exclude<RepKey, "random">): Promise<string | null> {
  const email = REP_EMAILS[key];
  if (profileCache.has(email)) return profileCache.get(email)!;
  const { data } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  const id = (data as { id: string } | null)?.id ?? null;
  profileCache.set(email, id);
  return id;
}
