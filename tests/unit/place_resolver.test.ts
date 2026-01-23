import { describe, expect, it } from "vitest";
import { resolvePlaceFromLocationTokens } from "../../src/geo/place_resolver";
import mockIndex from "../fixtures/uk_places_index_mock.json";

describe("resolvePlaceFromLocationTokens", () => {
  it("falls back to London when a sub-region is missing", () => {
    const result = resolvePlaceFromLocationTokens(
      ["West London", "London"],
      mockIndex,
    );

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.chosenName).toBe("London");
    }
  });

  it("disambiguates using a county token", () => {
    const result = resolvePlaceFromLocationTokens(
      ["Newbury", "Berkshire"],
      mockIndex,
    );

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.chosenName).toBe("Newbury");
      expect(result.lat).toBeCloseTo(51.4017, 4);
    }
  });

  it("returns the first candidate when no disambiguation matches", () => {
    const result = resolvePlaceFromLocationTokens(
      ["Harrow", "Middlesex"],
      mockIndex,
    );

    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") {
      expect(result.chosenName).toBe("Harrow");
      expect(result.lat).toBeCloseTo(51.579, 4);
    }
  });

  it("returns unresolved when tokens are empty", () => {
    const result = resolvePlaceFromLocationTokens([], mockIndex);
    expect(result).toEqual({ kind: "unresolved", why: "No location tokens provided" });
  });
});
