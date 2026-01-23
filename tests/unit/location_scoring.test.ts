import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreLocation } from "../../src/scoring/location_scoring";
import { Settings } from "../../src/storage/settings";
import { resolvePlaceFromLocationTokens } from "../../src/geo/place_resolver";
import { geocodePostcode } from "../../src/geocoding/postcodes";

vi.mock("../../src/geo/place_resolver", () => ({
  resolvePlaceFromLocationTokens: vi.fn(),
}));

vi.mock("../../src/geocoding/postcodes", () => ({
  geocodePostcode: vi.fn(),
}));

const baseSettings: Settings = {
  homePostcode: "SW1A 1AA",
  commuteMode: "car",
  officeDaysPerWeek: 3,
};

describe("scoreLocation", () => {
  const resolveMock = vi.mocked(resolvePlaceFromLocationTokens);
  const geocodeMock = vi.mocked(geocodePostcode);

  beforeEach(() => {
    resolveMock.mockReset();
    geocodeMock.mockReset();
  });

  it("returns wfh status for work from home", async () => {
    const result = await scoreLocation("Work from home", baseSettings);
    expect(result.status).toBe("wfh");
    if (result.status === "wfh") {
      expect(result.breakdown.annualKgCO2e).toBe(0);
    }
    expect(resolveMock).not.toHaveBeenCalled();
    expect(geocodeMock).not.toHaveBeenCalled();
  });

  it("returns no_data for broad locations", async () => {
    const result = await scoreLocation("United Kingdom", baseSettings);
    expect(result).toEqual({ status: "no_data", reason: "Location too broad" });
    expect(resolveMock).not.toHaveBeenCalled();
    expect(geocodeMock).not.toHaveBeenCalled();
  });

  it("returns set_postcode when home postcode is missing", async () => {
    const result = await scoreLocation("London", {
      ...baseSettings,
      homePostcode: "",
    });
    expect(result).toEqual({ status: "set_postcode" });
  });

  it("returns ok when a place resolves and home geocode succeeds", async () => {
    resolveMock.mockReturnValue({
      kind: "resolved",
      lat: 51.5072,
      lon: -0.1276,
      chosenName: "London",
      why: "Resolved london",
    });
    geocodeMock.mockResolvedValue({ latitude: 51.5, longitude: -0.1 });

    const result = await scoreLocation("London", baseSettings);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.placeName).toBe("London");
    }
  });

  it("returns no_data when the place cannot be resolved", async () => {
    resolveMock.mockReturnValue({ kind: "unresolved", why: "No match" });

    const result = await scoreLocation("Basingstoke", baseSettings);
    expect(result).toEqual({ status: "no_data", reason: "Cannot resolve place" });
  });

  it("returns error when home postcode lookup fails", async () => {
    resolveMock.mockReturnValue({
      kind: "resolved",
      lat: 51.5072,
      lon: -0.1276,
      chosenName: "London",
      why: "Resolved london",
    });
    geocodeMock.mockResolvedValue(null);

    const result = await scoreLocation("London", baseSettings);
    expect(result).toEqual({ status: "error", reason: "Home postcode lookup failed" });
  });
});
