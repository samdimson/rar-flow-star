export type Stage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "new", label: "New" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: Stage;
  owner: string;
  source: string;
  createdAt: string;
  lastActivity: string;
  notes?: string | undefined;
};

export type Activity = {
  id: string;
  leadId: string;
  type: "call" | "email" | "meeting" | "note" | "stage";
  summary: string;
  at: string;
};

export const OWNERS = ["Sam Rivera", "Dana Okafor", "Miguel Torres", "Priya Nair"];
export const SOURCES = ["Website", "Referral", "Outbound", "Event", "Partner"];

export const seedLeads: Lead[] = [
  {
    id: "L-1041",
    name: "Ava Lindqvist",
    company: "Northwind Logistics",
    email: "ava@northwind.co",
    phone: "+1 415 200 1188",
    value: 48000,
    stage: "negotiation",
    owner: "Sam Rivera",
    source: "Referral",
    createdAt: "2026-07-14",
    lastActivity: "2026-08-24",
    notes: "Legal review of MSA in progress. Target close end of month.",
  },
  {
    id: "L-1042",
    name: "Tobias Fenn",
    company: "Halden Manufacturing",
    email: "t.fenn@halden.io",
    phone: "+1 312 774 0912",
    value: 132000,
    stage: "proposal",
    owner: "Dana Okafor",
    source: "Outbound",
    createdAt: "2026-07-22",
    lastActivity: "2026-08-25",
    notes: "Sent 3-year proposal with onboarding services bundled.",
  },
  {
    id: "L-1043",
    name: "Renee Castillo",
    company: "Brightpath Health",
    email: "renee@brightpath.health",
    phone: "+1 646 118 3320",
    value: 76500,
    stage: "qualified",
    owner: "Miguel Torres",
    source: "Website",
    createdAt: "2026-08-02",
    lastActivity: "2026-08-23",
  },
  {
    id: "L-1044",
    name: "Jonas Weber",
    company: "Kessler Retail Group",
    email: "jweber@kesslerrg.com",
    phone: "+49 30 5544 8811",
    value: 21500,
    stage: "new",
    owner: "Priya Nair",
    source: "Event",
    createdAt: "2026-08-19",
    lastActivity: "2026-08-21",
  },
  {
    id: "L-1045",
    name: "Marta Silva",
    company: "Corvid Analytics",
    email: "marta@corvid.ai",
    phone: "+351 21 998 4410",
    value: 58000,
    stage: "won",
    owner: "Sam Rivera",
    source: "Partner",
    createdAt: "2026-06-11",
    lastActivity: "2026-08-12",
    notes: "Closed won. Kickoff scheduled with delivery team.",
  },
  {
    id: "L-1046",
    name: "Desmond Iyer",
    company: "Sable Energy",
    email: "d.iyer@sable-energy.com",
    phone: "+1 713 220 7744",
    value: 94000,
    stage: "qualified",
    owner: "Dana Okafor",
    source: "Outbound",
    createdAt: "2026-08-05",
    lastActivity: "2026-08-26",
  },
  {
    id: "L-1047",
    name: "Lena Duarte",
    company: "Vela Studios",
    email: "lena@velastudios.com",
    phone: "+1 503 445 8890",
    value: 17800,
    stage: "lost",
    owner: "Priya Nair",
    source: "Website",
    createdAt: "2026-06-28",
    lastActivity: "2026-08-04",
    notes: "Chose in-house build. Revisit in Q1.",
  },
  {
    id: "L-1048",
    name: "Owen Bradley",
    company: "Ridgeline Capital",
    email: "obradley@ridgeline.fund",
    phone: "+1 212 660 4423",
    value: 210000,
    stage: "proposal",
    owner: "Miguel Torres",
    source: "Referral",
    createdAt: "2026-07-30",
    lastActivity: "2026-08-26",
  },
  {
    id: "L-1049",
    name: "Hana Kimura",
    company: "Tsuki Foods",
    email: "hana@tsukifoods.jp",
    phone: "+81 3 6811 2299",
    value: 33500,
    stage: "new",
    owner: "Sam Rivera",
    source: "Event",
    createdAt: "2026-08-24",
    lastActivity: "2026-08-25",
  },
  {
    id: "L-1050",
    name: "Felix Moreau",
    company: "Atlas Freight",
    email: "felix@atlasfreight.eu",
    phone: "+33 1 4477 9021",
    value: 67000,
    stage: "negotiation",
    owner: "Dana Okafor",
    source: "Partner",
    createdAt: "2026-07-08",
    lastActivity: "2026-08-20",
  },
];

export const seedActivities: Activity[] = [
  { id: "A-1", leadId: "L-1048", type: "meeting", summary: "Proposal walkthrough with CFO and Head of Ops", at: "2026-08-26" },
  { id: "A-2", leadId: "L-1046", type: "call", summary: "Discovery call — 4 sites, 120 seats", at: "2026-08-26" },
  { id: "A-3", leadId: "L-1042", type: "email", summary: "Sent revised pricing with volume tier", at: "2026-08-25" },
  { id: "A-4", leadId: "L-1049", type: "note", summary: "Met at Foodtech Expo, wants pilot in Q4", at: "2026-08-25" },
  { id: "A-5", leadId: "L-1041", type: "stage", summary: "Moved from Proposal to Negotiation", at: "2026-08-24" },
  { id: "A-6", leadId: "L-1043", type: "email", summary: "Security questionnaire returned", at: "2026-08-23" },
  { id: "A-7", leadId: "L-1050", type: "meeting", summary: "Commercial terms review", at: "2026-08-20" },
];

export const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export const OPEN_STAGES: Stage[] = ["new", "qualified", "proposal", "negotiation"];

export const stageWeight: Record<Stage, number> = {
  new: 0.1,
  qualified: 0.3,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};
