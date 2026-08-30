import type { Database } from "@/integrations/supabase/types";

export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type AppointmentKind = Database["public"]["Enums"]["appointment_kind"];
export type DocumentCategory = Database["public"]["Enums"]["document_category"];
export type PaymentKind = Database["public"]["Enums"]["payment_kind"];

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const STAGES: { id: StageId; name: string; short: string }[] = [
  { id: 1, name: "Lead", short: "Lead" },
  { id: 2, name: "Inspection", short: "Inspect" },
  { id: 3, name: "Claim Filing", short: "Claim" },
  { id: 4, name: "Estimate", short: "Estimate" },
  { id: 5, name: "Contract", short: "Contract" },
  { id: 6, name: "Production", short: "Production" },
  { id: 7, name: "Insurance Closeout", short: "Closeout" },
  { id: 8, name: "Post-Job", short: "Post-Job" },
];

/** Fields that must be present on the lead/claim before advancing to a task. */
export type RequiredField =
  | "inspection_date"
  | "damage_type"
  | "damage_areas"
  | "roof_condition"
  | "inspection_notes"
  | "inspection_photos"
  | "carrier"
  | "claim_number"
  | "adjuster_meeting_at"
  | "rcv_amount"
  | "scope_document"
  | "contract_signed_at"
  | "contract_amount"
  | "production_manager_id"
  | "install_date";

export const REQUIRED_FIELD_LABELS: Record<RequiredField, string> = {
  inspection_date: "Inspection date",
  damage_type: "Damage type",
  damage_areas: "Damaged areas",
  roof_condition: "Roof condition",
  inspection_notes: "Inspection notes",
  inspection_photos: "10 inspection photos",
  carrier: "Insurance carrier",
  claim_number: "Claim number",
  adjuster_meeting_at: "Adjuster meeting date/time",
  rcv_amount: "Adjuster RCV amount",
  scope_document: "Adjuster scope document",
  contract_signed_at: "Contract signed date",
  contract_amount: "Contract amount",
  production_manager_id: "Production manager",
  install_date: "Install date",
};


export type FollowUp = {
  title: string;
  /** Calendar days from today. Use "business3" for the rescission window. */
  dueInDays: number;
  kind: string;
  priority?: "low" | "normal" | "high";
};

export type WorkflowTask = {
  code: string;
  stageId: StageId;
  /** Stage this task is displayed/recorded under, when it differs from stageId. */
  displayStageId?: StageId;
  /** Code shown in the stage pill row, when it differs from code. */
  displayCode?: string;
  name: string;
  description: string;
  next: string[];
  terminal?: boolean;
  required?: RequiredField[];
  /** Status the lead is forced into when this task is applied. */
  setStatus?: LeadStatus;
  followUps?: FollowUp[];
  /** Creates a calendar appointment sourced from this lead field. */
  appointment?: { kind: AppointmentKind; title: string; dateField: "inspection_date" | "adjuster_meeting_at" | "install_date" };
  /** Side-effect records to guarantee. */
  ensure?: ("contract" | "production_job" | "claim" | "invoice" | "commission")[];
  startsRescission?: boolean;
};

export const WORKFLOW_TASKS: WorkflowTask[] = [
  {
    code: "1.1",
    stageId: 1,
    name: "Lead — New",
    description: "Lead created, awaiting rep contact",
    next: ["1.2", "1.3", "1.4"],
    followUps: [{ title: "Make first contact attempt", dueInDays: 1, kind: "contact", priority: "high" }],
  },
  {
    code: "1.2",
    stageId: 1,
    name: "Schedule Inspection",
    description: "Rep actively trying to reach homeowner",
    next: ["1.3", "1.4"],
    followUps: [{ title: "Next contact attempt", dueInDays: 1, kind: "contact", priority: "high" }],
  },
  {
    code: "1.3",
    stageId: 1,
    displayStageId: 2,
    name: "Inspection Scheduled",
    description: "Homeowner agreed; inspection on calendar",
    next: ["2.1"],
    required: ["inspection_date"],
    appointment: { kind: "inspection", title: "Roof inspection", dateField: "inspection_date" },
    followUps: [{ title: "Confirm inspection with homeowner", dueInDays: 1, kind: "inspection" }],
  },
  {
    code: "1.4",
    stageId: 1,
    displayCode: "1.3",
    name: "Nurture — Follow-up",
    description: "Homeowner declined for now; bi-weekly follow-up",
    next: ["1.2", "1.3"],
    setStatus: "nurture",
    followUps: [{ title: "Bi-weekly nurture follow-up", dueInDays: 14, kind: "nurture" }],
  },
  {
    code: "2.1",
    stageId: 2,
    name: "Inspection Complete",
    description: "Photos and damage documented",
    next: ["2.2", "2.3"],
    required: [
      "inspection_date",
      "damage_type",
      "damage_areas",
      "roof_condition",
      "inspection_notes",
      "inspection_photos",
    ],
    followUps: [{ title: "Review damage and qualify claim", dueInDays: 1, kind: "review", priority: "high" }],
  },
  {
    code: "2.2",
    stageId: 2,
    name: "Closed — No Claim",
    description: "Damage does not qualify; 6-month follow-up set",
    next: [],
    terminal: true,
    setStatus: "lost",
    followUps: [{ title: "6-month re-inspection follow-up", dueInDays: 180, kind: "nurture" }],
  },
  {
    code: "2.3",
    stageId: 2,
    name: "Opportunity — Claim Qualified",
    description: "Damage qualifies; converted to opportunity",
    next: ["3.1", "4.1"],
    ensure: ["claim"],
    followUps: [{ title: "File insurance claim with carrier", dueInDays: 2, kind: "claim", priority: "high" }],
  },
  {
    code: "3.1",
    stageId: 3,
    name: "Claim Filed — Pending Adjuster",
    description: "Claim submitted; awaiting adjuster assignment",
    next: ["3.2"],
    required: ["carrier", "claim_number"],
    ensure: ["claim"],
    followUps: [{ title: "Follow up on adjuster assignment", dueInDays: 7, kind: "claim" }],
  },
  {
    code: "3.2",
    stageId: 3,
    name: "Adjuster Meeting Scheduled",
    description: "Appointment confirmed with carrier",
    next: ["3.3"],
    required: ["adjuster_meeting_at"],
    appointment: { kind: "adjuster_meeting", title: "Adjuster meeting", dateField: "adjuster_meeting_at" },
    followUps: [{ title: "Confirm adjuster meeting with homeowner", dueInDays: 1, kind: "claim" }],
  },
  {
    code: "3.3",
    stageId: 3,
    name: "Adjuster Meeting Complete",
    description: "Rep attended meeting with homeowner",
    next: ["3.4"],
    followUps: [{ title: "Request adjuster scope and estimate", dueInDays: 3, kind: "claim" }],
  },
  {
    code: "3.4",
    stageId: 3,
    name: "Adjuster Report Received",
    description: "Carrier issued scope and estimate",
    next: ["4.1", "3.5"],
    required: ["rcv_amount", "scope_document"],
    followUps: [{ title: "Build Xactimate estimate from scope", dueInDays: 2, kind: "estimate" }],
  },
  {
    code: "3.5",
    stageId: 3,
    name: "Supplement / Appeal Pending",
    description: "Claim denied or underpaid; appeal submitted",
    next: ["3.6", "3.4", "4.1"],
    followUps: [{ title: "Weekly supplement / appeal follow-up", dueInDays: 7, kind: "supplement", priority: "high" }],
  },
  {
    code: "3.6",
    stageId: 3,
    name: "Reinspection / 2nd Adjuster",
    description: "Carrier granted second inspection",
    next: ["3.4"],
    followUps: [{ title: "Attend reinspection with 2nd adjuster", dueInDays: 7, kind: "claim" }],
  },
  {
    code: "4.1",
    stageId: 4,
    name: "Estimate in Progress",
    description: "Building Xactimate estimate from measurements",
    next: ["4.2", "5.1"],
    followUps: [{ title: "Complete and review estimate", dueInDays: 3, kind: "estimate" }],
  },
  {
    code: "4.2",
    stageId: 4,
    name: "Supplement Pending — Scope Gap",
    description: "Gap found between estimate and adjuster scope; supplement submitted",
    next: ["5.1", "4.1"],
    followUps: [{ title: "Weekly scope-gap supplement follow-up", dueInDays: 7, kind: "supplement" }],
  },
  {
    code: "5.1",
    stageId: 5,
    name: "Contract Signed — Sold",
    description: "Homeowner signed contract and Direction to Pay",
    next: ["5.2"],
    required: ["contract_signed_at", "contract_amount"],
    ensure: ["contract"],
    startsRescission: true,
    followUps: [{ title: "Confirm rescission period cleared", dueInDays: 3, kind: "rescission", priority: "high" }],
  },
  {
    code: "5.2",
    stageId: 5,
    name: "Rescission Period",
    description: "Mandatory 3-business-day cancellation window",
    next: ["5.3"],
    startsRescission: true,
    followUps: [{ title: "Rescission window ends — create job", dueInDays: 3, kind: "rescission", priority: "high" }],
  },
  {
    code: "5.3",
    stageId: 5,
    name: "Job Created",
    description: "Rescission cleared; job record created; production manager assigned",
    next: ["5.4"],
    required: ["production_manager_id"],
    ensure: ["production_job"],
    followUps: [{ title: "Submit permit application", dueInDays: 2, kind: "permit", priority: "high" }],
  },
  {
    code: "5.4",
    stageId: 5,
    name: "Permit Pending",
    description: "Permit application submitted to jurisdiction",
    next: ["5.5"],
    ensure: ["production_job"],
    followUps: [{ title: "Check permit approval status", dueInDays: 5, kind: "permit" }],
  },
  {
    code: "5.5",
    stageId: 5,
    name: "Materials Ordered",
    description: "Material order placed; delivery confirmed",
    next: ["5.6"],
    ensure: ["production_job"],
    followUps: [{ title: "Confirm material delivery date", dueInDays: 3, kind: "materials" }],
  },
  {
    code: "5.6",
    stageId: 5,
    name: "Production Scheduled",
    description: "Install date on crew calendar; homeowner notified",
    next: ["6.1"],
    required: ["install_date"],
    ensure: ["production_job"],
    appointment: { kind: "production", title: "Roof installation", dateField: "install_date" },
    followUps: [{ title: "Notify homeowner of install date", dueInDays: 1, kind: "production" }],
  },
  {
    code: "6.1",
    stageId: 6,
    name: "In Production",
    description: "Crew on site; daily photo documentation",
    next: ["6.2", "6.3", "6.4"],
    ensure: ["production_job"],
    followUps: [{ title: "Upload daily production photos", dueInDays: 1, kind: "photos", priority: "high" }],
  },
  {
    code: "6.2",
    stageId: 6,
    name: "Weather Delay / Reschedule",
    description: "Weather halted install; rescheduled",
    next: ["6.1"],
    followUps: [{ title: "Reschedule install and notify homeowner", dueInDays: 2, kind: "production", priority: "high" }],
  },
  {
    code: "6.3",
    stageId: 6,
    name: "Change Order / Scope Increase",
    description: "Additional damage found; supplement and homeowner approval required",
    next: ["6.1", "6.4"],
    followUps: [{ title: "Get homeowner approval and submit supplement", dueInDays: 2, kind: "change_order", priority: "high" }],
  },
  {
    code: "6.4",
    stageId: 6,
    name: "QC Complete",
    description: "Post-install inspection passed; zero punch-list items",
    next: ["6.5"],
    followUps: [{ title: "Schedule homeowner walkthrough", dueInDays: 2, kind: "qc" }],
  },
  {
    code: "6.5",
    stageId: 6,
    name: "Job Complete — Pending Docs",
    description: "Homeowner walkthrough done; Certificate of Completion signed",
    next: ["7.1"],
    followUps: [{ title: "Submit COC and invoice to carrier", dueInDays: 2, kind: "closeout", priority: "high" }],
  },
  {
    code: "7.1",
    stageId: 7,
    name: "Awaiting Depreciation Release",
    description: "COC and invoice submitted to carrier; weekly follow-up",
    next: ["7.2"],
    ensure: ["invoice"],
    followUps: [{ title: "Weekly depreciation release follow-up", dueInDays: 7, kind: "depreciation", priority: "high" }],
  },
  {
    code: "7.2",
    stageId: 7,
    name: "Invoiced / Paid in Full",
    description: "Deductible and depreciation collected; job costing reconciled",
    next: ["7.3"],
    ensure: ["invoice", "commission"],
    followUps: [{ title: "Reconcile job costing", dueInDays: 3, kind: "finance" }],
  },
  {
    code: "7.3",
    stageId: 7,
    name: "Closed — Won",
    description: "Job archived; all documents filed",
    next: ["8.1"],
    terminal: true,
    setStatus: "won",
    followUps: [{ title: "Register manufacturer warranty", dueInDays: 3, kind: "warranty" }],
  },
  {
    code: "8.1",
    stageId: 8,
    name: "Warranty Registered",
    description: "Manufacturer warranty registered; workmanship warranty delivered",
    next: ["8.2"],
    followUps: [{ title: "Send review and referral request", dueInDays: 7, kind: "review" }],
  },
  {
    code: "8.2",
    stageId: 8,
    name: "Review / Referral Requested",
    description: "Google/Facebook review request sent; referral ask made",
    next: ["8.3"],
    followUps: [{ title: "Move to long-term customer database", dueInDays: 7, kind: "retention" }],
  },
  {
    code: "8.3",
    stageId: 8,
    name: "Customer Database — Long-Term",
    description: "Annual check-in set; storm re-inspection alert enabled",
    next: [],
    terminal: true,
    followUps: [{ title: "Annual customer check-in", dueInDays: 365, kind: "retention" }],
  },
];

export const TASK_BY_CODE: Record<string, WorkflowTask> = Object.fromEntries(
  WORKFLOW_TASKS.map((t) => [t.code, t]),
);

export function tasksForStage(stageId: StageId) {
  return WORKFLOW_TASKS.filter((t) => t.stageId === stageId);
}

export function taskName(code: string | null | undefined) {
  if (!code) return "—";
  return TASK_BY_CODE[code]?.name ?? code;
}

export function stageName(id: number) {
  return STAGES.find((s) => s.id === id)?.name ?? `Stage ${id}`;
}

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "door_to_door", label: "Door-to-Door" },
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "referral", label: "Referral" },
  { value: "insurance", label: "Insurance" },
  { value: "facebook_google", label: "Facebook / Google" },
  { value: "other", label: "Other" },
];

export type PropertyType = Database["public"]["Enums"]["property_type"];
export type RoofType = Database["public"]["Enums"]["roof_type"];

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "residential_single", label: "Single Family" },
  { value: "residential_multi", label: "Multi-Family" },
  { value: "condo", label: "Condo/Townhome" },
  { value: "mobile", label: "Mobile Home" },
  { value: "commercial_flat", label: "Commercial — Flat" },
  { value: "commercial_low", label: "Commercial — Low Slope" },
  { value: "commercial_steep", label: "Commercial — Steep Slope" },
  { value: "industrial", label: "Industrial" },
  { value: "church", label: "Church/Non-Profit" },
  { value: "other", label: "Other" },
];

export const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat_tpo", label: "Flat — TPO" },
  { value: "flat_epdm", label: "Flat — EPDM" },
  { value: "flat_mod", label: "Flat — Modified Bitumen" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "slate", label: "Slate" },
  { value: "other", label: "Other" },
];

export const propertyTypeLabel = (v?: string | null) =>
  PROPERTY_TYPES.find((o) => o.value === v)?.label ?? "—";
export const roofTypeLabel = (v?: string | null) => ROOF_TYPES.find((o) => o.value === v)?.label ?? "—";

export const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access including roles, settings and audit log" },
  { value: "owner_manager", label: "Owner / Manager", description: "Full operational and financial visibility" },
  { value: "sales_rep", label: "Sales Rep", description: "Own leads and jobs; no financial records" },
  { value: "production_manager", label: "Production Manager", description: "All jobs and production; no financials" },
  { value: "office_admin", label: "Office / Admin", description: "All records including invoices and payments" },
  { value: "viewer", label: "Viewer", description: "Read-only access across the CRM" },
];

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "adjuster_report", label: "Adjuster report" },
  { value: "insurance_scope", label: "Insurance scope" },
  { value: "xactimate_estimate", label: "Xactimate estimate" },
  { value: "supplement", label: "Supplement" },
  { value: "contract", label: "Contract" },
  { value: "service_agreement", label: "Service Agreement" },
  { value: "direction_to_pay", label: "Direction to Pay" },
  { value: "permit", label: "Permit" },
  { value: "invoice", label: "Invoice" },
  { value: "certificate_of_completion", label: "Certificate of Completion" },
  { value: "coc", label: "Certificate of Completion" },
  { value: "warranty", label: "Warranty" },
  { value: "other", label: "Other" },
];

export const PAYMENT_KINDS: { value: PaymentKind; label: string }[] = [
  { value: "deductible", label: "Deductible" },
  { value: "acv", label: "ACV payment" },
  { value: "depreciation", label: "Depreciation release" },
  { value: "supplement", label: "Supplement" },
  { value: "other", label: "Other" },
];

export const APPOINTMENT_KINDS: { value: AppointmentKind; label: string }[] = [
  { value: "inspection", label: "Inspection" },
  { value: "adjuster_meeting", label: "Adjuster meeting" },
  { value: "production", label: "Production / install" },
  { value: "walkthrough", label: "Walkthrough" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
];

/** Adds N business days (Mon–Fri) to a date. */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

/** Insurance carriers commonly seen in the Oklahoma market. */
export const CARRIERS = [
  "State Farm",
  "Allstate",
  "Farmers",
  "USAA",
  "Liberty Mutual",
  "Travelers",
  "American Farmers & Ranchers",
  "Oklahoma Farm Bureau",
  "Shelter Insurance",
  "Progressive",
  "Nationwide",
  "Auto-Owners",
  "The Hartford",
  "Chubb",
  "Cincinnati Insurance",
  "ICW Group",
  "Employers Holdings",
  "Sentry Insurance",
  "CSAA",
  "Other",
] as const;

/**
 * The Certificate of Completion can only be issued once production is finished:
 * QC complete (6.4), job complete pending docs (6.5), or anything in closeout / post-job.
 */
export function canIssueCoc(taskCode: string | null | undefined): boolean {
  if (!taskCode) return false;
  const value = Number(taskCode);
  if (Number.isNaN(value)) return false;
  return value >= 6.4;
}
