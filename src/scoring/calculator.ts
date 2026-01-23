import emissionFactors from "./emission_factors_uk.json";
import { haversineDistanceKm } from "./haversine";
import { GeocodeResult, ScoreBreakdown } from "./types";
import { Settings } from "../storage/settings";

export const WORK_WEEKS_PER_YEAR = 46;

export function buildScore(
  settings: Settings,
  home: GeocodeResult,
  jobLocation: GeocodeResult,
): ScoreBreakdown {
  const distanceKm = haversineDistanceKm(
    { lat: home.latitude, lng: home.longitude },
    { lat: jobLocation.latitude, lng: jobLocation.longitude },
  );

  const annualKm =
    2 * distanceKm * settings.officeDaysPerWeek * WORK_WEEKS_PER_YEAR;

  const emissionFactor = emissionFactors.modes[settings.commuteMode];
  const annualKgCO2e = annualKm * emissionFactor;

  const breakdown: ScoreBreakdown = {
    distanceKm,
    officeDaysPerWeek: settings.officeDaysPerWeek,
    annualKm,
    emissionFactorKgPerKm: emissionFactor,
    annualKgCO2e,
  };

  return breakdown;
}
