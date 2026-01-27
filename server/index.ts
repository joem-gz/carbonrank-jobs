import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createLruCache } from "./cache";
import { fetchAdzunaJobs, SearchQuery } from "./adzuna";
import {
  CompaniesHouseProfile,
  EmployerCandidate,
  fetchCompaniesHouseProfile,
  fetchCompaniesHouseSearch,
  rankCompanies,
} from "./companies_house";
import { loadOnsIntensityMap, resolveOnsIntensity } from "./ons_intensity";
import { createRateLimiter } from "./rate_limit";

type ProxyResponse = {
  results: Awaited<ReturnType<typeof fetchAdzunaJobs>>["results"];
  count: number;
  page: number;
  cached: boolean;
};

type EmployerResolveResponse = {
  candidates: EmployerCandidate[];
  cached: boolean;
};

type EmployerSignalsResponse = {
  company_number: string;
  sic_codes: string[];
  sector_intensity_band: string;
  sector_intensity_value: number | null;
  sector_intensity_sic_code: string | null;
  sector_description: string | null;
  sources: string[];
  cached: boolean;
};

function loadEnvFile(path: string): void {
  try {
    const contents = readFileSync(path, "utf-8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split("=");
      if (!key || valueParts.length === 0) {
        continue;
      }
      const rawValue = valueParts.join("=").trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
  }
}

loadEnvFile(resolve(process.cwd(), "server", ".env"));

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const CACHE_TTL_MS = Number.parseInt(process.env.CACHE_TTL_MS ?? "600000", 10);
const CACHE_MAX = Number.parseInt(process.env.CACHE_MAX ?? "200", 10);
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS ?? "60000",
  10,
);
const RATE_LIMIT_MAX = Number.parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10);
const EMPLOYER_RESOLVE_TTL_MS = Number.parseInt(
  process.env.EMPLOYER_RESOLVE_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000),
  10,
);
const EMPLOYER_PROFILE_TTL_MS = Number.parseInt(
  process.env.EMPLOYER_PROFILE_TTL_MS ?? String(30 * 24 * 60 * 60 * 1000),
  10,
);
const EMPLOYER_CACHE_MAX = Number.parseInt(
  process.env.EMPLOYER_CACHE_MAX ?? "500",
  10,
);

const cache = createLruCache<ProxyResponse>({
  ttlMs: CACHE_TTL_MS,
  maxSize: CACHE_MAX,
});
const employerResolveCache = createLruCache<EmployerResolveResponse>({
  ttlMs: EMPLOYER_RESOLVE_TTL_MS,
  maxSize: EMPLOYER_CACHE_MAX,
});
const employerProfileCache = createLruCache<CompaniesHouseProfile>({
  ttlMs: EMPLOYER_PROFILE_TTL_MS,
  maxSize: EMPLOYER_CACHE_MAX,
});
const onsIntensityMap = loadOnsIntensityMap();
const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
});

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function setCorsHeaders(response: import("node:http").ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseNumber(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true";
}

function parseSearchQuery(url: URL): SearchQuery {
  const queryText = url.searchParams.get("q") ?? "";
  const where = url.searchParams.get("where") ?? "";
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const radiusKm = parseNumber(url.searchParams.get("radius_km"));
  const remoteOnly = parseBoolean(url.searchParams.get("remote_only"));

  return {
    q: queryText,
    where,
    page,
    radiusKm,
    remoteOnly,
  };
}

function buildCacheKey(query: SearchQuery): string {
  return JSON.stringify({
    q: query.q,
    where: query.where,
    page: query.page,
    radiusKm: query.radiusKm,
    remoteOnly: query.remoteOnly,
  });
}

function buildEmployerResolveCacheKey(name: string, hintLocation: string): string {
  return JSON.stringify({
    name: name.trim().toLowerCase(),
    hint_location: hintLocation.trim().toLowerCase(),
  });
}

async function handleJobsSearch(
  url: URL,
  response: import("node:http").ServerResponse,
): Promise<void> {
  const appId = process.env.ADZUNA_APP_ID ?? "";
  const appKey = process.env.ADZUNA_APP_KEY ?? "";
  if (!appId || !appKey) {
    sendJson(response, 500, { error: "Missing Adzuna credentials" });
    return;
  }

  const query = parseSearchQuery(url);
  const cacheKey = buildCacheKey(query);
  const cached = cache.get(cacheKey);
  if (cached) {
    sendJson(response, 200, { ...cached, cached: true });
    return;
  }

  try {
    const result = await fetchAdzunaJobs(query, { appId, appKey, country: "gb" });
    const payload: ProxyResponse = {
      results: result.results,
      count: result.count,
      page: query.page,
      cached: false,
    };
    cache.set(cacheKey, payload);
    sendJson(response, 200, payload);
  } catch (error) {
    console.error("[AdzunaProxy] Search failed", error);
    sendJson(response, 502, { error: "Failed to fetch Adzuna search results" });
  }
}

async function handleEmployerResolve(
  url: URL,
  response: import("node:http").ServerResponse,
): Promise<void> {
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    sendJson(response, 400, { error: "Missing employer name" });
    return;
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY ?? "";
  if (!apiKey) {
    sendJson(response, 500, { error: "Missing Companies House API key" });
    return;
  }

  const hintLocation = url.searchParams.get("hint_location")?.trim() ?? "";
  const cacheKey = buildEmployerResolveCacheKey(name, hintLocation);
  const cached = employerResolveCache.get(cacheKey);
  if (cached) {
    sendJson(response, 200, { ...cached, cached: true });
    return;
  }

  try {
    const searchResponse = await fetchCompaniesHouseSearch(name, { apiKey });
    const candidates = rankCompanies(
      name,
      searchResponse.items ?? [],
      hintLocation,
    );
    const payload: EmployerResolveResponse = {
      candidates,
      cached: false,
    };
    employerResolveCache.set(cacheKey, payload);
    sendJson(response, 200, payload);
  } catch (error) {
    console.error("[EmployerResolve] Search failed", error);
    sendJson(response, 502, { error: "Failed to resolve employer" });
  }
}

async function handleEmployerSignals(
  url: URL,
  response: import("node:http").ServerResponse,
): Promise<void> {
  const companyNumber = url.searchParams.get("company_number")?.trim() ?? "";
  if (!companyNumber) {
    sendJson(response, 400, { error: "Missing company_number" });
    return;
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY ?? "";
  if (!apiKey) {
    sendJson(response, 500, { error: "Missing Companies House API key" });
    return;
  }

  try {
    const cachedProfile = employerProfileCache.get(companyNumber);
    let profile = cachedProfile;
    let cached = false;
    if (!profile) {
      profile = await fetchCompaniesHouseProfile(companyNumber, { apiKey });
      employerProfileCache.set(companyNumber, profile);
    } else {
      cached = true;
    }

    const sicCodes = Array.isArray(profile.sic_codes)
      ? profile.sic_codes.filter(Boolean)
      : [];
    const intensity = resolveOnsIntensity(sicCodes, onsIntensityMap);
    const sources = ["companies_house"];
    if (intensity.value !== null) {
      sources.push("ons");
    }
    const payload: EmployerSignalsResponse = {
      company_number: profile.company_number ?? companyNumber,
      sic_codes: sicCodes,
      sector_intensity_band: intensity.band,
      sector_intensity_value: intensity.value,
      sector_intensity_sic_code: intensity.matched_code ?? null,
      sector_description: intensity.description ?? null,
      sources,
      cached,
    };
    sendJson(response, 200, payload);
  } catch (error) {
    console.error("[EmployerSignals] Profile lookup failed", error);
    sendJson(response, 502, { error: "Failed to fetch employer profile" });
  }
}

type RouteHandler = (
  url: URL,
  response: import("node:http").ServerResponse,
) => Promise<void>;

const routeHandlers: Record<string, RouteHandler> = {
  "/api/jobs/search": handleJobsSearch,
  "/api/employer/resolve": handleEmployerResolve,
  "/api/employer/signals": handleEmployerSignals,
};

const server = createServer(async (request, response) => {
  setCorsHeaders(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = request.url ?? "/";
  const origin = request.headers.host ?? "localhost";
  const url = new URL(requestUrl, `http://${origin}`);
  const handler = routeHandlers[url.pathname];
  if (!handler) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const clientKey = request.socket.remoteAddress ?? "unknown";
  const rate = rateLimiter(clientKey);
  if (!rate.allowed) {
    sendJson(response, 429, {
      error: "Rate limit exceeded",
      retry_after_ms: rate.retryAfterMs,
    });
    return;
  }

  await handler(url, response);
});

server.listen(PORT, () => {
  console.log(`[AdzunaProxy] Listening on http://localhost:${PORT}`);
});
