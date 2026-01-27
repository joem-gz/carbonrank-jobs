import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { initPageScore } from "../../src/features/page_score";
import { EmployerSignalsResult } from "../../src/employer/types";
import { Settings } from "../../src/storage/settings";

const settings: Settings = {
  homePostcode: "SW1A 1AA",
  commuteMode: "car",
  officeDaysPerWeek: 3,
};

const employerResult: EmployerSignalsResult = {
  status: "available",
  candidates: [
    {
      company_number: "123",
      title: "Acme Ltd",
      status: "active",
      address_snippet: "London",
      sic_codes: ["62020"],
      score: 0.92,
      reasons: ["exact_normalized_match"],
    },
  ],
  selectedCandidate: {
    company_number: "123",
    title: "Acme Ltd",
    status: "active",
    address_snippet: "London",
    sic_codes: ["62020"],
    score: 0.92,
    reasons: ["exact_normalized_match"],
  },
  signals: {
    company_number: "123",
    sic_codes: ["62020"],
    sector_intensity_band: "low",
    sector_intensity_value: 0.42,
    sector_intensity_sic_code: "6202",
    sector_description: "Information technology consultancy activities",
    sources: ["companies_house", "ons"],
    cached: false,
  },
};

function loadFixture(path: string): Document {
  const url = new URL(path, import.meta.url);
  const html = readFileSync(url, "utf-8");
  return new DOMParser().parseFromString(html, "text/html");
}

describe("page score UI", () => {
  it("adds a single entry point when JobPosting JSON-LD is present", async () => {
    const doc = loadFixture("../fixtures/jobposting_page.html");
    const scoreLocation = vi.fn().mockResolvedValue({
      status: "no_data",
      reason: "Missing location",
    });
    const fetchEmployerSignals = vi.fn().mockResolvedValue(employerResult);

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
    });
    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
    });

    expect(doc.querySelectorAll("#carbonrank-page-score-root")).toHaveLength(1);
    expect(doc.querySelectorAll(".carbonrank-page-score__pill")).toHaveLength(1);
  });

  it("shows entry point when job drawer modal appears", async () => {
    const doc = loadFixture("../fixtures/reed_search_results_minimal.html");
    const scoreLocation = vi.fn().mockResolvedValue({
      status: "no_data",
      reason: "Missing location",
    });
    const fetchEmployerSignals = vi.fn().mockResolvedValue(employerResult);

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
    });

    expect(doc.querySelectorAll(".carbonrank-page-score__pill")).toHaveLength(0);

    const modalDoc = loadFixture("../fixtures/reed_job_details_drawer_modal.html");
    doc.body?.insertAdjacentHTML(
      "beforeend",
      modalDoc.body?.innerHTML ?? "",
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(doc.querySelectorAll(".carbonrank-page-score__pill")).toHaveLength(1);
  });

  it("renders employer signals summary", async () => {
    const doc = loadFixture("../fixtures/jobposting_page.html");
    const scoreLocation = vi.fn().mockResolvedValue({
      status: "no_data",
      reason: "Missing location",
    });
    const fetchEmployerSignals = vi.fn().mockResolvedValue(employerResult);

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
    });

    const status = doc.querySelector(".carbonrank-page-score__employer-status");
    expect(status?.textContent).toContain("Employer signals: available");
    const sicCodes = doc.querySelector(".carbonrank-page-score__employer-sic");
    expect(sicCodes?.textContent).toContain("6202");
    expect(sicCodes?.textContent).toContain(
      "Information technology consultancy activities",
    );
    const intensity = doc.querySelector(".carbonrank-page-score__employer-intensity");
    expect(intensity?.textContent).toContain("Sector baseline: Low (0.42)");
  });
});
