import { ProxySearchResponse, SearchQuery } from "./types";
import { getProxyBaseUrl } from "../storage/proxy";

export function buildProxyUrl(
  query: SearchQuery,
  baseUrl: string,
): string {
  const url = new URL(baseUrl);
  url.pathname = "/api/jobs/search";
  url.searchParams.set("q", query.q);
  url.searchParams.set("where", query.where);
  url.searchParams.set("page", String(query.page));
  if (typeof query.radiusKm === "number" && query.radiusKm > 0) {
    url.searchParams.set("radius_km", String(query.radiusKm));
  }
  if (query.remoteOnly) {
    url.searchParams.set("remote_only", "true");
  }
  return url.toString();
}

export async function fetchProxyJobs(
  query: SearchQuery,
  fetchFn: typeof fetch = fetch,
  baseUrl?: string,
): Promise<ProxySearchResponse> {
  const resolvedBaseUrl = baseUrl ?? (await getProxyBaseUrl());
  const url = buildProxyUrl(query, resolvedBaseUrl);
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Proxy request failed with ${response.status}`);
  }
  return (await response.json()) as ProxySearchResponse;
}
