import { describe, expect, it } from "vitest";
import { scoreAdzunaJob } from "../../src/search/scoring";
import { ProxyJob } from "../../src/search/types";
import { Settings } from "../../src/storage/settings";

const settings: Settings = {
  homePostcode: "SW1A 1AA",
  commuteMode: "car",
  officeDaysPerWeek: 3,
};

const home = { latitude: 51.501, longitude: -0.141 };

describe("scoreAdzunaJob", () => {
  it("scores jobs with lat/lon", () => {
    const job: ProxyJob = {
      id: "1",
      title: "London Role",
      company: "Acme",
      redirect_url: "https://example.com",
      created: "",
      description_snippet: "",
      location_name: "London",
      lat: 51.5072,
      lon: -0.1276,
    };

    const result = scoreAdzunaJob(job, settings, home);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.breakdown.annualKgCO2e).toBeGreaterThan(0);
    }
  });

  it("returns wfh for remote-only override", () => {
    const job: ProxyJob = {
      id: "2",
      title: "Remote Role",
      company: "Remote Co",
      redirect_url: "https://example.com",
      created: "",
      description_snippet: "",
      location_name: "Remote",
      lat: null,
      lon: null,
    };

    const result = scoreAdzunaJob(job, settings, home, { remoteOverride: true });
    expect(result.status).toBe("wfh");
  });

  it("returns no_data for broad locations", () => {
    const job: ProxyJob = {
      id: "3",
      title: "UK Role",
      company: "Acme",
      redirect_url: "https://example.com",
      created: "",
      description_snippet: "",
      location_name: "United Kingdom",
      lat: null,
      lon: null,
    };

    const result = scoreAdzunaJob(job, settings, home);
    expect(result).toEqual({ status: "no_data", reason: "Location too broad" });
  });

  it("returns set_postcode when home is missing", () => {
    const job: ProxyJob = {
      id: "4",
      title: "London Role",
      company: "Acme",
      redirect_url: "https://example.com",
      created: "",
      description_snippet: "",
      location_name: "London",
      lat: 51.5072,
      lon: -0.1276,
    };

    const result = scoreAdzunaJob(job, { ...settings, homePostcode: "" }, home);
    expect(result).toEqual({ status: "set_postcode" });
  });
});
