export type LocationClass =
  | { kind: "wfh" }
  | { kind: "no_data"; reason: string }
  | { kind: "place"; raw: string; tokens: string[] };

const WFH_MARKERS = ["work from home", "working from home", "remote"];
const BROAD_LOCATIONS = new Set([
  "united kingdom",
  "uk",
  "nationwide",
  "england",
  "scotland",
  "wales",
  "great britain",
]);

function normalizeForMatch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function tokenizeLocation(raw: string): string[] {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function classifyLocation(locationName: string): LocationClass {
  const normalized = normalizeForMatch(locationName);
  if (!normalized) {
    return { kind: "no_data", reason: "Missing location" };
  }

  if (WFH_MARKERS.some((marker) => normalized.includes(marker))) {
    return { kind: "wfh" };
  }

  if (BROAD_LOCATIONS.has(normalized)) {
    return { kind: "no_data", reason: "Location too broad" };
  }

  return {
    kind: "place",
    raw: locationName.trim(),
    tokens: tokenizeLocation(locationName),
  };
}
