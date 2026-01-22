import emissionFactors from "./emission_factors_uk.json";
import { classifyLocation } from "../geo/location_classifier";
import { Settings } from "../storage/settings";
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

export function scoreLocationOnly(locationName: string, settings: Settings): ScoreResult {
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

  return { status: "loading" };
}
