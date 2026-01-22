import { Settings } from "../storage/settings";
import { extractPostcode } from "./postcode";
import { ParsedJobCard, ScoreResult } from "./types";

export function scoreJob(job: ParsedJobCard, settings: Settings): ScoreResult {
  const jobPostcode = extractPostcode(job.locationText);
  if (!jobPostcode) {
    return { status: "unknown", reason: "Missing job postcode" };
  }

  if (!settings.homePostcode.trim()) {
    return { status: "unknown", reason: "Missing home postcode" };
  }

  return {
    status: "ok",
    jobPostcode,
  };
}
