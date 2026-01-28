import { JobPostingExtract } from "../extractors/jobposting_jsonld";
import { normalizeEmployerName } from "./normalize";
import {
  EmployerCandidate,
  EmployerNameCandidate,
  EmployerPosterInfo,
} from "./types";

type AgencyDetectionResult = {
  isAgency: boolean;
  reasons: string[];
  supportingReasons: string[];
};

const AGENCY_DISCLOSURE_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /is an employment agency and business/i,
    reason: "disclosure_employment_agency_business",
  },
  {
    regex: /employment agency and employment business/i,
    reason: "disclosure_employment_agency_business",
  },
  {
    regex: /employment agency and an employment business/i,
    reason: "disclosure_employment_agency_business",
  },
  {
    regex: /is an employment agency/i,
    reason: "disclosure_employment_agency",
  },
  {
    regex: /acts as an employment agency/i,
    reason: "disclosure_acts_as_agency",
  },
  {
    regex: /acts as an employment business/i,
    reason: "disclosure_acts_as_business",
  },
  {
    regex: /employment agency for permanent recruitment/i,
    reason: "disclosure_permanent_recruitment",
  },
  {
    regex: /employment business for the supply of temporary workers/i,
    reason: "disclosure_temp_supply",
  },
];

const AGENCY_SUPPORTING_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\bour client\b/i, reason: "hint_our_client" },
  { regex: /\bon behalf of\b/i, reason: "hint_on_behalf" },
  { regex: /\bwe are recruiting for\b/i, reason: "hint_recruiting_for" },
  { regex: /\bwe're recruiting for\b/i, reason: "hint_recruiting_for" },
  { regex: /\bwe are working with\b/i, reason: "hint_working_with" },
];

const AGENCY_SIC_CODES = new Set(["78101", "78109", "78200", "78300"]);
const AGENCY_SIC_PREFIX = "78";

const EMPLOYER_NAME_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex:
      /our client(?:,|\sis|\sare)?\s+([A-Z][A-Za-z0-9&'().-]*(?:\s+[A-Z][A-Za-z0-9&'().-]*){0,4})/i,
    reason: "text_our_client",
  },
  {
    regex:
      /on behalf of\s+([A-Z][A-Za-z0-9&'().-]*(?:\s+[A-Z][A-Za-z0-9&'().-]*){0,4})/i,
    reason: "text_on_behalf",
  },
  {
    regex:
      /recruiting for\s+([A-Z][A-Za-z0-9&'().-]*(?:\s+[A-Z][A-Za-z0-9&'().-]*){0,4})/i,
    reason: "text_recruiting_for",
  },
  {
    regex:
      /working with\s+([A-Z][A-Za-z0-9&'().-]*(?:\s+[A-Z][A-Za-z0-9&'().-]*){0,4})/i,
    reason: "text_working_with",
  },
];

const POSTER_SELECTORS = [
  "[data-qa=\"job-posted-by\"]",
  "[data-testid=\"job-posted-by\"]",
  ".job-posted-by",
  ".job-postedby",
  ".posted-by",
];

function normalizeNameForMatch(value: string): string {
  return normalizeEmployerName(value);
}

function uniqueReasons(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeSicCode(code: string): string {
  return code.replace(/[^0-9]/g, "");
}

export function classifyAgencyFromSicCodes(
  sicCodes: string[],
): { isAgency: boolean; reasons: string[] } {
  const normalized = sicCodes.map(normalizeSicCode).filter(Boolean);
  const agencyCodes = normalized.filter(
    (code) => code.startsWith(AGENCY_SIC_PREFIX) || AGENCY_SIC_CODES.has(code),
  );
  if (agencyCodes.length === 0) {
    return { isAgency: false, reasons: [] };
  }
  return {
    isAgency: true,
    reasons: uniqueReasons(agencyCodes.map((code) => `sic_${code}`)),
  };
}

export function applyAgencySicClassification(
  poster: EmployerPosterInfo,
  sicCodes: string[],
): EmployerPosterInfo {
  const classification = classifyAgencyFromSicCodes(sicCodes);
  if (!classification.isAgency) {
    return poster;
  }
  const reasons = uniqueReasons([...(poster.reasons ?? []), ...classification.reasons]);
  const classificationReasons = uniqueReasons([
    ...(poster.classificationReasons ?? []),
    ...classification.reasons,
  ]);
  return {
    ...poster,
    isAgency: true,
    reasons,
    classification: "agency",
    classificationReasons,
  };
}

function extractNameFromByline(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  const lower = normalized.toLowerCase();
  const marker = " by ";
  const index = lower.lastIndexOf(marker);
  if (index >= 0) {
    const candidate = normalized.slice(index + marker.length).trim();
    if (candidate) {
      return candidate;
    }
  }
  return normalized;
}

export function detectAgencyDisclosure(text: string): AgencyDetectionResult {
  const reasons = AGENCY_DISCLOSURE_PATTERNS.filter(({ regex }) => regex.test(text)).map(
    ({ reason }) => reason,
  );
  const supportingReasons = AGENCY_SUPPORTING_PATTERNS.filter(({ regex }) =>
    regex.test(text),
  ).map(({ reason }) => reason);

  return {
    isAgency: reasons.length > 0,
    reasons: uniqueReasons(reasons),
    supportingReasons: uniqueReasons(supportingReasons),
  };
}

export function extractPosterName(scope: ParentNode, fallbackName: string): string {
  for (const selector of POSTER_SELECTORS) {
    const el = scope.querySelector(selector);
    if (!el || !el.textContent) {
      continue;
    }
    const link = el.querySelector("a");
    if (link?.textContent?.trim()) {
      return link.textContent.trim();
    }
    const parsed = extractNameFromByline(el.textContent);
    if (parsed) {
      return parsed;
    }
  }
  return fallbackName.trim();
}

export function extractEmployerCandidateFromJobPosting(
  jobPosting: JobPostingExtract,
  posterName: string,
): EmployerNameCandidate | null {
  const candidate = jobPosting.hiringOrganizationName?.trim();
  if (!candidate) {
    return null;
  }
  if (normalizeNameForMatch(candidate) === normalizeNameForMatch(posterName)) {
    return null;
  }
  return {
    name: candidate,
    confidence: "medium",
    source: "jsonld",
    reasons: ["jsonld_hiring_organization"],
  };
}

export function extractEmployerCandidateFromText(
  text: string,
  posterName: string,
): EmployerNameCandidate | null {
  for (const { regex, reason } of EMPLOYER_NAME_PATTERNS) {
    const match = text.match(regex);
    const raw = match?.[1]?.trim();
    if (!raw) {
      continue;
    }
    let candidate = raw.replace(/[\s,.;:]+$/g, "").trim();
    candidate = candidate.replace(/\s+(based|located)\s+(in|at)\b.*$/i, "").trim();
    if (!candidate) {
      continue;
    }
    if (!/^[A-Z]/.test(candidate)) {
      continue;
    }
    if (normalizeNameForMatch(candidate) === normalizeNameForMatch(posterName)) {
      continue;
    }
    return {
      name: candidate,
      confidence: "low",
      source: "text",
      reasons: [reason],
    };
  }
  return null;
}

export function buildPosterInfo(
  name: string,
  detection: AgencyDetectionResult,
  candidate?: EmployerCandidate,
): EmployerPosterInfo {
  const classification = candidate?.org_classification ?? "unknown";
  const classificationReasons = candidate?.classification_reasons ?? [];
  const isAgency = detection.isAgency || classification === "agency";
  const reasons = isAgency
    ? uniqueReasons([
        ...detection.reasons,
        ...classificationReasons,
        ...detection.supportingReasons,
      ])
    : uniqueReasons([...detection.reasons, ...classificationReasons]);

  return {
    name,
    isAgency,
    reasons,
    classification,
    classificationReasons,
  };
}
