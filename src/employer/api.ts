import {
  EmployerCandidate,
  EmployerResolveResponse,
  EmployerSignalStatus,
  EmployerSignalsResponse,
  EmployerSignalsResult,
} from "./types";
import { normalizeEmployerName } from "./normalize";

export const DEFAULT_EMPLOYER_API_BASE_URL = "http://localhost:8787";
const HIGH_CONFIDENCE_SCORE = 0.7;

const resolveCache = new Map<string, EmployerResolveResponse>();
const signalsCache = new Map<string, EmployerSignalsResponse>();

type FetchOptions = {
  baseUrl?: string;
  fetchFn?: typeof fetch;
};

export type EmployerOverride = {
  companyNumber: string;
  companyName?: string;
};

function buildCacheKey(name: string, hintLocation?: string): string {
  return JSON.stringify({
    name: normalizeEmployerName(name),
    hint: (hintLocation ?? "").toLowerCase().trim(),
  });
}

export function buildEmployerResolveUrl(
  name: string,
  hintLocation?: string,
  baseUrl: string = DEFAULT_EMPLOYER_API_BASE_URL,
): string {
  const url = new URL(baseUrl);
  url.pathname = "/api/employer/resolve";
  url.searchParams.set("name", name);
  if (hintLocation) {
    url.searchParams.set("hint_location", hintLocation);
  }
  return url.toString();
}

export function buildEmployerSignalsUrl(
  companyNumber: string,
  baseUrl: string = DEFAULT_EMPLOYER_API_BASE_URL,
): string {
  const url = new URL(baseUrl);
  url.pathname = "/api/employer/signals";
  url.searchParams.set("company_number", companyNumber);
  return url.toString();
}

async function fetchJson<T>(url: string, fetchFn: typeof fetch = fetch): Promise<T> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Employer API failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchEmployerResolve(
  name: string,
  hintLocation?: string,
  options: FetchOptions = {},
): Promise<EmployerResolveResponse> {
  const cacheKey = buildCacheKey(name, hintLocation);
  const cached = resolveCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildEmployerResolveUrl(name, hintLocation, options.baseUrl);
  const payload = await fetchJson<EmployerResolveResponse>(
    url,
    options.fetchFn ?? fetch,
  );
  resolveCache.set(cacheKey, payload);
  return payload;
}

export async function fetchEmployerSignals(
  companyNumber: string,
  options: FetchOptions = {},
): Promise<EmployerSignalsResponse> {
  const cached = signalsCache.get(companyNumber);
  if (cached) {
    return cached;
  }

  const url = buildEmployerSignalsUrl(companyNumber, options.baseUrl);
  const payload = await fetchJson<EmployerSignalsResponse>(
    url,
    options.fetchFn ?? fetch,
  );
  signalsCache.set(companyNumber, payload);
  return payload;
}

export function classifyEmployerStatus(score?: number): EmployerSignalStatus {
  if (!Number.isFinite(score)) {
    return "no_data";
  }
  if (score >= HIGH_CONFIDENCE_SCORE) {
    return "available";
  }
  return "low_confidence";
}

export function formatEmployerStatusLabel(status: EmployerSignalStatus): string {
  switch (status) {
    case "available":
      return "available";
    case "low_confidence":
      return "low confidence";
    case "no_data":
      return "no data";
    case "error":
      return "no data";
  }
}

export async function fetchEmployerStatus(
  name: string,
  hintLocation?: string,
  options: FetchOptions = {},
): Promise<EmployerSignalStatus> {
  if (!name) {
    return "no_data";
  }
  try {
    const resolvePayload = await fetchEmployerResolve(name, hintLocation, options);
    const topCandidate = resolvePayload.candidates?.[0];
    return classifyEmployerStatus(topCandidate?.score);
  } catch {
    return "error";
  }
}

function pickSelectedCandidate(
  candidates: EmployerCandidate[],
  override?: EmployerOverride,
): { candidate?: EmployerCandidate; overrideApplied: boolean } {
  if (override?.companyNumber) {
    const match = candidates.find(
      (candidate) => candidate.company_number === override.companyNumber,
    );
    if (match) {
      return { candidate: match, overrideApplied: true };
    }
    return {
      candidate: {
        company_number: override.companyNumber,
        title: override.companyName ?? override.companyNumber,
        status: "override",
        address_snippet: "",
        sic_codes: [],
        score: 1,
        reasons: ["user_override"],
      },
      overrideApplied: true,
    };
  }

  return { candidate: candidates[0], overrideApplied: false };
}

export async function resolveEmployerSignals(
  name: string,
  hintLocation?: string,
  override?: EmployerOverride,
  options: FetchOptions = {},
): Promise<EmployerSignalsResult> {
  if (!name) {
    return { status: "no_data", candidates: [], reason: "Missing employer name" };
  }

  try {
    const resolvePayload = await fetchEmployerResolve(name, hintLocation, options);
    const candidates = resolvePayload.candidates ?? [];
    const { candidate, overrideApplied } = pickSelectedCandidate(candidates, override);

    if (!candidate) {
      return { status: "no_data", candidates, reason: "No match" };
    }

    const baseStatus = overrideApplied
      ? "available"
      : classifyEmployerStatus(candidate.score);
    let signals: EmployerSignalsResponse | null = null;

    try {
      signals = await fetchEmployerSignals(candidate.company_number, options);
    } catch {
      signals = null;
    }

    return {
      status: baseStatus,
      candidates,
      selectedCandidate: candidate,
      signals,
      overrideApplied,
    };
  } catch (error) {
    console.error("[EmployerSignals] resolve failed", error);
    return { status: "error", candidates: [], reason: "Request failed" };
  }
}
