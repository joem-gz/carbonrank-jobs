export type EmployerCandidate = {
  company_number: string;
  title: string;
  status: string;
  address_snippet: string;
  sic_codes: string[];
  score: number;
  reasons: string[];
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
  sources: string[];
  cached: boolean;
};

export type EmployerSignalStatus = "available" | "low_confidence" | "no_data" | "error";

export type EmployerSignalsResult = {
  status: EmployerSignalStatus;
  candidates: EmployerCandidate[];
  selectedCandidate?: EmployerCandidate;
  signals?: EmployerSignalsResponse | null;
  reason?: string;
  overrideApplied?: boolean;
};
