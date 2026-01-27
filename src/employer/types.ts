export type OrgClassification = "employer" | "agency" | "unknown";

export type EmployerCandidate = {
  company_number: string;
  title: string;
  status: string;
  address_snippet: string;
  sic_codes: string[];
  score: number;
  reasons: string[];
  org_classification?: OrgClassification;
  classification_reasons?: string[];
};

export type EmployerResolveResponse = {
  candidates: EmployerCandidate[];
  cached: boolean;
};

export type EmployerSignalsResponse = {
  company_number: string;
  sic_codes: string[];
  sector_intensity_band: string;
  sector_intensity_value: number | null;
  sector_intensity_sic_code: string | null;
  sector_description: string | null;
  sources: string[];
  cached: boolean;
};

export type EmployerSignalStatus = "available" | "low_confidence" | "no_data" | "error";

export type EmployerPosterInfo = {
  name: string;
  isAgency: boolean;
  reasons: string[];
  classification?: OrgClassification;
  classificationReasons?: string[];
};

export type EmployerNameCandidate = {
  name: string;
  confidence: "medium" | "low" | "override";
  source: "jsonld" | "text" | "override";
  reasons: string[];
};

export type EmployerSignalsResult = {
  status: EmployerSignalStatus;
  candidates: EmployerCandidate[];
  selectedCandidate?: EmployerCandidate;
  signals?: EmployerSignalsResponse | null;
  reason?: string;
  overrideApplied?: boolean;
  poster?: EmployerPosterInfo;
  employerCandidate?: EmployerNameCandidate | null;
};
