import { describe, expect, it } from "vitest";
import { haversineDistanceKm } from "../../src/scoring/haversine";

describe("haversineDistanceKm", () => {
  it("calculates distance within expected range", () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };

    const distance = haversineDistanceKm(london, paris);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(350);
  });
});
