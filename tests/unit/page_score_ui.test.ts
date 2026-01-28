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
    sbti: {
      match_status: "matched",
      match_confidence: 1,
      matched_company_name: "Acme Ltd",
      sbti_id: "40001234",
      near_term_status: "Targets set",
      near_term_target_classification: "1.5°C",
      near_term_target_year: "2030",
      net_zero_status: "Committed",
      net_zero_year: "2040",
      ba15_status: "BA1.5 member",
      date_updated: "2025-01-12",
      reason_for_extension_or_removal: null,
      sources: ["SBTi Companies Taking Action (snapshot)"],
    },
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
    const fetchEmployerResolve = vi.fn().mockResolvedValue({
      candidates: [],
      cached: false,
    });

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      fetchEmployerResolve,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
    });
    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      fetchEmployerResolve,
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
    const fetchEmployerResolve = vi.fn().mockResolvedValue({
      candidates: [],
      cached: false,
    });

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      fetchEmployerResolve,
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
    const fetchEmployerResolve = vi.fn().mockResolvedValue({
      candidates: [],
      cached: false,
    });

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      fetchEmployerResolve,
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
    const sbtiBadge = doc.querySelector(".carbonrank-page-score__employer-sbti-badge");
    expect(sbtiBadge?.textContent).toContain("Targets set");
    const sbtiDetails = doc.querySelector(
      ".carbonrank-page-score__employer-sbti-details",
    );
    expect(sbtiDetails?.textContent).toContain("Matched: Acme Ltd");
    expect(sbtiDetails?.textContent).toContain("Near-term: Targets set");
  });

  it("shows employer not disclosed for agency posters", async () => {
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Temp role",
            "hiringOrganization": { "name": "Office Angels" },
            "jobLocation": { "address": { "addressLocality": "Oxford" } }
          }
        </script>
        <div>Office Angels is an employment agency acting on behalf of clients.</div>
      </body>`,
      "text/html",
    );
    const scoreLocation = vi.fn().mockResolvedValue({
      status: "no_data",
      reason: "Missing location",
    });
    const fetchEmployerSignals = vi.fn().mockResolvedValue({
      status: "error",
      candidates: [],
    });
    const fetchEmployerResolve = vi.fn().mockResolvedValue({
      candidates: [
        {
          company_number: "001",
          title: "Office Angels",
          status: "active",
          address_snippet: "London",
          sic_codes: ["78109"],
          score: 0.9,
          reasons: ["exact_normalized_match"],
          org_classification: "agency",
          classification_reasons: ["sic_78109"],
        },
      ],
      cached: false,
    });

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
      fetchEmployerSignals,
      fetchEmployerResolve,
      getEmployerOverride: async () => null,
      setEmployerOverride: async () => {},
      clearEmployerOverride: async () => {},
      getEmployerOverrideForPoster: async () => null,
      setEmployerOverrideForPoster: async () => {},
      clearEmployerOverrideForPoster: async () => {},
    });

    const matchName = doc.querySelector(".carbonrank-page-score__employer-name");
    expect(matchName?.textContent).toContain("Employer not disclosed");
    const advertiser = doc.querySelector(
      ".carbonrank-page-score__employer-advertiser",
    );
    expect(advertiser?.textContent).toContain("Office Angels");
    expect(fetchEmployerSignals).not.toHaveBeenCalled();
  });
});
