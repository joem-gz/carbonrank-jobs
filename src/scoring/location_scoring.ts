import emissionFactors from "./emission_factors_uk.json";
import { classifyLocation } from "../geo/location_classifier";
import { resolvePlaceFromLocationTokens } from "../geo/place_resolver";
import { geocodePostcode } from "../geocoding/postcodes";
import { Settings } from "../storage/settings";
import { buildScore } from "./calculator";
import { ScoreBreakdown, ScoreResult } from "./types";

function buildWfhBreakdown(settings: Settings): ScoreBreakdown {
  return {
    distanceKm: 0,
    officeDaysPerWeek: settings.officeDaysPerWeek,
    annualKm: 0,
    emissionFactorKgPerKm: emissionFactors.modes[settings.commuteMode],
    annualKgCO2e: 0,
  };
}

export async function scoreLocation(
  locationName: string,
  settings: Settings,
): Promise<ScoreResult> {
  if (!settings.homePostcode.trim()) {
    return { status: "set_postcode" };
  }

  const classification = classifyLocation(locationName);
  if (classification.kind === "wfh") {
    return {
      status: "wfh",
      breakdown: buildWfhBreakdown(settings),
      reason: "Assumed work from home",
    };
  }

  if (classification.kind === "no_data") {
    return {
      status: "no_data",
      reason: classification.reason,
    };
  }

  const resolved = resolvePlaceFromLocationTokens(classification.tokens);
  if (resolved.kind === "unresolved") {
    return {
      status: "no_data",
      reason: "Cannot resolve place",
    };
  }

  const home = await geocodePostcode(settings.homePostcode);
  if (!home) {
    return {
      status: "error",
      reason: "Home postcode lookup failed",
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
