import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { addBusinessDays, TASK_BY_CODE, type RequiredField, REQUIRED_FIELD_LABELS } from "./workflow";
import { isoDate } from "./format";

type Tables = Database["public"]["Tables"];

// Loose table accessor for the generic CRUD/list helpers below. Row types are
// re-applied by each caller, so type safety is preserved at the call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyTable = (name: string) => (supabase as any).from(name);
export type LeadRow = Tables["leads"]["Row"];
export type CustomerRow = Tables["customers"]["Row"];
export type PropertyRow = Tables["properties"]["Row"];
export type ClaimRow = Tables["insurance_claims"]["Row"];
export type ProductionRow = Tables["production_jobs"]["Row"];
export type TaskRow = Tables["tasks"]["Row"];
export type ActivityRow = Tables["activities"]["Row"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type DocumentRow = Tables["documents"]["Row"];
export type EstimateRow = Tables["estimates"]["Row"];
export type ContractRow = Tables["contracts"]["Row"];
export type InvoiceRow = Tables["invoices"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];
export type CommissionRow = Tables["commissions"]["Row"];
export type ChangeOrderRow = Tables["change_orders"]["Row"];
export type SupplementRow = Tables["supplements"]["Row"];

export type LeadWithRelations = LeadRow & {
  customer: CustomerRow | null;
  property: PropertyRow | null;
};

const LEAD_SELECT = "*, customer:customers(*), property:properties(*)";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(LEAD_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadWithRelations[];
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select(LEAD_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as LeadWithRelations | null;
    },
  });
}

function listHook<K extends keyof Tables>(
  table: K,
  orderColumn: string,
  ascending = false,
) {
  return function useList(filter?: { column: string; value: string | null }) {
    return useQuery({
      queryKey: [table as string, filter?.column ?? "all", filter?.value ?? "all"],
      enabled: filter ? !!filter.value : true,
      queryFn: async () => {
        let q = anyTable(table as string).select("*").order(orderColumn, { ascending });
        if (filter?.value) q = q.eq(filter.column, filter.value);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []) as Tables[K]["Row"][];
      },
    });
  };
}

export const useActivities = listHook("activities", "occurred_at");
export const useTasks = listHook("tasks", "due_at", true);
export const useAppointments = listHook("appointments", "starts_at", true);
export const useDocuments = listHook("documents", "created_at");
export const useNotes = listHook("notes", "created_at");
export const useEstimates = listHook("estimates", "created_at");
export type ContractWithLead = ContractRow & {
  contract_type: string | null;
  customer_id: string | null;
  lead: {
    id: string;
    lead_number: string;
    task_code: string | null;
    customer: { first_name: string; last_name: string } | null;
    property: { address_line1: string; city: string | null; state: string | null } | null;
  } | null;
};

export function useContracts(filter?: { column: string; value: string | null }) {
  return useQuery({
    queryKey: ["contracts", filter?.column ?? "all", filter?.value ?? "all"],
    enabled: filter ? !!filter.value : true,
    queryFn: async () => {
      let q = anyTable("contracts").select(
        `*, lead:leads(id, lead_number, task_code,
          customer:customers(first_name, last_name),
          property:properties(address_line1, city, state))`,
      );
      if (filter?.value) q = q.eq(filter.column, filter.value);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContractWithLead[];
    },
  });
}

export type InvoiceWithLead = InvoiceRow & {
  lead: {
    id: string;
    lead_number: string;
    contract_amount: number | null;
    assigned_rep_id: string | null;
    customer: { first_name: string; last_name: string; phone: string | null; email: string | null } | null;
    property: { address_line1: string; city: string | null; state: string | null; postal_code: string | null } | null;
  } | null;
};

export const useInvoices = (filter?: { column: string; value: string | null }) =>
  useQuery({
    queryKey: ["invoices", filter?.column ?? "all", filter?.value ?? "all"],
    enabled: filter ? !!filter.value : true,
    queryFn: async () => {
      let q = supabase.from("invoices").select(
        `*, lead:leads(id, lead_number, contract_amount, assigned_rep_id,
          customer:customers(first_name, last_name, phone, email),
          property:properties(address_line1, city, state, postal_code))`,
      );
      if (filter?.value) q = q.eq(filter.column, filter.value);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceWithLead[];
    },
  });

export const usePayments = listHook("payments", "created_at");
export const useCustomers = listHook("customers", "created_at");
export const useProperties = listHook("properties", "created_at");

export type DocumentCustomer = {
  id: string;
  first_name: string;
  last_name: string;
  lead_number: string;
};

export function useDocumentCustomers() {
  return useQuery({
    queryKey: ["document-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("lead_id, leads!inner(customer_id, lead_number, customers!inner(id, first_name, last_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map = new Map<string, DocumentCustomer>();
      (data ?? []).forEach((row: unknown) => {
        const r = row as {
          leads?: {
            customer_id?: string;
            lead_number?: string;
            customers?: { id?: string; first_name?: string; last_name?: string } | null;
          } | null;
        };
        const lead = r.leads;
        const customer = lead?.customers;
        if (customer?.id && lead?.lead_number) {
          map.set(customer.id, {
            id: customer.id,
            first_name: customer.first_name ?? "",
            last_name: customer.last_name ?? "",
            lead_number: lead.lead_number,
          });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
  });
}
export const useProductionJobs = listHook("production_jobs", "install_date", true);
export const useChangeOrders = listHook("change_orders", "created_at");
export const useCommissions = listHook("commissions", "created_at");
export const useCommissionRules = listHook("commission_rules", "created_at");
export const useStageHistory = listHook("lead_stage_history", "created_at");
export const useAuditLog = listHook("audit_log", "created_at");
export const useSupplements = listHook("supplements", "supplement_number", true);

/**
 * Keeps a single `adjuster_meeting` appointment in sync with the claim's
 * adjuster meeting date/time. Updates the existing row instead of duplicating.
 */
export async function syncAdjusterMeetingAppointment(input: {
  leadId: string;
  startsAt: string | null | undefined;
  location?: string | null;
  assignedTo?: string | null;
}) {
  if (!input.startsAt) return;
  const startsAt = new Date(
    String(input.startsAt).length <= 10 ? `${input.startsAt}T09:00:00` : String(input.startsAt),
  ).toISOString();
  const { data: auth } = await supabase.auth.getUser();
  const actor = auth.user?.id ?? null;
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("kind", "adjuster_meeting")
    .maybeSingle();
  const payload = {
    lead_id: input.leadId,
    kind: "adjuster_meeting" as const,
    title: "Adjuster Meeting",
    starts_at: startsAt,
    location: input.location ?? null,
  };
  if (existing) {
    await supabase.from("appointments").update(payload).eq("id", existing.id);
  } else {
    await supabase
      .from("appointments")
      .insert({ ...payload, assigned_to: input.assignedTo ?? actor, created_by: actor });
  }
}

/**
 * Keeps a single appointment identified by (lead_id, title) in sync with a
 * claim date field. Used for the Reinspection appointment.
 */
export async function syncTitledAppointment(input: {
  leadId: string;
  title: string;
  kind: Database["public"]["Enums"]["appointment_kind"];
  startsAt: string | null | undefined;
  location?: string | null;
  assignedTo?: string | null;
}) {
  if (!input.startsAt) return;
  const startsAt = new Date(
    String(input.startsAt).length <= 10 ? `${input.startsAt}T09:00:00` : String(input.startsAt),
  ).toISOString();
  const { data: auth } = await supabase.auth.getUser();
  const actor = auth.user?.id ?? null;
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("title", input.title)
    .maybeSingle();
  const payload = {
    lead_id: input.leadId,
    kind: input.kind,
    title: input.title,
    starts_at: startsAt,
    location: input.location ?? null,
  };
  if (existing) {
    await supabase.from("appointments").update(payload).eq("id", existing.id);
  } else {
    await supabase
      .from("appointments")
      .insert({ ...payload, assigned_to: input.assignedTo ?? actor, created_by: actor });
  }
}

export function useClaim(leadId: string | null) {
  return useQuery({
    queryKey: ["insurance_claims", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*")
        .eq("lead_id", leadId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClaims() {
  return useQuery({
    queryKey: ["insurance_claims", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProductionJob(leadId: string | null) {
  return useQuery({
    queryKey: ["production_jobs", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_jobs")
        .select("*")
        .eq("lead_id", leadId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type DashboardStats = {
  total_leads: number;
  new_leads_30d: number;
  contacted_30d: number;
  won_count: number;
  total_contract_value: number;
  task_counts: Record<string, number>;
  stage_counts: { stage_id: number; count: number; value: number }[];
  rep_performance: {
    id: string;
    name: string;
    leads: number;
    inspections: number;
    sold: number;
    won: number;
    revenue: number;
  }[];
  invoiced_total: number;
  collected_total: number;
};

/**
 * Company-wide dashboard aggregates. Runs through a SECURITY DEFINER function so
 * every role — including rep-scoped sales reps — sees the same company numbers.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
  });
}



export function useAllRoles() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Audit + activity helpers                                            */
/* ------------------------------------------------------------------ */

export async function logAudit(input: {
  entity: string;
  entityId?: string | null;
  action: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    actor_id: auth.user?.id ?? null,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    action: input.action,
    summary: input.summary ?? null,
    before_data: (input.before ?? null) as never,
    after_data: (input.after ?? null) as never,
  });
}

export async function logActivity(input: {
  leadId: string;
  type: Database["public"]["Enums"]["activity_type"];
  subject: string;
  body?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("activities").insert({
    lead_id: input.leadId,
    type: input.type,
    subject: input.subject,
    body: input.body ?? null,
    actor_id: auth.user?.id ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* Workflow engine                                                     */
/* ------------------------------------------------------------------ */

export type AdvanceInput = {
  lead: LeadRow;
  toTaskCode: string;
  reason?: string | undefined;
  isOverride?: boolean | undefined;
};

export function missingRequirements(
  lead: Pick<LeadRow, "inspection_date" | "contract_signed_at" | "contract_amount" | "production_manager_id" | "install_date">,
  claim:
    | (Pick<ClaimRow, "carrier" | "claim_number" | "adjuster_meeting_at" | "rcv_amount"> & {
        scope_document_id?: string | null;
      })
    | null
    | undefined,
  toTaskCode: string,
  fromTaskCode?: string | null,
): RequiredField[] {
  const task = TASK_BY_CODE[toTaskCode];
  // Fields required to enter the target task, plus fields the current task must
  // capture before the lead is allowed to leave it (exit gate).
  const fromTask = fromTaskCode ? TASK_BY_CODE[fromTaskCode] : undefined;
  const exitGate = fromTask && fromTask.next.includes(toTaskCode) ? (fromTask.required ?? []) : [];
  const fields = Array.from(new Set([...(task?.required ?? []), ...exitGate]));
  if (!fields.length) return [];
  const present: Record<RequiredField, unknown> = {
    inspection_date: lead.inspection_date,
    carrier: claim?.carrier,
    claim_number: claim?.claim_number,
    adjuster_meeting_at: claim?.adjuster_meeting_at,
    rcv_amount: claim?.rcv_amount,
    scope_document: claim?.scope_document_id ?? null,
    contract_signed_at: lead.contract_signed_at,
    contract_amount: lead.contract_amount,
    production_manager_id: lead.production_manager_id,
    install_date: lead.install_date,
  };
  return fields.filter((f) => {
    const v = present[f];
    if (f === "rcv_amount") return !(Number(v) > 0);
    return v === null || v === undefined || v === "" || v === 0;
  });
}


export function requirementLabel(field: RequiredField) {
  return REQUIRED_FIELD_LABELS[field];
}

async function ensureRecords(lead: LeadRow, kinds: string[]) {
  for (const kind of kinds) {
    if (kind === "claim") {
      const { data } = await supabase.from("insurance_claims").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!data) await supabase.from("insurance_claims").insert({ lead_id: lead.id });
    }
    if (kind === "contract") {
      const { data } = await supabase.from("contracts").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!data) {
        await supabase.from("contracts").insert({
          lead_id: lead.id,
          contract_amount: lead.contract_amount ?? 0,
          signed_at: lead.contract_signed_at,
          rescission_ends_at: lead.rescission_ends_at,
          status: "signed",
        });
      }
    }
    if (kind === "production_job") {
      const { data } = await supabase.from("production_jobs").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!data) {
        await supabase.from("production_jobs").insert({
          lead_id: lead.id,
          production_manager_id: lead.production_manager_id,
          install_date: lead.install_date,
        });
      }
    }
    if (kind === "invoice") {
      const { data } = await supabase.from("invoices").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!data) {
        await supabase.from("invoices").insert({
          lead_id: lead.id,
          invoice_number: `INV-${lead.lead_number}`,
          amount: lead.contract_amount ?? lead.estimated_value ?? 0,
          issued_at: isoDate(new Date()),
          status: "issued",
        });
      }
    }
    if (kind === "commission") {
      const { data } = await supabase.from("commissions").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!data) {
        const { data: rule } = await supabase
          .from("commission_rules")
          .select("*")
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        const base = Number(lead.contract_amount ?? lead.estimated_value ?? 0);
        const amount = rule ? (base * Number(rule.percent)) / 100 + Number(rule.flat_amount ?? 0) : 0;
        await supabase.from("commissions").insert({
          lead_id: lead.id,
          rep_id: lead.assigned_rep_id,
          rule_id: rule?.id ?? null,
          amount,
        });
      }
    }
  }
}

/**
 * Applies a workflow task transition: validates required fields, updates the
 * lead, writes stage history + activity + audit records, and fires the
 * automation attached to the target task (follow-up tasks, calendar events,
 * rescission window, dependent records).
 */
export async function applyTransition({ lead, toTaskCode, reason, isOverride }: AdvanceInput) {
  const task = TASK_BY_CODE[toTaskCode];
  if (!task) throw new Error(`Unknown workflow task ${toTaskCode}`);

  if (!isOverride) {
    const validNext = TASK_BY_CODE[lead.task_code]?.next ?? [];
    if (!validNext.includes(toTaskCode)) {
      throw new Error(
        `${task.code} ${task.name} is not a valid next step from ${lead.task_code}. Valid next steps: ${validNext.join(", ") || "none"}.`,
      );
    }
  }

  const { data: claim } = await supabase
    .from("insurance_claims")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();

  const missing = missingRequirements(lead, claim, toTaskCode, lead.task_code);
  if (missing.length && !isOverride) {
    throw new Error(
      `Cannot advance to ${task.code} ${task.name}. Missing required: ${missing.map(requirementLabel).join(", ")}.`,
    );
  }


  const { data: auth } = await supabase.auth.getUser();
  const actor = auth.user?.id ?? null;

  const patch: Tables["leads"]["Update"] = {
    stage_id: task.stageId,
    task_code: task.code,
  };
  if (task.setStatus) patch.status = task.setStatus;
  else if (lead.status !== "open") patch.status = "open";
  if (task.terminal && (task.setStatus === "won" || task.setStatus === "lost")) {
    patch.closed_at = new Date().toISOString();
  }
  if (task.startsRescission && !lead.rescission_ends_at) {
    const base = lead.contract_signed_at ? new Date(`${lead.contract_signed_at}T12:00:00`) : new Date();
    patch.rescission_ends_at = isoDate(addBusinessDays(base, 3));
  }

  const firstFollowUp = task.followUps?.[0];
  if (firstFollowUp) {
    const due = new Date();
    due.setDate(due.getDate() + firstFollowUp.dueInDays);
    patch.next_follow_up_at = isoDate(due);
  }

  const { error: updateError } = await supabase.from("leads").update(patch).eq("id", lead.id);
  if (updateError) throw updateError;

  const updatedLead: LeadRow = { ...lead, ...patch } as LeadRow;

  await supabase.from("lead_stage_history").insert({
    lead_id: lead.id,
    from_task_code: lead.task_code,
    to_task_code: task.code,
    changed_by: actor,
    is_override: !!isOverride,
    reason: reason ?? null,
  });

  await logActivity({
    leadId: lead.id,
    type: "stage_change",
    subject: `${isOverride ? "Override to" : "Advanced to"} ${task.code} — ${task.name}`,
    body: reason ?? task.description,
  });

  if (task.ensure?.length) await ensureRecords(updatedLead, task.ensure);

  if (task.followUps?.length) {
    const rows = task.followUps.map((f) => {
      const due = new Date();
      due.setDate(due.getDate() + f.dueInDays);
      return {
        lead_id: lead.id,
        title: f.title,
        details: `Auto-created by workflow task ${task.code} — ${task.name}`,
        due_at: due.toISOString(),
        kind: f.kind,
        priority: f.priority ?? "normal",
        assigned_to: lead.assigned_rep_id ?? actor,
        auto_generated: true,
        created_by: actor,
      };
    });
    await supabase.from("tasks").insert(rows);
  }

  if (task.appointment) {
    const field = task.appointment.dateField;
    const source =
      (updatedLead as unknown as Record<string, string | null>)[field] ??
      (claim as unknown as Record<string, string | null> | null | undefined)?.[field];
    if (source) {
      const starts = String(source).length <= 10 ? `${source}T09:00:00` : String(source);
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("kind", task.appointment.kind)
        .maybeSingle();
      if (!existing) {
        await supabase.from("appointments").insert({
          lead_id: lead.id,
          kind: task.appointment.kind,
          title: `${task.appointment.title} — ${lead.lead_number}`,
          starts_at: new Date(starts).toISOString(),
          assigned_to: lead.assigned_rep_id ?? actor,
          created_by: actor,
        });
      }
    }
  }

  await logAudit({
    entity: "leads",
    entityId: lead.id,
    action: isOverride ? "stage_override" : "stage_advance",
    summary: `${lead.task_code} → ${task.code} (${task.name})${isOverride ? " [manual override]" : ""}`,
    before: { task_code: lead.task_code, stage_id: lead.stage_id, status: lead.status },
    after: { task_code: task.code, stage_id: task.stageId, status: patch.status ?? lead.status },
  });

  return updatedLead;
}

export function useAdvanceLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyTransition,
    onSuccess: (_data, vars) => {
      const task = TASK_BY_CODE[vars.toTaskCode];
      toast.success(`Moved to ${task?.code} — ${task?.name}`);
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/* ------------------------------------------------------------------ */
/* Generic CRUD                                                        */
/* ------------------------------------------------------------------ */

export function useUpsert<K extends keyof Tables>(table: K, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data, error } = await anyTable(table as string)
        .upsert(values, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      await logAudit({
        entity: table as string,
        entityId: (data as { id?: string } | null)?.id ?? null,
        action: values["id"] ? "update" : "create",
        summary: label,
        after: values,
      });
      return data;
    },
    onSuccess: () => {
      toast.success(`${label} saved`);
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRow<K extends keyof Tables>(table: K, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await anyTable(table as string).delete().eq("id", id);
      if (error) throw error;
      await logAudit({ entity: table as string, entityId: id, action: "delete", summary: label });
    },
    onSuccess: () => {
      toast.success(`${label} deleted`);
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/* ------------------------------------------------------------------ */
/* Lead creation (customer + property + lead + first activity)          */
/* ------------------------------------------------------------------ */

export type NewLeadInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  property_type: Database["public"]["Enums"]["property_type"];
  roof_type: Database["public"]["Enums"]["roof_type"];
  roof_age: string;
  source: Database["public"]["Enums"]["lead_source"];
  assigned_rep_id: string;
  estimated_value: string;
  storm_date: string;
  carrier: string;
  policy_number: string;
  notes: string;
};

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewLeadInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const actor = auth.user?.id ?? null;

      // Reuse an existing property at the same address so all records connect.
      const { data: existingProperty } = await supabase
        .from("properties")
        .select("*")
        .ilike("address_line1", input.address_line1.trim())
        .maybeSingle();

      let propertyId = existingProperty?.id;
      if (!propertyId) {
        const { data: property, error } = await supabase
          .from("properties")
          .insert({
            address_line1: input.address_line1.trim(),
            city: input.city.trim(),
            state: input.state.trim() || "OK",
            postal_code: input.postal_code.trim(),
            property_type: input.property_type,
            roof_type: input.roof_type,
            roof_age: input.roof_age ? Number(input.roof_age) : null,
          })
          .select()
          .single();
        if (error) throw error;
        propertyId = property.id;
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          phone: input.phone.trim() || null,
          email: input.email.trim() || null,
          property_id: propertyId,
        })
        .select()
        .single();
      if (customerError) throw customerError;

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          customer_id: customer.id,
          property_id: propertyId,
          source: input.source,
          assigned_rep_id: input.assigned_rep_id || actor,
          estimated_value: input.estimated_value ? Number(input.estimated_value) : 0,
          storm_date: input.storm_date || null,
          notes: input.notes || null,
          created_by: actor,
        })
        .select()
        .single();
      if (leadError) throw leadError;

      if (input.carrier || input.policy_number) {
        await supabase.from("insurance_claims").insert({
          lead_id: lead.id,
          carrier: input.carrier || null,
          policy_number: input.policy_number || null,
          date_of_loss: input.storm_date || null,
        });
      }

      await logActivity({
        leadId: lead.id,
        type: "system",
        subject: `Lead created — ${input.address_line1}`,
        body: `Source: ${input.source}`,
      });

      const due = new Date();
      due.setDate(due.getDate() + 1);
      await supabase.from("tasks").insert({
        lead_id: lead.id,
        title: "Make first contact attempt",
        due_at: due.toISOString(),
        kind: "contact",
        priority: "high",
        assigned_to: lead.assigned_rep_id,
        auto_generated: true,
        created_by: actor,
      });

      await supabase.from("lead_stage_history").insert({
        lead_id: lead.id,
        to_task_code: "1.1",
        changed_by: actor,
      });

      await logAudit({
        entity: "leads",
        entityId: lead.id,
        action: "create",
        summary: `Lead ${lead.lead_number} created`,
        after: lead,
      });

      return lead;
    },
    onSuccess: (lead) => {
      toast.success(`Lead ${lead.lead_number} created`);
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
