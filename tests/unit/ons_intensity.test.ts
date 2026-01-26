import { describe, expect, it } from "vitest";
import { OnsIntensityMap, resolveOnsIntensity } from "../../server/ons_intensity";

const map: OnsIntensityMap = {
  meta: {
    source: "test",
    generated_at: "2026-01-26",
    band_thresholds: {
      low: 1,
      high: 3,
    },
  },
  exact: {
    "6202": 0.5,
    "2011": 4,
  },
  groups: {
    "62": 0.8,
    "20": 2,
  },
};

describe("ONS intensity mapping", () => {
  it("returns unknown when no SIC codes", () => {
    expect(resolveOnsIntensity([], map)).toEqual({
      value: null,
      band: "unknown",
    });
  });

  it("prefers exact SIC matches", () => {
    const result = resolveOnsIntensity(["6202"], map);
    expect(result).toEqual({
      value: 0.5,
      band: "low",
      matched_code: "6202",
    });
  });

  it("falls back to SIC2 group when needed", () => {
    const result = resolveOnsIntensity(["6210"], map);
    expect(result).toEqual({
      value: 0.8,
      band: "low",
      matched_code: "62",
    });
  });

  it("selects highest specificity before value", () => {
    const result = resolveOnsIntensity(["2011", "62"], map);
    expect(result).toEqual({
      value: 4,
      band: "high",
      matched_code: "2011",
    });
  });
});
