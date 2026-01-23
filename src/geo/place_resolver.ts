import ukPlacesIndex from "../data/uk_places_index.json";

export type PlaceCandidate = {
  name: string;
  lat: number;
  lon: number;
  local_type: string;
  county_unitary?: string;
  region?: string;
  country?: string;
};

export type PlacesIndex = {
  meta: {
    source: string;
    buildDate: string;
    license: string;
    attribution: string;
  };
  places: Record<string, PlaceCandidate[]>;
};

export type ResolveResult =
  | {
      kind: "resolved";
      lat: number;
      lon: number;
      chosenName: string;
      why: string;
    }
  | {
      kind: "unresolved";
      why: string;
    };

function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .toLowerCase();
}

function fieldMatchesToken(field: string, token: string): boolean {
  if (!field || !token) {
    return false;
  }
  const normalizedField = normalizeKey(field);
  const normalizedToken = normalizeKey(token);
  return (
    normalizedField === normalizedToken ||
    normalizedField.includes(normalizedToken) ||
    normalizedToken.includes(normalizedField)
  );
}

function selectCandidate(
  candidates: PlaceCandidate[],
  tokens: string[],
): { candidate: PlaceCandidate; why: string } | null {
  if (!candidates.length) {
    return null;
  }

  const secondaryTokens = tokens.slice(1).map(normalizeKey).filter(Boolean);
  if (secondaryTokens.length > 0) {
    for (const token of secondaryTokens) {
      const matched = candidates.find(
        (candidate) =>
          fieldMatchesToken(candidate.county_unitary ?? "", token) ||
          fieldMatchesToken(candidate.region ?? "", token),
      );
      if (matched) {
        return { candidate: matched, why: `Matched region or county with ${token}` };
      }
    }
  }

  return { candidate: candidates[0], why: "Used first candidate by default" };
}

export function resolvePlaceFromLocationTokens(
  tokens: string[],
  index: PlacesIndex = ukPlacesIndex as PlacesIndex,
): ResolveResult {
  if (!tokens.length) {
    return { kind: "unresolved", why: "No location tokens provided" };
  }

  const primaryKey = normalizeKey(tokens[0]);
  const fallbackKey = normalizeKey(tokens[tokens.length - 1]);
  const keysToTry = [primaryKey];

  if (fallbackKey && fallbackKey !== primaryKey) {
    keysToTry.push(fallbackKey);
  }

  const allowLondonFallback =
    primaryKey.endsWith(" london") || fallbackKey === "london";
  if (allowLondonFallback && !keysToTry.includes("london")) {
    keysToTry.push("london");
  }

  for (const key of keysToTry) {
    const candidates = index.places[key];
    if (!candidates || candidates.length === 0) {
      continue;
    }

    const selected = selectCandidate(candidates, tokens);
    if (!selected) {
      continue;
    }

    return {
      kind: "resolved",
      lat: selected.candidate.lat,
      lon: selected.candidate.lon,
      chosenName: selected.candidate.name,
      why: `Resolved ${key}. ${selected.why}`,
    };
  }

  return { kind: "unresolved", why: "No matching place candidates" };
}
