export const SERVICE_AGREEMENT_TERMS: string[] = [
  "By signing this agreement, the Homeowner authorizes Rise Above Roofing Oklahoma to provide roofing-related services including inspections, measurements, photographs, emergency tarping, insurance documentation support, and related project assistance.",
  "Rise Above Roofing Oklahoma may communicate with the insurance company and other parties involved in the claim process to help facilitate the review of weather-related damages.",
  "If the insurance claim is approved, the Homeowner agrees to work in good faith with Rise Above Roofing Oklahoma regarding the approved scope of repairs.",
  "The Homeowner agrees to provide any insurance documents or claim information reasonably necessary to assist with the project review process.",
  "All work is contingent upon insurance approval and mutually agreed project terms. If coverage is denied or the approved scope is not acceptable to either party, this agreement may be canceled without obligation.",
  "If the Homeowner chooses not to proceed with Rise Above Roofing Oklahoma after substantial inspection, claim support, and administrative services have been completed, the Contractor may request reimbursement of up to $1,500.00 to help offset costs already incurred. This amount is intended to reasonably reflect services performed and is not intended as a penalty.",
  "Oklahoma law prohibits roofing contractors from paying, waiving, or rebating insurance deductibles as an inducement for roofing services. The Homeowner remains responsible for payment of any applicable deductible required by their insurance policy.",
  "Rise Above Roofing Oklahoma maintains required contractor registrations and insurance coverage in accordance with Oklahoma Construction Industries Board requirements.",
  "The Homeowner has the right to choose the contractor of their choice for repairs related to this property.",
];

export const SA_COMPANY = "Rise Above Roofing Oklahoma";
export const SA_PHONE = "405.266.1313";
export const SA_EMAIL = "Info@riseabovetheroofok.com";
export const SA_WEBSITE = "www.riseaboveroofingok.com";
export const SA_CC_EMAIL = "info@riseaboveroofingok.com";

export type ServiceAgreementFields = {
  homeownerName: string;
  propertyAddress: string;
  cityStateZip: string;
  phone: string;
  email: string;
  insuranceCompany: string;
  claimNumber: string;
  policyNumber: string;
  dateOfLoss: string;
};

export const SERVICE_AGREEMENT_FIELD_LABELS: { key: keyof ServiceAgreementFields; label: string }[] = [
  { key: "homeownerName", label: "Homeowner(s) Name" },
  { key: "propertyAddress", label: "Property Address" },
  { key: "cityStateZip", label: "City / State / Zip" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "insuranceCompany", label: "Insurance Company" },
  { key: "claimNumber", label: "Claim Number" },
  { key: "policyNumber", label: "Policy Number" },
  { key: "dateOfLoss", label: "Date of Loss" },
];

/** Service agreement is signable while the lead sits in tasks 2.3 → 3.1. */
export function canSignServiceAgreement(taskCode: string | null | undefined): boolean {
  if (!taskCode) return false;
  const value = Number(taskCode);
  if (Number.isNaN(value)) return false;
  return value >= 2.3 && value <= 3.1;
}
