import { describe, expect, it, vi } from "vitest";
import {
  createWidgetService,
  WidgetScoreRequest,
  WidgetScoreResponse,
} from "../../server/widget_service";

const baseRequest: WidgetScoreRequest = {
  locationName: "London",
  lat: 51.5074,
  lon: -0.1278,
};

const okResponse: WidgetScoreResponse = {
  status: "ok",
  badgeText: "10 kgCO2e/yr",
  score: 10,
  breakdown: {
    distanceKm: 2,
    officeDaysPerWeek: 3,
    annualKm: 120,
    emissionFactorKgPerKm: 0.2,
    annualKgCO2e: 10,
  },
};

describe("widget API service", () => {
  it("rejects invalid API keys", () => {
    const service = createWidgetService({
      partners: [{ key: "valid", name: "Test", origins: ["https://partner.test"] }],
    });

    const result = service.handleScoreRequest(baseRequest, {
      apiKey: "invalid",
      origin: "https://partner.test",
      ip: "127.0.0.1",
    });

    expect(result.status).toBe(401);
  });

  it("enforces partner origin allowlists", () => {
    const service = createWidgetService({
      partners: [{ key: "valid", name: "Test", origins: ["https://allowed.test"] }],
    });

    const result = service.handleScoreRequest(baseRequest, {
      apiKey: "valid",
      origin: "https://blocked.test",
      ip: "127.0.0.1",
    });

    expect(result.status).toBe(403);
  });

  it("applies rate limits per partner", () => {
    const service = createWidgetService(
      {
        partners: [
          {
            key: "valid",
            name: "Test",
            origins: ["https://partner.test"],
            rateLimit: { windowMs: 60_000, max: 1 },
          },
        ],
      },
      {
        scoreJob: () => okResponse,
      },
    );

    const context = {
      apiKey: "valid",
      origin: "https://partner.test",
      ip: "127.0.0.1",
    };

    const first = service.handleScoreRequest(baseRequest, context);
    const second = service.handleScoreRequest(baseRequest, context);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it("caches score responses by job URL", () => {
    const scoreJob = vi.fn(() => okResponse);
    const service = createWidgetService(
      {
        partners: [
          {
            key: "valid",
            name: "Test",
            origins: ["https://partner.test"],
          },
        ],
      },
      { scoreJob },
    );

    const request = {
      ...baseRequest,
      jobUrl: "https://partner.test/jobs/123",
    };

    const context = {
      apiKey: "valid",
      origin: "https://partner.test",
      ip: "127.0.0.1",
    };

    const first = service.handleScoreRequest(request, context);
    const second = service.handleScoreRequest(request, context);

    expect(first.status).toBe(200);
    expect(second.headers?.["X-CarbonRank-Cache"]).toBe("HIT");
    expect(scoreJob).toHaveBeenCalledTimes(1);
  });
});
