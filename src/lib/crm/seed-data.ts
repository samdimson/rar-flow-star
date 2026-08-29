/**
 * Static specification for the RAR-T001..RAR-T080 test dataset.
 * Pure data + pure helpers — no database access here.
 */

export type RepKey = "kweke" | "sam" | "jeremy" | "ty" | "erin" | "random";

export const REP_EMAILS: Record<Exclude<RepKey, "random">, string> = {
  kweke: "kba@riseaboveroofingok.com",
  sam: "sdimson@riseaboveroofingok.com",
  jeremy: "jbatton@riseaboveroofingok.com",
  ty: "tmccoy@riseaboveroofingok.com",
  erin: "erider@riseaboveroofingok.com",
};

export type PropertyType =
  | "residential_single"
  | "residential_multi"
  | "commercial_flat"
  | "commercial_steep"
  | "church"
  | "mobile";

export type RoofType = "asphalt_shingle" | "metal" | "flat_tpo" | "flat_mod" | "tile";

export type ActivitySpec = { type: string; subject: string; body?: string | undefined; days?: number | undefined };
export type TaskSpec = { title: string; days?: number; details?: string };
export type ApptSpec = { kind: string; title: string; days: number; attendees?: string; notes?: string };
export type DocSpec = { category: string; file_name: string };
export type PaymentSpec = { kind: string; amount: number; days: number };
export type ClaimSpec = {
  carrier?: string;
  claim_number?: string;
  policy_number?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  adjuster_meeting_days?: number;
  adjuster_report_days?: number;
  reinspection_days?: number;
  date_of_loss_days?: number;
  date_filed_days?: number;
  rcv_amount?: number;
  acv_amount?: number;
  deductible?: number;
  depreciation_amount?: number;
  notes?: string;
};
export type JobSpec = {
  install_days?: number;
  permit_status?: string;
  permit_submitted_days?: number;
  material_order_status?: string;
  material_delivery_days?: number;
  material_ordered_days?: number;
  weather_delay_notes?: string;
  rescheduled_days?: number;
  punch_list?: string | null;
  qc_passed_days?: number;
  coc_signed_days?: number;
  walkthrough_days?: number;
  warranty_registered_days?: number;
  crew_name?: string;
  production_manager?: Exclude<RepKey, "random">;
  notes?: string;
};
export type SupplementSpec = {
  requested_amount?: number;
  approved_amount?: number;
  status?: string;
  scope_description?: string;
  denial_reason?: string;
  submitted_days?: number;
};
export type ChangeOrderSpec = {
  description: string;
  amount: number;
  homeowner_approved?: boolean;
  supplement_submitted?: boolean;
  status?: string;
};
export type InvoiceSpec = {
  invoice_number: string;
  amount: number;
  status: string;
  issued_days?: number;
};

export type LeadSpec = {
  n: number;
  task: string;
  rep?: RepKey;
  source?: string;
  status?: "open" | "won" | "lost";
  notes?: string;
  estimated_value?: number;
  contract_amount?: number;
  contract_signed_days?: number;
  rescission_ends_days?: number;
  inspection_days?: number;
  install_days?: number;
  next_follow_up_days?: number;
  closed_days?: number;
  storm_date?: string;
  financials?: boolean;
  property_type?: PropertyType;
  roof_type?: RoofType;
  claim?: ClaimSpec;
  job?: JobSpec;
  estimate?: { total_amount: number; status?: string; scope_gap_amount?: number; notes?: string };
  activities?: ActivitySpec[];
  tasks?: TaskSpec[];
  appointments?: ApptSpec[];
  documents?: DocSpec[];
  invoice?: InvoiceSpec;
  payments?: PaymentSpec[];
  supplements?: SupplementSpec[];
  changeOrder?: ChangeOrderSpec;
  clawbackMilestone1?: boolean;
};

/* ------------------------------------------------------------------ */
/* Customers & properties                                              */
/* ------------------------------------------------------------------ */

const FIRST = [
  "James", "Mary", "Robert", "Patricia", "Michael", "Jennifer", "William", "Linda", "David", "Barbara",
  "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Chris", "Nancy",
  "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Carol",
];

const LAST = [
  "Hensley", "Whitaker", "Kirkpatrick", "Bledsoe", "Ramsey", "Colwell", "Standingbear", "Proctor",
  "Yandell", "Vanhorn", "Bearpaw", "Tallchief", "Gilcrease", "Threadgill", "Musgrave", "Rutherford",
  "Cordova", "Redcorn", "Beavers", "Stoneking", "Alcorn", "Ferrell", "Hutchings", "Blaylock",
  "Winship", "Pettigrew", "Kingfisher", "Roughface", "Sowders", "Vandiver", "Tahsuda", "Mowdy",
  "Escobedo", "Villareal", "Nguyen", "Trammell", "Doerner", "Sisemore", "Kingery", "Lackmeyer",
];

const STREETS = [
  "Meadow Lark Ln", "Quail Creek Rd", "Persimmon Dr", "Redbud Trail", "Sooner Rd", "Coltrane Rd",
  "Boulder Creek Blvd", "Hefner Village Way", "Pine Hollow Ct", "Sunset Ridge Dr", "Cimarron Trail",
  "Blackjack Oak Ln", "Prairie Wind Dr", "Stillwater Bend", "Rockwell Ave", "Council Rd",
  "Portland Ave", "Britton Rd", "Danforth Rd", "Covell Rd", "Post Oak Ln", "Cattle Drive",
  "Wheatland Rd", "Silver Spur Ct", "Buffalo Grass Dr", "Turkey Creek Rd", "Deer Run Dr",
  "Hickory Hills Blvd", "Mesquite Ln", "Twin Lakes Dr", "Willow Bend Ct", "Antler Ridge Rd",
  "Cross Timbers Dr", "Chisholm Trail", "Shadow Wood Ln", "Bermuda Dunes Ct", "Pecan Grove Rd",
  "Broadway Ext", "Sara Rd", "Morgan Rd",
];

const CITIES: { city: string; zip: string }[] = [
  { city: "Oklahoma City", zip: "73142" },
  { city: "Oklahoma City", zip: "73120" },
  { city: "Edmond", zip: "73013" },
  { city: "Edmond", zip: "73034" },
  { city: "Yukon", zip: "73099" },
  { city: "Mustang", zip: "73064" },
  { city: "Moore", zip: "73160" },
  { city: "Norman", zip: "73072" },
  { city: "Midwest City", zip: "73110" },
  { city: "Del City", zip: "73115" },
  { city: "Choctaw", zip: "73020" },
  { city: "Guthrie", zip: "73044" },
  { city: "Piedmont", zip: "73078" },
  { city: "Tuttle", zip: "73089" },
];

const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com"];

/** Deterministic property-type mix roughly matching the requested distribution. */
const TYPE_MIX: PropertyType[] = [
  ...Array<PropertyType>(12).fill("residential_single"),
  "residential_multi",
  "commercial_flat",
  "commercial_steep",
  "residential_single",
  "residential_single",
  "church",
  "residential_single",
  "mobile",
];

const ROOF_MIX: RoofType[] = [
  "asphalt_shingle", "asphalt_shingle", "asphalt_shingle", "metal", "asphalt_shingle",
  "asphalt_shingle", "flat_tpo", "asphalt_shingle", "asphalt_shingle", "tile",
  "asphalt_shingle", "metal", "asphalt_shingle", "flat_mod", "asphalt_shingle",
  "asphalt_shingle", "flat_tpo", "asphalt_shingle", "metal", "asphalt_shingle",
];

export type SeedPerson = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  property_type: PropertyType;
  roof_type: RoofType;
  roof_age: number;
};

export function personFor(index: number, overrides?: { property_type?: PropertyType; roof_type?: RoofType }): SeedPerson {
  const first = FIRST[index % FIRST.length]!;
  const last = LAST[(index * 7 + 3) % LAST.length]!;
  const street = STREETS[(index * 11 + 5) % STREETS.length]!;
  const place = CITIES[(index * 5 + 2) % CITIES.length]!;
  const house = 1200 + index * 37;
  const areaCode = index % 4 === 0 ? "918" : "405";
  const phone = `(${areaCode}) ${String(200 + (index * 3) % 700)}-${String(1000 + (index * 137) % 9000)}`;
  return {
    first_name: first,
    last_name: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@${EMAIL_DOMAINS[index % 3]}`,
    phone,
    address_line1: `${house} ${street}`,
    city: place.city,
    state: "OK",
    postal_code: place.zip,
    property_type: overrides?.property_type ?? TYPE_MIX[index % TYPE_MIX.length]!,
    roof_type: overrides?.roof_type ?? ROOF_MIX[index % ROOF_MIX.length]!,
    roof_age: 4 + (index * 3) % 17,
  };
}

/* ------------------------------------------------------------------ */
/* Materials + labor line items                                        */
/* ------------------------------------------------------------------ */

export type LineItem = { item: string; quantity: number; unit: string; unit_price: number; source: string };

export const squaresFor = (contract: number) => Math.max(10, Math.round(contract / 450));

export function lineItemsFor(contract: number): LineItem[] {
  const s = squaresFor(contract);
  const mat = (item: string, quantity: number, unit: string, unit_price: number): LineItem => ({
    item,
    quantity: Math.max(1, Math.round(quantity)),
    unit,
    unit_price,
    source: "material",
  });
  return [
    mat("Architectural shingles", s, "SQ", 120.95),
    mat("Ridge cap shingles", s / 12, "SQ", 77.75),
    mat("Starter course", s / 9, "BD", 53),
    mat("Synthetic underlayment", s / 9, "RL", 65),
    mat("Moisture guard / ice & water", 2, "RL", 75),
    mat("Roofing nails", s / 14, "BX", 45.94),
    mat("OSB decking", s / 3.5, "SH", 10),
    mat("Drip edge", s * 0.7, "PC", 8.89),
    mat("Turbine vents", 2, "EA", 101.39),
    mat("Pipe boots", 3, "EA", 9.99),
    mat("Roof caulk", 2, "TB", 8.5),
    { item: "Tear-Off & Replace labor", quantity: s, unit: "SQ", unit_price: 70, source: "labor" },
  ];
}

/* ------------------------------------------------------------------ */
/* Lead specifications                                                 */
/* ------------------------------------------------------------------ */

const a = (type: string, subject: string, body?: string, days?: number): ActivitySpec => ({ type, subject, body, days });

export const LEAD_SPECS: LeadSpec[] = [
  // ---------------- Stage 1 — Lead ----------------
  { n: 1, task: "1.1", rep: "jeremy", source: "door_to_door", notes: "Stopped at door, homeowner interested" },
  {
    n: 2, task: "1.1", rep: "erin", source: "referral", notes: "Referred by neighbor",
    activities: [a("note", "Initial contact note", "Homeowner referred by next-door neighbor; wants an inspection quote.")],
  },
  {
    n: 3, task: "1.2", rep: "ty", source: "door_to_door",
    activities: [a("call", "First attempt - no answer", undefined, -2), a("call", "Left voicemail", undefined, -1)],
  },
  { n: 4, task: "1.2", rep: "jeremy", source: "website", tasks: [{ title: "Follow up call", days: 1 }] },
  {
    n: 5, task: "1.3", rep: "erin", source: "door_to_door", inspection_days: 3,
    appointments: [{ kind: "inspection", title: "Roof inspection", days: 3 }],
    tasks: [{ title: "Prep inspection materials", days: 2 }],
  },
  {
    n: 6, task: "1.3", rep: "ty", source: "referral", inspection_days: 5,
    appointments: [{ kind: "inspection", title: "Roof inspection", days: 5, attendees: "homeowner spouse" }],
  },
  {
    n: 7, task: "1.4", rep: "jeremy", source: "door_to_door", next_follow_up_days: 14,
    activities: [a("note", "Homeowner not ready — follow up in 2 weeks")],
  },
  {
    n: 8, task: "1.4", rep: "erin", source: "website", next_follow_up_days: 14,
    tasks: [{ title: "Bi-weekly follow-up SMS", days: 14 }, { title: "Bi-weekly follow-up SMS", days: 28 }],
  },

  // ---------------- Stage 2 — Inspection ----------------
  {
    n: 9, task: "2.1", rep: "ty", source: "door_to_door", inspection_days: -5,
    appointments: [{ kind: "inspection", title: "Roof inspection", days: -5 }],
    activities: [a("note", "Inspection findings", 'Hail damage confirmed 1" diameter hits on all slopes, soft metal test positive', -5)],
  },
  {
    n: 10, task: "2.1", rep: "jeremy", source: "referral", inspection_days: -3,
    appointments: [{ kind: "inspection", title: "Roof inspection", days: -3 }],
    activities: [
      a("note", "Inspection notes", "All slopes inspected; 14 hits per test square on the south slope.", -3),
      a("document", "Photos noted", "42 damage photos captured and uploaded to the job file.", -3),
      a("note", "Damage summary", "Full replacement recommended — hail bruising plus wind creasing.", -2),
    ],
  },
  {
    n: 11, task: "2.2", rep: "erin", source: "door_to_door", status: "lost",
    activities: [a("note", "Closed — no claim", "Cosmetic damage only, below claim threshold. Advised homeowner.", -1)],
  },
  {
    n: 12, task: "2.2", rep: "ty", source: "referral", status: "lost",
    activities: [a("note", "Closed — no claim", "Pre-existing damage, not storm related per inspection.", -1)],
  },
  {
    n: 13, task: "2.3", rep: "jeremy", source: "door_to_door", estimated_value: 18500,
    activities: [a("note", "Opportunity created", "Full replacement approved — hail and wind damage qualifies.")],
  },
  {
    n: 14, task: "2.3", rep: "erin", source: "referral", estimated_value: 24000,
    property_type: "commercial_steep",
    activities: [a("note", "Opportunity created", "Commercial property qualifies for full replacement.")],
    tasks: [{ title: "Schedule claim filing call with homeowner", days: 2 }],
  },

  // ---------------- Stage 3 — Claim filing ----------------
  {
    n: 15, task: "3.1", rep: "ty",
    claim: { carrier: "State Farm", claim_number: "SF-2026-115001", policy_number: "SF-OK-7745210", date_of_loss_days: -45, date_filed_days: -2 },
  },
  {
    n: 16, task: "3.1", rep: "jeremy",
    claim: { carrier: "Allstate", claim_number: "ALL-2026-887234", policy_number: "ALL-OK-4421109", date_of_loss_days: -60, date_filed_days: -3 },
  },
  {
    n: 17, task: "3.2", rep: "erin",
    claim: {
      carrier: "Farmers", claim_number: "FAR-2026-334521", adjuster_name: "Linda Torres",
      adjuster_phone: "(405) 711-2200", adjuster_email: "ltorres@farmers.com", adjuster_meeting_days: 4,
    },
    appointments: [{ kind: "adjuster_meeting", title: "Adjuster meeting — Farmers", days: 4, attendees: "Linda Torres" }],
  },
  {
    n: 18, task: "3.2", rep: "ty",
    claim: { carrier: "USAA", claim_number: "USAA-2026-991023", adjuster_name: "Mark Reynolds", adjuster_meeting_days: 2 },
    appointments: [{ kind: "adjuster_meeting", title: "Adjuster meeting — USAA", days: 2, attendees: "Mark Reynolds" }],
    tasks: [{ title: "Prepare comparison photos for adjuster meeting", days: 1 }],
  },
  {
    n: 19, task: "3.3", rep: "jeremy",
    claim: { carrier: "State Farm", claim_number: "SF-2026-115044", adjuster_name: "Dale Pruitt", adjuster_meeting_days: -2 },
    appointments: [{ kind: "adjuster_meeting", title: "Adjuster meeting — State Farm", days: -2 }],
    activities: [a("meeting", "Adjuster meeting complete", "Adjuster walked all slopes. Positive interaction. Approved 28 squares.", -2)],
  },
  {
    n: 20, task: "3.3", rep: "erin",
    claim: { carrier: "Progressive", claim_number: "PRG-2026-220118", adjuster_name: "Sheila Combs", adjuster_meeting_days: -1 },
    appointments: [{ kind: "adjuster_meeting", title: "Adjuster meeting — Progressive", days: -1 }],
    activities: [a("meeting", "Adjuster meeting complete", "Adjuster initially reluctant, escalated to supervisor on site. Full approval expected.", -1)],
  },
  {
    n: 21, task: "3.4", rep: "ty",
    claim: {
      carrier: "Shelter", claim_number: "SHL-2026-556677", rcv_amount: 21400, acv_amount: 15800,
      deductible: 1000, depreciation_amount: 5600, adjuster_report_days: -2,
    },
    activities: [a("note", "Full approval", "Adjuster report received — full scope approved.", -2)],
  },
  {
    n: 22, task: "3.4", rep: "jeremy", property_type: "commercial_flat", roof_type: "flat_tpo",
    claim: {
      carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-778812", rcv_amount: 34500, acv_amount: 25000,
      deductible: 2500, depreciation_amount: 9500, adjuster_report_days: -1,
    },
  },
  {
    n: 23, task: "3.5", rep: "erin",
    claim: { carrier: "Allstate", claim_number: "ALL-2026-887999", notes: "Denied — appealing with Xactimate support." },
    supplements: [{ requested_amount: 6400, status: "submitted", scope_description: "Full scope resubmission with storm date verification", submitted_days: -1 }],
    activities: [a("note", "Claim denied — supplement submitted", "Carrier denied citing pre-existing. Resubmitting with Xactimate codes and storm date verification.", -1)],
  },
  {
    n: 24, task: "3.5", rep: "ty",
    claim: { carrier: "Farmers", claim_number: "FAR-2026-334888", rcv_amount: 12800, acv_amount: 9200, deductible: 1000 },
    supplements: [{ requested_amount: 2350, status: "submitted", scope_description: "Drip edge and ice & water shield omitted from adjuster scope", submitted_days: -2 }],
    activities: [a("note", "Partial approval", "Approved for shingles only, missing drip edge and ice shield. Supplement submitted.", -2)],
  },
  {
    n: 25, task: "3.6", rep: "jeremy",
    claim: { carrier: "State Farm", claim_number: "SF-2026-115777", reinspection_days: 7 },
    appointments: [{ kind: "adjuster_meeting", title: "Reinspection — 2nd adjuster", days: 7 }],
  },
  {
    n: 26, task: "3.6", rep: "erin",
    claim: { carrier: "USAA", claim_number: "USAA-2026-991777", reinspection_days: -2 },
    appointments: [{ kind: "adjuster_meeting", title: "Reinspection — 2nd adjuster", days: -2 }],
    activities: [a("meeting", "Reinspection complete", "Second adjuster confirmed full damage. Scope updated to include all missing items.", -2)],
  },

  // ---------------- Stage 4 — Estimate ----------------
  {
    n: 27, task: "4.1", rep: "ty", estimated_value: 19800,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-556000", rcv_amount: 19800, acv_amount: 14200, deductible: 1000, depreciation_amount: 5600 },
    estimate: { total_amount: 19800, status: "draft" },
  },
  {
    n: 28, task: "4.1", rep: "jeremy", estimated_value: 28500, property_type: "commercial_steep",
    claim: { carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-778000", rcv_amount: 28500, acv_amount: 20100, deductible: 2500, depreciation_amount: 8400 },
    estimate: { total_amount: 28500, status: "sent" },
    activities: [a("note", "Estimate reviewed", "Estimate matches adjuster scope within $200.")],
  },
  {
    n: 29, task: "4.2", rep: "erin",
    claim: { carrier: "Farmers", claim_number: "FAR-2026-335100", rcv_amount: 17600, acv_amount: 12900, deductible: 1000 },
    estimate: { total_amount: 20800, status: "draft", scope_gap_amount: 3200 },
    supplements: [{ requested_amount: 3200, status: "submitted", scope_description: "Code-required drip edge and ice & water shield", submitted_days: -1 }],
    activities: [a("note", "Scope gap identified", "Gap identified: code-required drip edge and ice shield not in adjuster scope. Supplement submitted.", -1)],
  },
  {
    n: 30, task: "4.2", rep: "ty",
    claim: { carrier: "State Farm", claim_number: "SF-2026-116100", rcv_amount: 16400, acv_amount: 11800, deductible: 1000 },
    estimate: { total_amount: 18200, status: "draft", scope_gap_amount: 1800 },
    supplements: [{ requested_amount: 1800, status: "submitted", scope_description: "Starter course and ridge cap upgrade", submitted_days: -3 }],
    activities: [a("note", "Supplement pending", "Supplement for starter course and ridge cap upgrade approved verbally. Awaiting written confirmation.", -1)],
  },

  // ---------------- Stage 5 — Contract ----------------
  {
    n: 31, task: "5.1", rep: "jeremy", contract_amount: 21200, contract_signed_days: -1, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-117001", rcv_amount: 21200, acv_amount: 15400, deductible: 1000, depreciation_amount: 5800 },
  },
  {
    n: 32, task: "5.1", rep: "erin", contract_amount: 18900, contract_signed_days: 0, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-336001", rcv_amount: 18900, acv_amount: 13500, deductible: 1000, depreciation_amount: 5400 },
    tasks: [{ title: "Walk homeowner through contract details", days: 1 }],
    notes: "First-time homeowner — extra hand-holding through the process.",
  },
  {
    n: 33, task: "5.2", rep: "ty", contract_amount: 24500, contract_signed_days: -1, rescission_ends_days: 2, financials: true,
    claim: { carrier: "USAA", claim_number: "USAA-2026-992001", rcv_amount: 24500, acv_amount: 17900, deductible: 1000, depreciation_amount: 6600 },
    tasks: [{ title: "Confirm rescission cleared", days: 2 }],
  },
  {
    n: 34, task: "5.2", rep: "jeremy", contract_amount: 31000, rescission_ends_days: 1, contract_signed_days: -2, financials: true,
    property_type: "commercial_flat", roof_type: "flat_tpo",
    claim: { carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-779001", rcv_amount: 31000, acv_amount: 22400, deductible: 2500, depreciation_amount: 8600 },
    activities: [a("note", "HOA approval required", "HOA approval required before production can begin.")],
  },
  {
    n: 35, task: "5.3", rep: "erin", contract_amount: 19200, contract_signed_days: -4, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-557001", rcv_amount: 19200, acv_amount: 13800, deductible: 1000, depreciation_amount: 5400 },
    job: { production_manager: "sam" },
  },
  {
    n: 36, task: "5.3", rep: "ty", contract_amount: 22800, contract_signed_days: -5, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-888001", rcv_amount: 22800, acv_amount: 16600, deductible: 1000, depreciation_amount: 6200 },
    job: {},
    tasks: [{ title: "Verify HOA color approval", days: 2 }],
  },
  {
    n: 37, task: "5.4", rep: "jeremy", contract_amount: 20400, contract_signed_days: -8, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-117400", rcv_amount: 20400, acv_amount: 14900, deductible: 1000, depreciation_amount: 5500 },
    job: { permit_status: "submitted", permit_submitted_days: -5 },
    tasks: [{ title: "Check permit status with OKC Planning", days: 1 }],
  },
  {
    n: 38, task: "5.4", rep: "erin", contract_amount: 17800, contract_signed_days: -9, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-336400", rcv_amount: 17800, acv_amount: 12800, deductible: 1000, depreciation_amount: 5000 },
    job: { permit_status: "submitted", permit_submitted_days: -4, notes: "Permit submitted to Moore, OK building department." },
    tasks: [{ title: "Permit follow-up Moore Building Dept", days: 2 }],
  },
  {
    n: 39, task: "5.5", rep: "ty", contract_amount: 23600, contract_signed_days: -11, financials: true,
    claim: { carrier: "USAA", claim_number: "USAA-2026-992500", rcv_amount: 23600, acv_amount: 17000, deductible: 1000, depreciation_amount: 6600 },
    job: { permit_status: "approved", permit_submitted_days: -9, material_order_status: "ordered", material_ordered_days: -2, material_delivery_days: 3 },
    tasks: [{ title: "Confirm delivery with ABC Supply", days: 2 }],
  },
  {
    n: 40, task: "5.5", rep: "jeremy", contract_amount: 25100, contract_signed_days: -12, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-557500", rcv_amount: 25100, acv_amount: 18200, deductible: 1000, depreciation_amount: 6900 },
    job: { permit_status: "approved", material_order_status: "ordered", material_ordered_days: -1, material_delivery_days: 4, notes: "Materials ordered through Willards Roofing Supply." },
    tasks: [{ title: "Confirm shingle color match with homeowner before delivery", days: 1 }],
  },

  // ---------------- Stage 6 — Production ----------------
  {
    n: 41, task: "6.1", rep: "erin", contract_amount: 21900, contract_signed_days: -14, install_days: 0, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-118001", rcv_amount: 21900, acv_amount: 15900, deductible: 1000, depreciation_amount: 6000 },
    job: { install_days: 0, permit_status: "approved", material_order_status: "delivered", crew_name: "Crew A" },
    activities: [a("note", "Production day 1", "Day 1: Crew of 4 on site. Tear-off 28SQ complete. 6 sheets decking replaced. Underlayment installed.")],
  },
  {
    n: 42, task: "6.1", rep: "ty", contract_amount: 20300, contract_signed_days: -15, install_days: -1, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-888500", rcv_amount: 20300, acv_amount: 14700, deductible: 1000, depreciation_amount: 5600 },
    job: { install_days: -1, permit_status: "approved", material_order_status: "delivered", crew_name: "Crew B" },
    activities: [
      a("note", "Production day 1", "Tear-off complete on all slopes; decking inspected, 4 sheets replaced.", -1),
      a("note", "Production day 2", "Shingle install 70% complete. Ridge vent set. Cleanup pass with magnet.", 0),
    ],
  },
  {
    n: 43, task: "6.2", rep: "jeremy", contract_amount: 22400, contract_signed_days: -16, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-337001", rcv_amount: 22400, acv_amount: 16200, deductible: 1000, depreciation_amount: 6200 },
    job: {
      install_days: -1, permit_status: "approved", material_order_status: "delivered", rescheduled_days: 1,
      weather_delay_notes: "High winds halted install — 40mph gusts. OSHA safety protocol. Rescheduled for tomorrow.",
    },
    appointments: [{ kind: "production", title: "Weather delay — rescheduled install", days: 1, notes: "High winds; install resumes." }],
  },
  {
    n: 44, task: "6.2", rep: "erin", contract_amount: 18700, contract_signed_days: -17, financials: true,
    claim: { carrier: "USAA", claim_number: "USAA-2026-993001", rcv_amount: 18700, acv_amount: 13400, deductible: 1000, depreciation_amount: 5300 },
    job: { install_days: -2, permit_status: "approved", material_order_status: "delivered", rescheduled_days: 2, weather_delay_notes: "Heavy rain — dry-in complete, install rescheduled." },
    appointments: [{ kind: "production", title: "Rain delay — rescheduled install", days: 2 }],
  },
  {
    n: 45, task: "6.3", rep: "ty", contract_amount: 23200, contract_signed_days: -18, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-558001", rcv_amount: 23200, acv_amount: 16800, deductible: 1000, depreciation_amount: 6400 },
    job: { install_days: -2, permit_status: "approved", material_order_status: "delivered" },
    changeOrder: { description: "Discovered rotted fascia board 40LF during tear-off", amount: 320, homeowner_approved: true, supplement_submitted: true, status: "approved" },
  },
  {
    n: 46, task: "6.3", rep: "jeremy", contract_amount: 26400, contract_signed_days: -19, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-118500", rcv_amount: 26400, acv_amount: 19100, deductible: 1000, depreciation_amount: 7300 },
    job: { install_days: -1, permit_status: "approved", material_order_status: "delivered" },
    changeOrder: { description: "Additional 14 sheets OSB decking — moisture damage found under valley", amount: 1120, homeowner_approved: true, status: "pending" },
  },
  {
    n: 47, task: "6.4", rep: "erin", contract_amount: 21700, contract_signed_days: -21, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-889001", rcv_amount: 21700, acv_amount: 15700, deductible: 1000, depreciation_amount: 6000 },
    job: { install_days: -3, permit_status: "approved", material_order_status: "delivered", qc_passed_days: -1, punch_list: "Touch up ridge cap on north slope — 3 caps" },
  },
  {
    n: 48, task: "6.4", rep: "ty", contract_amount: 19400, contract_signed_days: -22, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-337500", rcv_amount: 19400, acv_amount: 14000, deductible: 1000, depreciation_amount: 5400 },
    job: { install_days: -4, permit_status: "approved", material_order_status: "delivered", qc_passed_days: 0, punch_list: null },
  },
  {
    n: 49, task: "6.5", rep: "jeremy", contract_amount: 24800, contract_signed_days: -24, financials: true,
    claim: { carrier: "USAA", claim_number: "USAA-2026-993500", rcv_amount: 24800, acv_amount: 17900, deductible: 1000, depreciation_amount: 6900 },
    job: { install_days: -5, permit_status: "approved", material_order_status: "delivered", qc_passed_days: -3, coc_signed_days: -2, walkthrough_days: -2 },
    appointments: [{ kind: "walkthrough", title: "Homeowner walkthrough", days: -2 }],
    activities: [a("note", "Walkthrough complete", "Homeowner thrilled. Mentioned neighbor also has storm damage.", -2)],
  },
  {
    n: 50, task: "6.5", rep: "erin", contract_amount: 22600, contract_signed_days: -25, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-558500", rcv_amount: 22600, acv_amount: 16300, deductible: 1000, depreciation_amount: 6300 },
    job: { install_days: -6, permit_status: "approved", material_order_status: "delivered", qc_passed_days: -2, coc_signed_days: -1 },
    activities: [a("note", "Post-job follow-up", "Warranty registered. Google review requested.", -1)],
  },

  // ---------------- Stage 7 — Insurance closeout ----------------
  {
    n: 51, task: "7.1", rep: "ty", contract_amount: 21400, contract_signed_days: -30, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-119001", rcv_amount: 21400, acv_amount: 15800, deductible: 1000, depreciation_amount: 5600 },
    job: { install_days: -10, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -4, coc_emailed: true } as JobSpec,
    invoice: { invoice_number: "RAR-2026-0051", amount: 21400, status: "sent", issued_days: -3 },
    tasks: [{ title: "Follow up carrier on depreciation release", days: 3 }],
  },
  {
    n: 52, task: "7.1", rep: "jeremy", contract_amount: 23900, contract_signed_days: -32, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-889500", rcv_amount: 23900, acv_amount: 17300, deductible: 1000, depreciation_amount: 6600 },
    job: { install_days: -12, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -6 },
    invoice: { invoice_number: "RAR-2026-0052", amount: 23900, status: "sent", issued_days: -6 },
    tasks: [
      { title: "Carrier follow-up #1 — depreciation", days: 7 },
      { title: "Carrier follow-up #2 — depreciation", days: 14 },
      { title: "Carrier follow-up #3 — escalate to supervisor", days: 21 },
    ],
  },
  {
    n: 53, task: "7.2", rep: "erin", contract_amount: 22400, contract_signed_days: -40, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-338001", rcv_amount: 22400, acv_amount: 15800, deductible: 1000, depreciation_amount: 5600 },
    job: { install_days: -20, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -12 },
    invoice: { invoice_number: "RAR-2026-0053", amount: 22400, status: "paid", issued_days: -32 },
    payments: [
      { kind: "deductible", amount: 1000, days: -30 },
      { kind: "acv", amount: 15800, days: -15 },
      { kind: "depreciation", amount: 5600, days: -2 },
    ],
  },
  {
    n: 54, task: "7.2", rep: "ty", contract_amount: 34500, contract_signed_days: -42, financials: true,
    claim: { carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-780001", rcv_amount: 34500, acv_amount: 25000, deductible: 2500, depreciation_amount: 7000 },
    job: { install_days: -22, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -14 },
    invoice: { invoice_number: "RAR-2026-0054", amount: 34500, status: "sent", issued_days: -25 },
    payments: [
      { kind: "deductible", amount: 2500, days: -20 },
      { kind: "acv", amount: 25000, days: -10 },
    ],
  },
  {
    n: 55, task: "7.3", rep: "jeremy", status: "won", closed_days: -5, contract_amount: 26800, contract_signed_days: -50, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-119500", rcv_amount: 26800, acv_amount: 19300, deductible: 1000, depreciation_amount: 6500 },
    job: { install_days: -28, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -20 },
    invoice: { invoice_number: "RAR-2026-0055", amount: 26800, status: "paid", issued_days: -18 },
    payments: [
      { kind: "deductible", amount: 1000, days: -18 },
      { kind: "acv", amount: 19300, days: -12 },
      { kind: "depreciation", amount: 6500, days: -6 },
    ],
    activities: [a("note", "Job closed", "Job closed. Full payment received. Commission calculation complete.", -5)],
  },
  {
    n: 56, task: "7.3", rep: "erin", status: "won", closed_days: -3, contract_amount: 20900, contract_signed_days: -52, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-890001", rcv_amount: 20900, acv_amount: 15100, deductible: 1000, depreciation_amount: 5800, notes: "Depreciation denied — reason code NC-12." },
    job: { install_days: -30, permit_status: "approved", material_order_status: "delivered", coc_signed_days: -22 },
    invoice: { invoice_number: "RAR-2026-0056", amount: 20900, status: "sent", issued_days: -20 },
    payments: [
      { kind: "deductible", amount: 1000, days: -20 },
      { kind: "acv", amount: 15100, days: -14 },
    ],
    activities: [a("note", "Depreciation denied (NC-12)", "Carrier refused depreciation release citing policy non-compliance. Written to legal.", -3)],
  },

  // ---------------- Stage 8 — Post-job ----------------
  {
    n: 57, task: "8.1", rep: "ty", status: "won", closed_days: -12, contract_amount: 21100, contract_signed_days: -60, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-338500", rcv_amount: 21100, acv_amount: 15200, deductible: 1000, depreciation_amount: 5900 },
    job: { install_days: -35, coc_signed_days: -25, warranty_registered_days: -10, permit_status: "approved", material_order_status: "delivered" },
    activities: [a("note", "Warranty registered", "GAF Golden Pledge warranty registered. Workmanship warranty delivered to homeowner.", -10)],
  },
  {
    n: 58, task: "8.1", rep: "jeremy", status: "won", closed_days: -14, contract_amount: 19600, contract_signed_days: -62, financials: true,
    claim: { carrier: "USAA", claim_number: "USAA-2026-994001", rcv_amount: 19600, acv_amount: 14100, deductible: 1000, depreciation_amount: 5500 },
    job: { install_days: -38, coc_signed_days: -28, warranty_registered_days: -12, permit_status: "approved", material_order_status: "delivered" },
    documents: [{ category: "warranty", file_name: "Warranty Certificate.pdf" }],
  },
  {
    n: 59, task: "8.2", rep: "erin", status: "won", closed_days: -18, contract_amount: 23300, contract_signed_days: -70, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-559001", rcv_amount: 23300, acv_amount: 16800, deductible: 1000, depreciation_amount: 6500 },
    job: { install_days: -45, coc_signed_days: -35, warranty_registered_days: -20, permit_status: "approved", material_order_status: "delivered" },
    tasks: [{ title: "Send review request text to homeowner", days: 1 }],
    activities: [a("note", "Review requested", "Google review requested. 5-star review received same day!", -2)],
  },
  {
    n: 60, task: "8.3", rep: "ty", status: "won", closed_days: -40, contract_amount: 20200, contract_signed_days: -95, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-120001", rcv_amount: 20200, acv_amount: 14600, deductible: 1000, depreciation_amount: 5600 },
    job: { install_days: -70, coc_signed_days: -60, warranty_registered_days: -50, permit_status: "approved", material_order_status: "delivered" },
    activities: [a("note", "Annual check-in", "Annual check-in scheduled. Homeowner referred 3 neighbors in same subdivision.", -5)],
  },

  // ---------------- Branch & edge cases ----------------
  {
    n: 61, task: "5.2", rep: "erin", status: "lost", contract_amount: 18400, contract_signed_days: -4, rescission_ends_days: -1,
    notes: "Cancellation reason code NC-11 — rescission cancellation.",
    activities: [a("note", "Cancelled in rescission window (NC-11)", "Homeowner cancelled within 3-day window citing job loss. No penalty per contract.", -1)],
  },
  {
    n: 62, task: "5.4", rep: "ty", status: "lost", contract_amount: 22000, contract_signed_days: -12, financials: true,
    notes: "Cancellation reason code NC-06 — cancelled after rescission window.",
    claim: { carrier: "Farmers", claim_number: "FAR-2026-339001", rcv_amount: 22000, acv_amount: 15900, deductible: 1000 },
    job: { permit_status: "submitted", permit_submitted_days: -6 },
    clawbackMilestone1: true,
    activities: [a("note", "Post-contract cancellation (NC-06)", "Homeowner cancelled after the rescission window. Milestone 1 clawed back.", -1)],
  },
  {
    n: 63, task: "4.1", rep: "erin", contract_amount: 15000, contract_signed_days: -2, financials: true,
    notes: "Cash job — homeowner paying out of pocket.",
    estimate: { total_amount: 15000, status: "sent", notes: "Cash job — no insurance claim." },
  },
  {
    n: 64, task: "3.5", rep: "jeremy",
    claim: { carrier: "Allstate", claim_number: "ALL-2026-890500", rcv_amount: 14200, acv_amount: 10100, deductible: 1000 },
    supplements: [
      { requested_amount: 3100, status: "denied", scope_description: "First supplement — omitted code items", denial_reason: "Carrier cites pre-existing wear", submitted_days: -12 },
      { requested_amount: 3100, status: "submitted", scope_description: "Second supplement — resubmitted with engineer letter", submitted_days: -3 },
    ],
    activities: [
      a("note", "Supplement #1 denied", "Carrier denied first supplement citing pre-existing wear.", -8),
      a("note", "Supplement #2 submitted", "Resubmitted with engineering report and storm verification.", -3),
    ],
  },
  {
    n: 65, task: "7.3", rep: "kweke", status: "won", closed_days: -2, contract_amount: 44000, contract_signed_days: -60, financials: true,
    property_type: "commercial_flat", roof_type: "flat_tpo",
    claim: { carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-781001", rcv_amount: 41500, acv_amount: 32000, deductible: 3000, depreciation_amount: 9500 },
    job: { install_days: -30, coc_signed_days: -20, permit_status: "approved", material_order_status: "delivered" },
    invoice: { invoice_number: "RAR-2026-0065", amount: 41500, status: "paid", issued_days: -18 },
    payments: [
      { kind: "deductible", amount: 3000, days: -18 },
      { kind: "acv", amount: 32000, days: -12 },
      { kind: "depreciation", amount: 6500, days: -4 },
    ],
  },
  {
    n: 66, task: "6.5", rep: "sam", contract_amount: 38000, contract_signed_days: -35, financials: true,
    property_type: "church", roof_type: "flat_mod",
    claim: { carrier: "Church Mutual", claim_number: "CM-2026-441001", rcv_amount: 38000, acv_amount: 27500, deductible: 2500, depreciation_amount: 10500 },
    job: { install_days: -8, coc_signed_days: -2, qc_passed_days: -4, permit_status: "approved", material_order_status: "delivered" },
  },
  {
    n: 67, task: "5.1", rep: "jeremy", contract_amount: 67000, contract_signed_days: -3, estimated_value: 67000, financials: true,
    property_type: "residential_multi",
    notes: "8-unit multi-family complex — phased installation.",
    claim: { carrier: "State Farm", claim_number: "SF-2026-121001", rcv_amount: 67000, acv_amount: 49000, deductible: 5000, depreciation_amount: 18000 },
  },
  {
    n: 68, task: "2.1", rep: "erin", property_type: "mobile", roof_type: "metal", inspection_days: -2,
    notes: "Verify mobile home rider on policy before proceeding.",
    appointments: [{ kind: "inspection", title: "Roof inspection", days: -2 }],
  },
  {
    n: 69, task: "7.2", rep: "ty", contract_amount: 89500, contract_signed_days: -70, financials: true,
    property_type: "commercial_steep",
    claim: { carrier: "Oklahoma Farm Bureau", claim_number: "OFB-2026-782001", rcv_amount: 87000, acv_amount: 65000, deductible: 5000, depreciation_amount: 22000 },
    job: { install_days: -30, coc_signed_days: -20, permit_status: "approved", material_order_status: "delivered" },
    invoice: { invoice_number: "RAR-2026-0069", amount: 87000, status: "sent", issued_days: -16 },
    payments: [
      { kind: "deductible", amount: 5000, days: -16 },
      { kind: "acv", amount: 65000, days: -9 },
    ],
    supplements: [
      { requested_amount: 4200, approved_amount: 4200, status: "approved", scope_description: "Code upgrades — parapet flashing", submitted_days: -40 },
      { requested_amount: 2600, approved_amount: 2600, status: "approved", scope_description: "Additional decking", submitted_days: -34 },
      { requested_amount: 1600, approved_amount: 1600, status: "approved", scope_description: "Gutter and downspout replacement", submitted_days: -28 },
    ],
  },
  {
    n: 70, task: "3.5", rep: "jeremy",
    claim: { carrier: "Allstate", claim_number: "ALL-2026-891001", rcv_amount: 15400, acv_amount: 10800, deductible: 1000, notes: "Dispute — public adjuster retained." },
    supplements: [
      { requested_amount: 5200, status: "denied", scope_description: "Attempt 1 — full scope", submitted_days: -30 },
      { requested_amount: 5200, status: "denied", scope_description: "Attempt 2 — with engineer report", submitted_days: -20 },
      { requested_amount: 5200, status: "submitted", scope_description: "Attempt 3 — public adjuster filing", submitted_days: -5 },
    ],
    activities: [a("note", "Carrier dispute", "Retained public adjuster. Dispute letter sent to carrier legal dept.", -4)],
  },
  {
    n: 71, task: "5.6", rep: "erin", contract_amount: 24100, contract_signed_days: -10, financials: true,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-560001", rcv_amount: 24100, acv_amount: 17400, deductible: 1000, depreciation_amount: 6700 },
    job: { permit_status: "approved", material_order_status: "delivered", install_days: 2 },
    tasks: [
      { title: "Confirm crew assignment for install day", days: 1 },
      { title: "Order dumpster drop", days: 1 },
      { title: "Notify HOA of production date", days: 1 },
      { title: "Confirm material delivery window", days: 2 },
      { title: "Send production start text to homeowner", days: 2 },
    ],
  },
  {
    n: 72, task: "3.3", rep: "ty",
    claim: { carrier: "USAA", claim_number: "USAA-2026-995001", adjuster_name: "Curtis Boyd", adjuster_meeting_days: -3, reinspection_days: 6 },
    appointments: [
      { kind: "inspection", title: "Roof inspection", days: -8 },
      { kind: "adjuster_meeting", title: "Adjuster meeting — USAA", days: -3 },
      { kind: "adjuster_meeting", title: "Reinspection — 2nd adjuster", days: 6 },
    ],
  },
  {
    n: 73, task: "7.1", rep: "jeremy", contract_amount: 25400, contract_signed_days: -45, financials: true,
    claim: { carrier: "State Farm", claim_number: "SF-2026-122001", rcv_amount: 25400, acv_amount: 18300, deductible: 1000, depreciation_amount: 7100 },
    job: { install_days: -18, coc_signed_days: -8, permit_status: "approved", material_order_status: "delivered" },
    invoice: { invoice_number: "RAR-2026-0073", amount: 25400, status: "sent", issued_days: -7 },
    documents: [
      { category: "insurance_scope", file_name: "policy.pdf" },
      { category: "contract", file_name: "contract.pdf" },
      { category: "coc", file_name: "coc.pdf" },
      { category: "xactimate_estimate", file_name: "estimate.pdf" },
      { category: "photo", file_name: "photos.jpg" },
    ],
  },
  {
    n: 74, task: "7.2", rep: "erin", contract_amount: 27600, contract_signed_days: -48, financials: true,
    claim: { carrier: "Farmers", claim_number: "FAR-2026-340001", rcv_amount: 27600, acv_amount: 19900, deductible: 1000, depreciation_amount: 6700 },
    job: { install_days: -20, coc_signed_days: -10, permit_status: "approved", material_order_status: "delivered" },
    invoice: { invoice_number: "RAR-2026-0074", amount: 27600, status: "paid", issued_days: -9 },
    payments: [
      { kind: "deductible", amount: 1000, days: -9 },
      { kind: "acv", amount: 10000, days: -7 },
      { kind: "acv", amount: 9900, days: -5 },
      { kind: "depreciation", amount: 6700, days: -2 },
    ],
  },
  {
    n: 75, task: "2.3", rep: "ty", estimated_value: 21000, storm_date: "2026-07-15",
    notes: "Referred by RAR-T060. Neighbor chain — same storm event 2026-07-15.",
  },
  {
    n: 76, task: "5.4", rep: "jeremy", contract_amount: 23800, contract_signed_days: -14, financials: true,
    claim: { carrier: "Allstate", claim_number: "ALL-2026-892001", rcv_amount: 23800, acv_amount: 17200, deductible: 1000, depreciation_amount: 6600 },
    job: { permit_status: "submitted", permit_submitted_days: -7 },
    activities: [a("note", "HOA dispute", "HOA rejected initial shingle color. Resubmitting with 3 approved alternatives.", -2)],
  },
  {
    n: 77, task: "4.1", rep: "erin", estimated_value: 26400,
    claim: { carrier: "Shelter", claim_number: "SHL-2026-561001", rcv_amount: 26400, acv_amount: 19000, deductible: 1000, depreciation_amount: 7400 },
    estimate: { total_amount: 26400, status: "sent" },
    supplements: [{ requested_amount: 4200, approved_amount: 4200, status: "approved", scope_description: "Code upgrades and omitted line items", submitted_days: -10 }],
    activities: [a("note", "Supplement approved", "Full supplement approved. Scope now $26,400 total.", -2)],
  },
  {
    n: 78, task: "1.3", rep: "ty", inspection_days: 2,
    notes: "Lead originally contacted by Jeremy — rep assignment verified with manager.",
    appointments: [{ kind: "inspection", title: "Roof inspection", days: 2 }],
  },
  {
    n: 79, task: "3.1", rep: "jeremy", storm_date: "2026-07-15",
    notes: "Hail event 2026-07-15. 12 homes in same subdivision affected. Cluster job.",
    claim: { carrier: "State Farm", claim_number: "SF-2026-123001", date_of_loss_days: -45, date_filed_days: -4 },
  },
  {
    n: 80, task: "1.2", rep: "erin",
    notes: "Homeowner seasonal resident. Only available Sep-May. Schedule accordingly.",
  },
];
