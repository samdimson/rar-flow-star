export const RC_COMPANY = "Rise Above Roofing Oklahoma";
export const RC_ADDRESS = "12101 N MacArthur Blvd, Suite A160, Edmond, OK 73025";
export const RC_PHONE = "405.266.1313";
export const RC_EMAIL = "Info@riseaboveroofingok.com";
export const RC_WEBSITE = "www.riseaboveroofingok.com";
export const RC_CIB = "80007962";
export const RC_CC_EMAIL = "info@riseaboveroofingok.com";

export const ROOFING_CONTRACT_TERMS: string[] = [
  "SCOPE CHANGES: Any work outside the approved scope requires a written change order signed by both parties prior to commencement.",
  "INSURANCE PROCEEDS: Homeowner agrees to endorse and deliver all insurance proceeds related to this claim to Rise Above Roofing Oklahoma promptly upon receipt. Failure to deliver proceeds within 10 business days of receipt may result in a lien on the property.",
  "DEDUCTIBLE: The homeowner is solely responsible for payment of the insurance deductible. Oklahoma law (Title 36, § 4804.2) prohibits roofing contractors from paying, waiving, or rebating insurance deductibles. Violation of this law is a felony.",
  "CANCELLATION / RESCISSION: The homeowner has three (3) business days from the date of signing to cancel this agreement without penalty. Cancellation must be submitted in writing to Info@riseaboveroofingok.com or by certified mail to the contractor's address. After the rescission period, cancellation may result in charges for services rendered up to $1,500.00.",
  "PERMITS & CODE COMPLIANCE: Contractor will obtain all required building permits. All work will comply with applicable Oklahoma building codes and manufacturer specifications. Homeowner is responsible for HOA approvals where applicable.",
  "WARRANTY: Contractor provides a workmanship warranty of two (2) years from date of completion. Manufacturer warranty applies per manufacturer terms. Warranty is void if homeowner performs or authorizes unauthorized repairs.",
  "INSURANCE & LICENSING: Rise Above Roofing Oklahoma is registered with the Oklahoma Construction Industries Board (CIB Reg. #80007962) and maintains required general liability and workers' compensation insurance. As of July 1, 2026, HB 1628 requires a Residential Roofing Endorsement; contractor represents compliance with all applicable CIB requirements.",
  "LIEN WAIVER: Upon receipt of final payment, Contractor will provide a signed lien waiver releasing all mechanic's lien rights related to this project.",
  "DISPUTE RESOLUTION: Any disputes arising from this agreement shall first be submitted to mediation in Oklahoma County, Oklahoma before litigation. Oklahoma law governs this agreement.",
  "LIMITATION OF LIABILITY: Contractor's liability shall not exceed the total contract price. Contractor is not liable for pre-existing conditions, acts of God, or damage caused by others after completion.",
  "ENTIRE AGREEMENT: This document constitutes the entire agreement between the parties and supersedes all prior oral or written representations. Modifications must be in writing and signed by both parties.",
  "HOMEOWNER RIGHTS: Homeowner has the right to choose any licensed contractor. Signing this agreement does not waive any statutory rights under Oklahoma law.",
];

export type RoofingContractFields = {
  homeownerName: string;
  coOwnerName: string;
  propertyAddress: string;
  cityStateZip: string;
  phone: string;
  email: string;
  contractDate: string;

  roofSystemType: string;
  shingleBrand: string;
  shingleColor: string;
  squares: string;
  tearOffLayers: string;
  deckingReplacement: string;
  deckingSheets: string;
  underlayment: string;
  iceWaterShield: string;
  iceWaterLocations: string;
  dripEdge: string;
  dripEdgeColor: string;
  ridgeCap: string;
  pipeBoots: string;
  ventilation: string;
  gutters: string;
  guttersDescription: string;
  permitRequired: string;
  scopeNotes: string;

  carrier: string;
  claimNumber: string;
  rcvAmount: string;
  deductibleAmount: string;
  depreciationAmount: string;
  supplementAmount: string;
  acvAmount: string;

  homeownerPrintedName: string;
  repName: string;
};

export type RcFieldSpec = {
  key: keyof RoofingContractFields;
  label: string;
  type?: "text" | "date" | "number" | "money" | "select" | "textarea";
  options?: { value: string; label: string }[];
  full?: boolean;
  hint?: string;
};

const YES_NO = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

export const RC_PARTY_FIELDS: RcFieldSpec[] = [
  { key: "homeownerName", label: "Homeowner(s) Name" },
  { key: "coOwnerName", label: "Co-Owner Name (optional)" },
  { key: "propertyAddress", label: "Property Address", full: true },
  { key: "cityStateZip", label: "City / State / ZIP" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "contractDate", label: "Contract Date", type: "date" },
];

export const RC_SCOPE_FIELDS: RcFieldSpec[] = [
  {
    key: "roofSystemType",
    label: "Roof System Type",
    type: "select",
    options: [
      { value: "Asphalt Shingle", label: "Asphalt Shingle" },
      { value: "Metal", label: "Metal" },
      { value: "TPO", label: "TPO" },
      { value: "Modified Bitumen", label: "Modified Bitumen" },
      { value: "Tile", label: "Tile" },
      { value: "Other", label: "Other" },
    ],
  },
  { key: "shingleBrand", label: "Shingle Brand / Model", hint: "e.g. TAMKO Titan XT" },
  { key: "shingleColor", label: "Shingle Color" },
  { key: "squares", label: "Number of Squares", type: "number" },
  {
    key: "tearOffLayers",
    label: "Tear-off Layers",
    type: "select",
    options: [
      { value: "1 layer", label: "1 layer" },
      { value: "2 layers", label: "2 layers" },
      { value: "3+ layers", label: "3+ layers" },
    ],
  },
  { key: "deckingReplacement", label: "Decking Replacement", type: "select", options: YES_NO },
  { key: "deckingSheets", label: "Estimated Decking Sheets", type: "number" },
  {
    key: "underlayment",
    label: "Underlayment Type",
    type: "select",
    options: [
      { value: "Synthetic", label: "Synthetic" },
      { value: "Felt 15#", label: "Felt 15#" },
      { value: "Felt 30#", label: "Felt 30#" },
    ],
  },
  { key: "iceWaterShield", label: "Ice & Water Shield", type: "select", options: YES_NO },
  { key: "iceWaterLocations", label: "Ice & Water Locations", hint: "eaves / valleys / penetrations" },
  { key: "dripEdge", label: "Drip Edge", type: "select", options: YES_NO },
  { key: "dripEdgeColor", label: "Drip Edge Color" },
  { key: "ridgeCap", label: "Ridge Cap Type" },
  { key: "pipeBoots", label: "Pipe Boots / Penetrations", type: "number" },
  { key: "ventilation", label: "Ventilation Work" },
  { key: "gutters", label: "Gutters", type: "select", options: YES_NO },
  { key: "guttersDescription", label: "Gutter Description" },
  {
    key: "permitRequired",
    label: "Permit Required",
    type: "select",
    options: YES_NO,
    hint: "If yes, contractor will obtain the permit.",
  },
  { key: "scopeNotes", label: "Additional Scope Notes", type: "textarea", full: true },
];

export const RC_PRICE_FIELDS: RcFieldSpec[] = [
  { key: "carrier", label: "Insurance Carrier" },
  { key: "claimNumber", label: "Claim Number" },
  { key: "rcvAmount", label: "Total Contract Price (RCV)", type: "money" },
  { key: "deductibleAmount", label: "Homeowner Deductible", type: "money" },
  { key: "depreciationAmount", label: "Recoverable Depreciation", type: "money" },
  { key: "supplementAmount", label: "Supplement Amount (if any)", type: "money" },
  { key: "acvAmount", label: "Payment 1 — Initial ACV", type: "money", hint: "Due upon receipt of ACV from carrier" },
];

export const num = (value: string | number | null | undefined): number => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Payment 2 = recoverable depreciation plus any approved supplement. */
export const contractPayment2 = (fields: RoofingContractFields): number =>
  num(fields.depreciationAmount) + num(fields.supplementAmount);

/** Homeowner responsibility is the deductible only. */
export const contractHomeownerTotal = (fields: RoofingContractFields): number =>
  num(fields.deductibleAmount);

/** The roofing contract is signable at task 5.1 (Contract Signed — Sold). */
export function canSignRoofingContract(taskCode: string | null | undefined): boolean {
  return taskCode === "5.1";
}
