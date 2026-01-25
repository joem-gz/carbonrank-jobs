import emissionFactors from "../scoring/emission_factors_uk.json";
import { classifyLocation } from "../geo/location_classifier";
import { resolvePlaceFromLocationTokens } from "../geo/place_resolver";
import { buildScore } from "../scoring/calculator";
import { GeocodeResult, ScoreBreakdown, ScoreResult } from "../scoring/types";
import { Settings } from "../storage/settings";
import { ProxyJob, ScoredJob } from "./types";

export type ScoreOptions = {
  remoteOverride?: boolean;
};

function buildWfhBreakdown(settings: Settings): ScoreBreakdown {
  return {
    distanceKm: 0,
    officeDaysPerWeek: settings.officeDaysPerWeek,
    annualKm: 0,
    emissionFactorKgPerKm: emissionFactors.modes[settings.commuteMode],
    annualKgCO2e: 0,
  };
}

export function scoreAdzunaJob(
  job: ProxyJob,
  settings: Settings,
  home: GeocodeResult | null,
  options: ScoreOptions = {},
): ScoreResult {
  if (!settings.homePostcode.trim()) {
    return { status: "set_postcode" };
  }

  if (options.remoteOverride) {
    return {
      status: "wfh",
      breakdown: buildWfhBreakdown(settings),
      reason: "Remote-only search",
    };
  }

  const classification = classifyLocation(job.location_name);
  if (classification.kind === "wfh") {
    return {
      status: "wfh",
      breakdown: buildWfhBreakdown(settings),
      reason: "Remote role",
    };
  }

  if (classification.kind === "no_data") {
    return {
      status: "no_data",
      reason: classification.reason,
    };
  }

  if (!home) {
    return {
      status: "error",
      reason: "Home postcode lookup failed",
    };
  }

  if (typeof job.lat === "number" && typeof job.lon === "number") {
    const breakdown = buildScore(settings, home, {
      latitude: job.lat,
      longitude: job.lon,
    });
    return {
      status: "ok",
      breakdown,
      placeName: job.location_name,
    };
  }

  const resolved = resolvePlaceFromLocationTokens(classification.tokens);
  if (resolved.kind === "unresolved") {
    return {
      status: "no_data",
      reason: "Cannot resolve place",
    };
  }

  const breakdown = buildScore(settings, home, {
    latitude: resolved.lat,
    longitude: resolved.lon,
  });

  return {
    status: "ok",
    breakdown,
    placeName: resolved.chosenName,
  };
}

function toScoreValue(result: ScoreResult): number | null {
  if (result.status === "ok") {
    return result.breakdown.annualKgCO2e;
  }
  if (result.status === "wfh") {
    return 0;
  }
  return null;
}

export function scoreJobs(
  jobs: ProxyJob[],
  settings: Settings,
  home: GeocodeResult | null,
  options: ScoreOptions = {},
): ScoredJob[] {
  return jobs.map((job) => {
    const score = scoreAdzunaJob(job, settings, home, options);
    return {
      job,
      score,
      scoreValue: toScoreValue(score),
    };
  });
}
