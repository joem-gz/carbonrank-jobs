import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createLruCache } from "./cache";
import { fetchAdzunaJobs, SearchQuery } from "./adzuna";
import { createRateLimiter } from "./rate_limit";
import { CommuteMode } from "../src/storage/settings";
import {
  createWidgetService,
  parseWidgetPartners,
  WidgetScoreRequest,
} from "./widget_service";

type ProxyResponse = {
  results: Awaited<ReturnType<typeof fetchAdzunaJobs>>["results"];
  count: number;
  page: number;
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
const WIDGET_PARTNERS = parseWidgetPartners(process.env.WIDGET_PARTNERS_JSON);
const WIDGET_CACHE_MAX = Number.parseInt(process.env.WIDGET_CACHE_MAX ?? "500", 10);
const WIDGET_RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.WIDGET_RATE_LIMIT_WINDOW_MS ?? "60000",
  10,
);
const WIDGET_RATE_LIMIT_MAX = Number.parseInt(
  process.env.WIDGET_RATE_LIMIT_MAX ?? "120",
  10,
);
const WIDGET_HOME_LAT = parseNumber(process.env.WIDGET_HOME_LAT) ?? 51.5074;
const WIDGET_HOME_LON = parseNumber(process.env.WIDGET_HOME_LON) ?? -0.1278;
const WIDGET_COMMUTE_MODE = parseCommuteMode(process.env.WIDGET_COMMUTE_MODE) ?? "car";
const WIDGET_OFFICE_DAYS =
  parseOfficeDays(process.env.WIDGET_OFFICE_DAYS) ?? 3;

const cache = createLruCache<ProxyResponse>({
  ttlMs: CACHE_TTL_MS,
  maxSize: CACHE_MAX,
});
const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
});
const widgetService = createWidgetService({
  partners: WIDGET_PARTNERS,
  cacheMax: WIDGET_CACHE_MAX,
  defaultHome: { lat: WIDGET_HOME_LAT, lon: WIDGET_HOME_LON },
  defaultCommuteMode: WIDGET_COMMUTE_MODE,
  defaultOfficeDays: WIDGET_OFFICE_DAYS,
  defaultRateLimit: {
    windowMs: WIDGET_RATE_LIMIT_WINDOW_MS,
    max: WIDGET_RATE_LIMIT_MAX,
  },
});

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
): void {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

function sendEmpty(
  response: import("node:http").ServerResponse,
  statusCode: number,
  headers: Record<string, string> = {},
): void {
  response.writeHead(statusCode, headers);
  response.end();
}

function setSearchCorsHeaders(response: import("node:http").ServerResponse): void {
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

function parseCommuteMode(value: string | null | undefined): CommuteMode | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (
    normalized === "car" ||
    normalized === "bus" ||
    normalized === "rail" ||
    normalized === "walk" ||
    normalized === "cycle"
  ) {
    return normalized as CommuteMode;
  }
  return undefined;
}

function parseOfficeDays(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.min(5, Math.max(0, parsed));
}

async function readJsonBody(
  request: import("node:http").IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString("utf-8").trim();
  if (!body) {
    return {};
  }
  return JSON.parse(body);
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

const server = createServer(async (request, response) => {
  const requestUrl = request.url ?? "/";
  const host = request.headers.host ?? "localhost";
  const url = new URL(requestUrl, `http://${host}`);

  if (request.method === "OPTIONS") {
    if (url.pathname === "/api/widget/score") {
      const preflight = widgetService.handlePreflight(request.headers.origin);
      sendEmpty(response, preflight.status, preflight.headers ?? {});
      return;
    }
    setSearchCorsHeaders(response);
    sendEmpty(response, 204);
    return;
  }

  if (url.pathname === "/api/widget/score") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    let payload: unknown;
    try {
      payload = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON body" });
      return;
    }

    const apiKey =
      (request.headers["x-api-key"] as string | undefined) ?? null;
    const result = widgetService.handleScoreRequest(
      payload as WidgetScoreRequest,
      {
        apiKey,
        origin: request.headers.origin ?? null,
        ip: request.socket.remoteAddress ?? null,
      },
    );
    sendJson(response, result.status, result.body, result.headers ?? {});
    return;
  }

  if (url.pathname !== "/api/jobs/search") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  setSearchCorsHeaders(response);

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
});

server.listen(PORT, () => {
  console.log(`[AdzunaProxy] Listening on http://localhost:${PORT}`);
});
