import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AdvanceDialog } from "@/components/crm/advance-dialog";
import { DocumentsPanel } from "@/components/crm/documents-panel";
import { EditableSection, RecordForm, type FieldSpec } from "@/components/crm/record-form";
import { EmptyState, Field, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { StageBadge, StatusBadge, TaskBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useActivities,
  useAppointments,
  useChangeOrders,
  useClaim,
  useContracts,
  useEstimates,
  useInvoices,
  useLead,
  useNotes,
  usePayments,
  useProductionJob,
  useProfiles,
  useStageHistory,
  useTasks,
  useUpsert,
} from "@/lib/crm/api";
import { currency, dateTime, shortDate, titleCase } from "@/lib/crm/format";
import {
  APPOINTMENT_KINDS,
  LEAD_SOURCES,
  PAYMENT_KINDS,
  PROPERTY_TYPES,
  ROOF_TYPES,
  TASK_BY_CODE,
  propertyTypeLabel,
  roofTypeLabel,
  stageName,
} from "@/lib/crm/workflow";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead detail — Rise Above Roofing Oklahoma CRM" },
      {
        name: "description",
        content:
          "Full roofing lead record: timeline, tasks, appointments, insurance claim, estimates, contract, production and documents.",
      },
      { property: "og:title", content: "Lead detail — Rise Above Roofing Oklahoma CRM" },
      { property: "og:description", content: "Complete roofing lead and job record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadDetail,
});

function LeadDetail() {
  const { leadId } = Route.useParams();
  const { canEdit, canViewFinance, user } = useAuth();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: claim } = useClaim(leadId);
  const { data: production } = useProductionJob(leadId);
  const { data: activities = [] } = useActivities({ column: "lead_id", value: leadId });
  const { data: notes = [] } = useNotes({ column: "lead_id", value: leadId });
  const { data: tasks = [] } = useTasks({ column: "lead_id", value: leadId });
  const { data: appointments = [] } = useAppointments({ column: "lead_id", value: leadId });
  const { data: estimates = [] } = useEstimates({ column: "lead_id", value: leadId });
  const { data: contracts = [] } = useContracts({ column: "lead_id", value: leadId });
  const { data: invoices = [] } = useInvoices({ column: "lead_id", value: leadId });
  const { data: payments = [] } = usePayments({ column: "lead_id", value: leadId });
  const { data: changeOrders = [] } = useChangeOrders({ column: "lead_id", value: leadId });
  const { data: history = [] } = useStageHistory({ column: "lead_id", value: leadId });
  const { data: profiles = [] } = useProfiles();

  const saveTask = useUpsert("tasks", "Task");
  const saveNote = useUpsert("notes", "Note");
  const [noteBody, setNoteBody] = useState("");

  if (isLoading) {
    return (
      <AppShell title="Lead">
        <LoadingBlock label="Loading lead" />
      </AppShell>
    );
  }

  if (!lead) {
    return (
      <AppShell title="Lead not found">
        <EmptyState
          message="This lead no longer exists."
          action={
            <Button asChild variant="outline">
              <Link to="/leads">Back to leads</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const repOptions = profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || p.id }));
  const task = TASK_BY_CODE[lead.task_code];
  const customerName = `${lead.customer?.first_name ?? ""} ${lead.customer?.last_name ?? ""}`.trim();

  const leadFields: FieldSpec[] = [
    { name: "source", label: "Lead source", type: "select", options: LEAD_SOURCES.map((s) => ({ value: s.value, label: s.label })) },
    { name: "source_detail", label: "Source detail" },
    { name: "assigned_rep_id", label: "Assigned sales rep", type: "select", options: repOptions },
    { name: "production_manager_id", label: "Production manager", type: "select", options: repOptions },
    { name: "estimated_value", label: "Estimated value ($)", type: "number" },
    { name: "contract_amount", label: "Contract amount ($)", type: "number" },
    { name: "storm_date", label: "Storm / date of damage", type: "date" },
    { name: "inspection_date", label: "Inspection date", type: "date" },
    { name: "contract_signed_at", label: "Contract signed", type: "date" },
    { name: "install_date", label: "Install date", type: "date" },
    { name: "next_follow_up_at", label: "Next follow-up", type: "date" },
    { name: "notes", label: "Lead notes", type: "textarea" },
  ];

  const claimFields: FieldSpec[] = [
    { name: "carrier", label: "Insurance carrier" },
    { name: "claim_number", label: "Claim number" },
    { name: "policy_number", label: "Policy number" },
    { name: "date_of_loss", label: "Date of loss", type: "date" },
    { name: "date_filed", label: "Claim filed", type: "date" },
    { name: "adjuster_name", label: "Adjuster name" },
    { name: "adjuster_phone", label: "Adjuster phone", type: "tel" },
    { name: "adjuster_email", label: "Adjuster email", type: "email" },
    { name: "adjuster_meeting_at", label: "Adjuster meeting", type: "datetime" },
    { name: "adjuster_report_received_at", label: "Adjuster report received", type: "date" },
    { name: "rcv_amount", label: "RCV ($)", type: "number" },
    { name: "acv_amount", label: "ACV ($)", type: "number" },
    { name: "depreciation_amount", label: "Depreciation ($)", type: "number" },
    { name: "deductible", label: "Deductible ($)", type: "number" },
    { name: "depreciation_released_at", label: "Depreciation released", type: "date" },
    { name: "supplement_amount", label: "Supplement ($)", type: "number" },
    { name: "supplement_status", label: "Supplement status" },
    { name: "appeal_status", label: "Appeal status" },
    { name: "reinspection_at", label: "Reinspection", type: "datetime" },
    { name: "policy_details", label: "Policy details", type: "textarea" },
    { name: "notes", label: "Claim notes", type: "textarea" },
  ];

  const productionFields: FieldSpec[] = [
    { name: "production_manager_id", label: "Production manager", type: "select", options: repOptions },
    { name: "crew_name", label: "Crew" },
    { name: "install_date", label: "Install date", type: "date" },
    {
      name: "permit_status",
      label: "Permit status",
      type: "select",
      options: ["not_required", "pending", "submitted", "approved"].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: "permit_submitted_at", label: "Permit submitted", type: "date" },
    { name: "permit_approved_at", label: "Permit approved", type: "date" },
    {
      name: "material_order_status",
      label: "Material order",
      type: "select",
      options: ["not_ordered", "ordered", "delivered"].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: "material_ordered_at", label: "Materials ordered", type: "date" },
    { name: "material_delivery_date", label: "Material delivery", type: "date" },
    { name: "rescheduled_to", label: "Rescheduled to", type: "date" },
    { name: "weather_delay_notes", label: "Weather delay notes", type: "textarea" },
    { name: "qc_passed_at", label: "QC passed", type: "date" },
    { name: "punch_list", label: "Punch list", type: "textarea" },
    { name: "walkthrough_at", label: "Homeowner walkthrough", type: "date" },
    { name: "coc_signed_at", label: "Certificate of Completion signed", type: "date" },
    { name: "warranty_registered_at", label: "Warranty registered", type: "date" },
    { name: "notes", label: "Production notes", type: "textarea" },
  ];

  const invoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <AppShell
      title={`${lead.lead_number} · ${customerName || "Lead"}`}
      subtitle={`${lead.property?.address_line1 ?? ""}${lead.property?.city ? `, ${lead.property.city}` : ""} — Stage ${lead.stage_id}: ${stageName(lead.stage_id)}`}
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/leads">
              <ArrowLeft className="size-4" /> Leads
            </Link>
          </Button>
          <AdvanceDialog lead={lead} claim={claim} />
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stageId={lead.stage_id} />
          <TaskBadge code={lead.task_code} />
          <StatusBadge status={lead.status} />
          {lead.rescission_ends_at ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-4/15 px-2.5 py-0.5 text-xs font-medium text-chart-4">
              <Clock className="size-3.5" aria-hidden="true" />
              Rescission ends {shortDate(lead.rescission_ends_at)}
            </span>
          ) : null}
          {task?.description ? (
            <span className="text-xs text-muted-foreground">{task.description}</span>
          ) : null}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="calendar">Appointments</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            {canViewFinance ? <TabsTrigger value="money">Estimates &amp; money</TabsTrigger> : null}
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">Status history</TabsTrigger>
          </TabsList>

          {/* Overview -------------------------------------------------- */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Customer">
                <EditableSection
                  canEdit={canEdit}
                  form={(close) => (
                    <RecordForm
                      table="customers"
                      label="Customer"
                      initial={lead.customer}
                      onSaved={close}
                      onCancel={close}
                      fields={[
                        { name: "first_name", label: "First name", required: true },
                        { name: "last_name", label: "Last name", required: true },
                        { name: "phone", label: "Phone", type: "tel" },
                        { name: "secondary_phone", label: "Secondary phone", type: "tel" },
                        { name: "email", label: "Email", type: "email" },
                        { name: "preferred_contact", label: "Preferred contact" },
                        { name: "address_line1", label: "Address", required: true },
                        { name: "city", label: "City", required: true },
                        { name: "state", label: "State", required: true },
                        { name: "postal_code", label: "ZIP", required: true },
                        { name: "notes", label: "Customer notes", type: "textarea" },
                      ]}
                    />
                  )}
                >
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name" value={customerName || "—"} />
                    <Field label="Phone" value={lead.customer?.phone || "—"} />
                    <Field label="Email" value={lead.customer?.email || "—"} />
                    <Field label="Preferred contact" value={lead.customer?.preferred_contact || "—"} />
                    <Field
                      label="Address"
                      value={
                        lead.customer?.address_line1
                          ? `${lead.customer.address_line1}, ${lead.customer.city ?? ""} ${lead.customer.state ?? ""} ${lead.customer.postal_code ?? ""}`
                          : "Same as property"
                      }
                    />
                  </dl>
                </EditableSection>
              </SectionCard>

              <SectionCard title="Property">
                <EditableSection
                  canEdit={canEdit}
                  form={(close) => (
                    <RecordForm
                      table="properties"
                      label="Property"
                      initial={lead.property}
                      onSaved={close}
                      onCancel={close}
                      fields={[
                        { name: "address_line1", label: "Address", required: true, full: true },
                        { name: "address_line2", label: "Address line 2" },
                        { name: "city", label: "City", required: true },
                        { name: "state", label: "State", required: true },
                        { name: "postal_code", label: "ZIP", required: true },
                        {
                          name: "property_type",
                          label: "Property type",
                          type: "select",
                          options: PROPERTY_TYPES,
                          required: true,
                          placeholder: "Select property type",
                        },
                        {
                          name: "roof_type",
                          label: "Roof type",
                          type: "select",
                          options: ROOF_TYPES,
                          required: true,
                          placeholder: "Select roof type",
                        },
                        { name: "roof_age", label: "Roof age (years)", type: "number" },
                        { name: "jurisdiction", label: "Permit jurisdiction" },
                        { name: "notes", label: "Property notes", type: "textarea" },
                      ]}
                    />
                  )}
                >
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Address"
                      value={`${lead.property?.address_line1 ?? "—"}${lead.property?.city ? `, ${lead.property.city}, ${lead.property.state} ${lead.property.postal_code}` : ""}`}
                    />
                    <Field label="Property type" value={propertyTypeLabel(lead.property?.property_type)} />
                    <Field label="Roof type" value={roofTypeLabel(lead.property?.roof_type)} />
                    <Field label="Roof age" value={lead.property?.roof_age ? `${lead.property.roof_age} yrs` : "—"} />
                    <Field label="Jurisdiction" value={lead.property?.jurisdiction || "—"} />
                  </dl>
                </EditableSection>
              </SectionCard>
            </div>

            <SectionCard title="Lead & job details">
              <EditableSection
                canEdit={canEdit}
                form={(close) => (
                  <RecordForm
                    table="leads"
                    label="Lead"
                    initial={lead}
                    fields={canViewFinance ? leadFields : leadFields.filter((f) => !f.name.includes("amount"))}
                    onSaved={close}
                    onCancel={close}
                    columns={3}
                  />
                )}
              >
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Field label="Lead number" value={lead.lead_number} />
                  <Field label="Source" value={titleCase(lead.source)} />
                  <Field
                    label="Assigned rep"
                    value={profiles.find((p) => p.id === lead.assigned_rep_id)?.full_name ?? "Unassigned"}
                  />
                  <Field
                    label="Production manager"
                    value={profiles.find((p) => p.id === lead.production_manager_id)?.full_name ?? "—"}
                  />
                  {canViewFinance ? <Field label="Estimated value" value={currency(lead.estimated_value)} /> : null}
                  {canViewFinance ? <Field label="Contract amount" value={currency(lead.contract_amount)} /> : null}
                  <Field label="Storm date" value={shortDate(lead.storm_date)} />
                  <Field label="Inspection date" value={shortDate(lead.inspection_date)} />
                  <Field label="Contract signed" value={shortDate(lead.contract_signed_at)} />
                  <Field label="Install date" value={shortDate(lead.install_date)} />
                  <Field label="Next follow-up" value={shortDate(lead.next_follow_up_at)} />
                  <Field label="Created" value={shortDate(lead.created_at)} />
                  <Field label="Notes" value={lead.notes || "—"} />
                </dl>
              </EditableSection>
            </SectionCard>

            <SectionCard title="Notes">
              {canEdit ? (
                <form
                  className="mb-4 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!noteBody.trim()) return;
                    saveNote.mutate(
                      { lead_id: leadId, body: noteBody.trim(), author_id: user?.id ?? null },
                      { onSuccess: () => setNoteBody("") },
                    );
                  }}
                >
                  <Textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={2}
                    placeholder="Add a note to this record"
                    aria-label="New note"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={saveNote.isPending}>
                      <Plus className="size-4" /> Add note
                    </Button>
                  </div>
                </form>
              ) : null}
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {notes.map((n) => (
                    <li key={n.id} className="py-2.5">
                      <p className="text-sm">{n.body}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{dateTime(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          {/* Timeline -------------------------------------------------- */}
          <TabsContent value="timeline" className="mt-4">
            <SectionCard title="Activity timeline">
              {activities.length === 0 ? (
                <EmptyState message="No activity recorded yet." />
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden="true" />
                      <p className="text-sm font-medium">{a.subject}</p>
                      {a.body ? <p className="text-sm text-muted-foreground">{a.body}</p> : null}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {titleCase(a.type)} · {dateTime(a.occurred_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </TabsContent>

          {/* Tasks ---------------------------------------------------- */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            {canEdit ? (
              <SectionCard title="Add task">
                <RecordForm
                  table="tasks"
                  label="Task"
                  extra={{ lead_id: leadId, created_by: user?.id ?? null, status: "open" }}
                  resetAfterSave
                  submitLabel="Create task"
                  fields={[
                    { name: "title", label: "Title", required: true },
                    { name: "due_at", label: "Due", type: "datetime" },
                    { name: "assigned_to", label: "Assigned to", type: "select", options: repOptions },
                    {
                      name: "priority",
                      label: "Priority",
                      type: "select",
                      options: ["low", "normal", "high"].map((v) => ({ value: v, label: titleCase(v) })),
                    },
                    { name: "details", label: "Details", type: "textarea" },
                  ]}
                />
              </SectionCard>
            ) : null}
            <SectionCard title={`Tasks (${tasks.filter((t) => t.status === "open").length} open)`}>
              {tasks.length === 0 ? (
                <EmptyState message="No tasks for this record." />
              ) : (
                <ul className="divide-y divide-border">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.due_at ? `Due ${dateTime(t.due_at)}` : "No due date"} · {titleCase(t.priority)}
                          {t.auto_generated ? " · automated" : ""}
                        </p>
                      </div>
                      {t.status === "open" && canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            saveTask.mutate({ id: t.id, status: "completed", completed_at: new Date().toISOString() })
                          }
                        >
                          <CheckCircle2 className="size-4" /> Complete
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{titleCase(t.status)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          {/* Appointments -------------------------------------------- */}
          <TabsContent value="calendar" className="mt-4 space-y-4">
            {canEdit ? (
              <SectionCard title="Schedule appointment">
                <RecordForm
                  table="appointments"
                  label="Appointment"
                  extra={{ lead_id: leadId, created_by: user?.id ?? null }}
                  resetAfterSave
                  submitLabel="Schedule"
                  fields={[
                    { name: "title", label: "Title", required: true },
                    {
                      name: "kind",
                      label: "Type",
                      type: "select",
                      options: APPOINTMENT_KINDS.map((k) => ({ value: k.value, label: k.label })),
                    },
                    { name: "starts_at", label: "Starts", type: "datetime", required: true },
                    { name: "ends_at", label: "Ends", type: "datetime" },
                    { name: "assigned_to", label: "Owner", type: "select", options: repOptions },
                    { name: "location", label: "Location" },
                    { name: "notes", label: "Notes", type: "textarea" },
                  ]}
                />
              </SectionCard>
            ) : null}
            <SectionCard title="Appointments">
              {appointments.length === 0 ? (
                <EmptyState message="Nothing scheduled." />
              ) : (
                <ul className="divide-y divide-border">
                  {appointments.map((a) => (
                    <li key={a.id} className="py-2.5">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {titleCase(a.kind)} · {dateTime(a.starts_at)}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          {/* Insurance ----------------------------------------------- */}
          <TabsContent value="insurance" className="mt-4">
            <SectionCard title="Insurance claim">
              <EditableSection
                canEdit={canEdit}
                form={(close) => (
                  <RecordForm
                    table="insurance_claims"
                    label="Insurance claim"
                    initial={claim}
                    extra={{ lead_id: leadId }}
                    fields={claimFields}
                    columns={3}
                    onSaved={close}
                    onCancel={close}
                  />
                )}
              >
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Field label="Carrier" value={claim?.carrier || "—"} />
                  <Field label="Claim number" value={claim?.claim_number || "—"} />
                  <Field label="Policy number" value={claim?.policy_number || "—"} />
                  <Field label="Date of loss" value={shortDate(claim?.date_of_loss)} />
                  <Field label="Filed" value={shortDate(claim?.date_filed)} />
                  <Field label="Adjuster" value={claim?.adjuster_name || "—"} />
                  <Field label="Adjuster phone" value={claim?.adjuster_phone || "—"} />
                  <Field label="Adjuster meeting" value={dateTime(claim?.adjuster_meeting_at)} />
                  <Field label="Report received" value={shortDate(claim?.adjuster_report_received_at)} />
                  {canViewFinance ? <Field label="RCV" value={currency(claim?.rcv_amount)} /> : null}
                  {canViewFinance ? <Field label="ACV" value={currency(claim?.acv_amount)} /> : null}
                  {canViewFinance ? <Field label="Depreciation" value={currency(claim?.depreciation_amount)} /> : null}
                  {canViewFinance ? <Field label="Deductible" value={currency(claim?.deductible)} /> : null}
                  <Field label="Depreciation released" value={shortDate(claim?.depreciation_released_at)} />
                  <Field label="Supplement status" value={claim?.supplement_status || "—"} />
                  <Field label="Appeal status" value={claim?.appeal_status || "—"} />
                  <Field label="Reinspection" value={dateTime(claim?.reinspection_at)} />
                  <Field label="Notes" value={claim?.notes || "—"} />
                </dl>
              </EditableSection>
            </SectionCard>
          </TabsContent>

          {/* Money --------------------------------------------------- */}
          {canViewFinance ? (
            <TabsContent value="money" className="mt-4 space-y-4">
              <SectionCard title="Estimates">
                {canEdit ? (
                  <RecordForm
                    table="estimates"
                    label="Estimate"
                    extra={{ lead_id: leadId, created_by: user?.id ?? null }}
                    resetAfterSave
                    submitLabel="Add estimate"
                    columns={3}
                    fields={[
                      { name: "estimate_number", label: "Estimate #" },
                      {
                        name: "source",
                        label: "Source",
                        type: "select",
                        options: ["xactimate", "carrier_scope", "internal"].map((v) => ({ value: v, label: titleCase(v) })),
                      },
                      { name: "total_amount", label: "Total ($)", type: "number", required: true },
                      { name: "scope_gap_amount", label: "Scope gap ($)", type: "number" },
                      {
                        name: "status",
                        label: "Status",
                        type: "select",
                        options: ["draft", "submitted", "approved", "superseded"].map((v) => ({ value: v, label: titleCase(v) })),
                      },
                      { name: "notes", label: "Notes", type: "textarea" },
                    ]}
                  />
                ) : null}
                {estimates.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No estimates yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {estimates.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>
                          {e.estimate_number || "Estimate"} · {titleCase(e.source)} · {titleCase(e.status)}
                          {e.scope_gap_amount ? ` · gap ${currency(e.scope_gap_amount)}` : ""}
                        </span>
                        <span className="font-medium">{currency(e.total_amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Contract">
                <EditableSection
                  canEdit={canEdit}
                  form={(close) => (
                    <RecordForm
                      table="contracts"
                      label="Contract"
                      initial={contracts[0] ?? null}
                      extra={{ lead_id: leadId }}
                      columns={2}
                      onSaved={close}
                      onCancel={close}
                      fields={[
                        { name: "contract_amount", label: "Contract amount ($)", type: "number", required: true },
                        { name: "signed_at", label: "Signed", type: "date" },
                        { name: "rescission_ends_at", label: "Rescission ends", type: "date" },
                        {
                          name: "status",
                          label: "Status",
                          type: "select",
                          options: ["draft", "signed", "rescinded", "complete"].map((v) => ({ value: v, label: titleCase(v) })),
                        },
                        { name: "direction_to_pay_signed", label: "Direction to Pay signed", type: "checkbox" },
                        { name: "notes", label: "Notes", type: "textarea" },
                      ]}
                    />
                  )}
                >
                  {contracts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contract recorded.</p>
                  ) : (
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <Field label="Amount" value={currency(contracts[0]?.contract_amount)} />
                      <Field label="Signed" value={shortDate(contracts[0]?.signed_at)} />
                      <Field label="Rescission ends" value={shortDate(contracts[0]?.rescission_ends_at)} />
                      <Field label="Status" value={titleCase(contracts[0]?.status)} />
                      <Field label="Direction to Pay" value={contracts[0]?.direction_to_pay_signed ? "Signed" : "Not signed"} />
                    </dl>
                  )}
                </EditableSection>
              </SectionCard>

              <SectionCard title={`Invoices & payments — ${currency(collected)} of ${currency(invoiced)} collected`}>
                {canEdit ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RecordForm
                      table="invoices"
                      label="Invoice"
                      extra={{ lead_id: leadId }}
                      resetAfterSave
                      submitLabel="Add invoice"
                      fields={[
                        { name: "invoice_number", label: "Invoice #" },
                        { name: "amount", label: "Amount ($)", type: "number", required: true },
                        { name: "issued_at", label: "Issued", type: "date" },
                        { name: "due_at", label: "Due", type: "date" },
                        {
                          name: "status",
                          label: "Status",
                          type: "select",
                          options: ["draft", "sent", "partial", "paid"].map((v) => ({ value: v, label: titleCase(v) })),
                        },
                      ]}
                    />
                    <RecordForm
                      table="payments"
                      label="Payment"
                      extra={{ lead_id: leadId }}
                      resetAfterSave
                      submitLabel="Record payment"
                      fields={[
                        { name: "amount", label: "Amount ($)", type: "number", required: true },
                        {
                          name: "kind",
                          label: "Type",
                          type: "select",
                          options: PAYMENT_KINDS.map((k) => ({ value: k.value, label: k.label })),
                        },
                        { name: "received_at", label: "Received", type: "date" },
                        { name: "method", label: "Method" },
                        { name: "reference", label: "Reference" },
                      ]}
                    />
                  </div>
                ) : null}
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices</p>
                    {invoices.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="mt-1 divide-y divide-border">
                        {invoices.map((i) => (
                          <li key={i.id} className="flex justify-between gap-2 py-2 text-sm">
                            <span>
                              {i.invoice_number || "Invoice"} · {titleCase(i.status)}
                            </span>
                            <span className="font-medium">{currency(i.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments</p>
                    {payments.length === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="mt-1 divide-y divide-border">
                        {payments.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 py-2 text-sm">
                            <span>
                              {titleCase(p.kind)} · {shortDate(p.received_at)}
                            </span>
                            <span className="font-medium">{currency(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </SectionCard>
            </TabsContent>
          ) : null}

          {/* Production ---------------------------------------------- */}
          <TabsContent value="production" className="mt-4 space-y-4">
            <SectionCard title="Production job">
              <EditableSection
                canEdit={canEdit}
                form={(close) => (
                  <RecordForm
                    table="production_jobs"
                    label="Production job"
                    initial={production}
                    extra={{ lead_id: leadId }}
                    fields={productionFields}
                    columns={3}
                    onSaved={close}
                    onCancel={close}
                  />
                )}
              >
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Production manager"
                    value={profiles.find((p) => p.id === production?.production_manager_id)?.full_name ?? "—"}
                  />
                  <Field label="Crew" value={production?.crew_name || "—"} />
                  <Field label="Install date" value={shortDate(production?.install_date)} />
                  <Field label="Permit status" value={titleCase(production?.permit_status) || "—"} />
                  <Field label="Permit submitted" value={shortDate(production?.permit_submitted_at)} />
                  <Field label="Permit approved" value={shortDate(production?.permit_approved_at)} />
                  <Field label="Materials" value={titleCase(production?.material_order_status) || "—"} />
                  <Field label="Material delivery" value={shortDate(production?.material_delivery_date)} />
                  <Field label="Rescheduled to" value={shortDate(production?.rescheduled_to)} />
                  <Field label="QC passed" value={shortDate(production?.qc_passed_at)} />
                  <Field label="Walkthrough" value={shortDate(production?.walkthrough_at)} />
                  <Field label="COC signed" value={shortDate(production?.coc_signed_at)} />
                  <Field label="Warranty registered" value={shortDate(production?.warranty_registered_at)} />
                  <Field label="Punch list" value={production?.punch_list || "None"} />
                  <Field label="Weather delays" value={production?.weather_delay_notes || "None"} />
                </dl>
              </EditableSection>
            </SectionCard>

            <SectionCard title="Change orders">
              {canEdit ? (
                <RecordForm
                  table="change_orders"
                  label="Change order"
                  extra={{ lead_id: leadId, production_job_id: production?.id ?? null }}
                  resetAfterSave
                  submitLabel="Add change order"
                  columns={3}
                  fields={[
                    { name: "description", label: "Description", required: true, full: true },
                    { name: "amount", label: "Amount ($)", type: "number", required: true },
                    {
                      name: "status",
                      label: "Status",
                      type: "select",
                      options: ["pending", "approved", "rejected"].map((v) => ({ value: v, label: titleCase(v) })),
                    },
                    { name: "supplement_submitted", label: "Supplement submitted", type: "checkbox" },
                    { name: "homeowner_approved", label: "Homeowner approved", type: "checkbox" },
                  ]}
                />
              ) : null}
              {changeOrders.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No change orders.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {changeOrders.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0">
                        {c.description}
                        <span className="block text-xs text-muted-foreground">
                          {titleCase(c.status)} · supplement {c.supplement_submitted ? "submitted" : "pending"} ·
                          homeowner {c.homeowner_approved ? "approved" : "pending"}
                        </span>
                      </span>
                      <span className="font-medium">{currency(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          {/* Documents ---------------------------------------------- */}
          <TabsContent value="documents" className="mt-4">
            <DocumentsPanel leadId={leadId} />
          </TabsContent>

          {/* History ------------------------------------------------ */}
          <TabsContent value="history" className="mt-4">
            <SectionCard title="Status history">
              {history.length === 0 ? (
                <EmptyState message="No stage changes recorded yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((h) => (
                    <li key={h.id} className="py-2.5">
                      <p className="text-sm font-medium">
                        {h.from_task_code ? `${h.from_task_code} → ` : ""}
                        {h.to_task_code} — {TASK_BY_CODE[h.to_task_code]?.name}
                        {h.is_override ? (
                          <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            manual override
                          </span>
                        ) : null}
                      </p>
                      {h.reason ? <p className="text-sm text-muted-foreground">{h.reason}</p> : null}
                      <p className="mt-0.5 text-xs text-muted-foreground">{dateTime(h.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
