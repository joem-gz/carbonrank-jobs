import { describe, expect, it } from "vitest";
import { extractPostcode } from "../../src/scoring/postcode";

describe("extractPostcode", () => {
  it("finds a postcode within location text", () => {
    expect(extractPostcode("London SW1A 1AA")).toBe("SW1A 1AA");
    expect(extractPostcode("Manchester M11AE")).toBe("M1 1AE");
  });

  it("returns null when no postcode present", () => {
    expect(extractPostcode("Remote")).toBeNull();
    expect(extractPostcode("UK Wide")).toBeNull();
  });
});
