import { describe, expect, it } from "vitest";
import { sortJobsByCo2 } from "../../src/search/sorting";
import { ScoredJob } from "../../src/search/types";

const baseJob = {
  title: "Role",
  company: "Company",
  redirect_url: "https://example.com",
  created: "",
  description_snippet: "",
  location_name: "London",
  lat: null,
  lon: null,
};

function okScore(value: number) {
  return {
    status: "ok" as const,
    breakdown: {
      distanceKm: 10,
      officeDaysPerWeek: 3,
      annualKm: 100,
      emissionFactorKgPerKm: 0.1,
      annualKgCO2e: value,
    },
    placeName: "London",
  };
}

describe("sortJobsByCo2", () => {
  it("orders by numeric CO2 values", () => {
    const jobs: ScoredJob[] = [
      {
        job: { ...baseJob, id: "no-data" },
        score: { status: "no_data", reason: "Missing" },
        scoreValue: null,
      },
      {
        job: { ...baseJob, id: "remote" },
        score: {
          status: "wfh",
          breakdown: {
            distanceKm: 0,
            officeDaysPerWeek: 3,
            annualKm: 0,
            emissionFactorKgPerKm: 0.1,
            annualKgCO2e: 0,
          },
          reason: "Remote",
        },
        scoreValue: 0,
      },
      {
        job: { ...baseJob, id: "high" },
        score: okScore(250),
        scoreValue: 250,
      },
      {
        job: { ...baseJob, id: "low" },
        score: okScore(120),
        scoreValue: 120,
      },
    ];

    const sorted = sortJobsByCo2(jobs);
    expect(sorted.map((item) => item.job.id)).toEqual([
      "remote",
      "low",
      "high",
      "no-data",
    ]);
  });
});
