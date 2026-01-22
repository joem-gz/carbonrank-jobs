import { describe, expect, it } from "vitest";
import { classifyLocation } from "../../src/geo/location_classifier";

describe("classifyLocation", () => {
  it("classifies work from home locations", () => {
    expect(classifyLocation("Work from home")).toEqual({ kind: "wfh" });
    expect(classifyLocation("Remote")).toEqual({ kind: "wfh" });
  });

  it("classifies broad locations as no data", () => {
    expect(classifyLocation("United Kingdom")).toEqual({
      kind: "no_data",
      reason: "Location too broad",
    });
    expect(classifyLocation("UK")).toEqual({
      kind: "no_data",
      reason: "Location too broad",
    });
  });

  it("classifies place locations and tokenises commas", () => {
    expect(classifyLocation("London")).toEqual({
      kind: "place",
      raw: "London",
      tokens: ["London"],
    });

    expect(classifyLocation("North London, London")).toEqual({
      kind: "place",
      raw: "North London, London",
      tokens: ["North London", "London"],
    });

    expect(classifyLocation("Newbury, Berkshire")).toEqual({
      kind: "place",
      raw: "Newbury, Berkshire",
      tokens: ["Newbury", "Berkshire"],
    });

    expect(classifyLocation("Harrow, Middlesex")).toEqual({
      kind: "place",
      raw: "Harrow, Middlesex",
      tokens: ["Harrow", "Middlesex"],
    });
  });
});
