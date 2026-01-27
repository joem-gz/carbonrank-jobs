import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type OnsIntensityBand = "low" | "medium" | "high" | "unknown";

export type OnsIntensityMap = {
  meta: {
    source: string;
    generated_at: string;
    band_thresholds: {
      low: number;
      high: number;
    };
  };
  exact: Record<string, number>;
  groups: Record<string, number>;
  descriptions?: Record<string, string>;
};

export type OnsIntensityResult = {
  value: number | null;
  band: OnsIntensityBand;
  matched_code?: string;
  description?: string;
};

const DEFAULT_MAP_PATH = resolve(
  process.cwd(),
  "server",
  "data",
  "ons",
  "ons_intensity_map.json",
);
const FALLBACK_MAP_PATH = resolve(
  process.cwd(),
  "data",
  "ons",
  "ons_intensity_map.json",
);

let cachedMap: OnsIntensityMap | null | undefined;

export function loadOnsIntensityMap(path: string = DEFAULT_MAP_PATH): OnsIntensityMap | null {
  if (cachedMap !== undefined) {
    return cachedMap;
  }

  const candidates = path === DEFAULT_MAP_PATH ? [path, FALLBACK_MAP_PATH] : [path];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const payload = readFileSync(candidate, "utf-8");
      cachedMap = JSON.parse(payload) as OnsIntensityMap;
      return cachedMap;
    } catch (error) {
      lastError = error;
    }
  }
  console.warn("[ONSIntensity] Unable to load map", lastError);
  cachedMap = null;
  return cachedMap;
}

function normalizeSic(code: string): string {
  return code.replace(/[^0-9]/g, "");
}

function pickBand(value: number, thresholds: { low: number; high: number }): OnsIntensityBand {
  if (!Number.isFinite(value)) {
    return "unknown";
  }
  if (value <= thresholds.low) {
    return "low";
  }
  if (value <= thresholds.high) {
    return "medium";
  }
  return "high";
}

function findMatch(code: string, map: OnsIntensityMap): { value: number; matched: string; weight: number } | null {
  const normalized = normalizeSic(code);
  if (!normalized) {
    return null;
  }

  if (normalized.length >= 5) {
    const exactFive = normalized.slice(0, 5);
    if (map.exact[exactFive] !== undefined) {
      return { value: map.exact[exactFive], matched: exactFive, weight: 2 };
    }
  }

  if (normalized.length >= 4) {
    const exactFour = normalized.slice(0, 4);
    if (map.exact[exactFour] !== undefined) {
      return { value: map.exact[exactFour], matched: exactFour, weight: 2 };
    }
  }

  if (normalized.length >= 3) {
    const exactThree = normalized.slice(0, 3);
    if (map.exact[exactThree] !== undefined) {
      return { value: map.exact[exactThree], matched: exactThree, weight: 2 };
    }
  }

  if (normalized.length >= 2) {
    const group = normalized.slice(0, 2);
    if (map.groups[group] !== undefined) {
      return { value: map.groups[group], matched: group, weight: 1 };
    }
  }

  return null;
}

export function resolveOnsIntensity(
  sicCodes: string[],
  map: OnsIntensityMap | null,
): OnsIntensityResult {
  if (!map || sicCodes.length === 0) {
    return { value: null, band: "unknown" };
  }

  const matches = sicCodes
    .map((code) => findMatch(code, map))
    .filter(Boolean) as Array<{ value: number; matched: string; weight: number }>;

  if (matches.length === 0) {
    return { value: null, band: "unknown" };
  }

  const best = matches.reduce((current, next) => {
    if (next.weight !== current.weight) {
      return next.weight > current.weight ? next : current;
    }
    return next.value > current.value ? next : current;
  });

  let description = map.descriptions?.[best.matched];
  if (!description && map.descriptions && best.matched.length > 2) {
    description = map.descriptions[best.matched.slice(0, 2)];
  }

  return {
    value: best.value,
    band: pickBand(best.value, map.meta.band_thresholds),
    matched_code: best.matched,
    description,
  };
}
