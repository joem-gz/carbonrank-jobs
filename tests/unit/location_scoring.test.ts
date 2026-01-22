import { describe, expect, it } from "vitest";
import { scoreLocationOnly } from "../../src/scoring/location_scoring";
import { Settings } from "../../src/storage/settings";

const baseSettings: Settings = {
  homePostcode: "SW1A 1AA",
  commuteMode: "car",
  officeDaysPerWeek: 3,
};

describe("scoreLocationOnly", () => {
  it("returns wfh status for work from home", () => {
    const result = scoreLocationOnly("Work from home", baseSettings);
    expect(result.status).toBe("wfh");
    if (result.status === "wfh") {
      expect(result.breakdown.annualKgCO2e).toBe(0);
    }
  });

  it("returns no_data for broad locations", () => {
    const result = scoreLocationOnly("United Kingdom", baseSettings);
    expect(result).toEqual({ status: "no_data", reason: "Location too broad" });
  });

  it("returns set_postcode when home postcode is missing", () => {
    const result = scoreLocationOnly("London", {
      ...baseSettings,
      homePostcode: "",
    });
    expect(result).toEqual({ status: "set_postcode" });
  });
});
