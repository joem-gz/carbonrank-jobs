import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPosterInfo,
  detectAgencyDisclosure,
  extractEmployerCandidateFromJobPosting,
  extractEmployerCandidateFromText,
  extractPosterName,
} from "../../src/employer/agency";
import { JobPostingExtract } from "../../src/extractors/jobposting_jsonld";

describe("agency detection", () => {
  it("detects explicit agency disclosures", () => {
    const html = readFileSync(
      resolve("tests", "fixtures", "reed_agency_disclosure.html"),
      "utf-8",
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const result = detectAgencyDisclosure(doc.body?.textContent ?? "");
    expect(result.isAgency).toBe(true);
    expect(result.reasons).toContain("disclosure_employment_agency");
  });

  it("captures supporting recruiter language", () => {
    const text = "We are recruiting for our client in Oxford.";
    const result = detectAgencyDisclosure(text);
    expect(result.isAgency).toBe(false);
    expect(result.supportingReasons).toContain("hint_recruiting_for");
  });

  it("extracts poster name from posted-by text", () => {
    const doc = new DOMParser().parseFromString(
      "<div data-qa='job-posted-by'>1 week ago by Robert Walters</div>",
      "text/html",
    );
    expect(extractPosterName(doc, "Fallback")).toBe("Robert Walters");
  });

  it("extracts employer candidate from JSON-LD when different", () => {
    const posting: JobPostingExtract = {
      title: "Temp role",
      hiringOrganizationName: "Acme Corp",
      jobLocations: [],
      jobLocationType: [],
      applicantLocationRequirements: [],
    };
    const candidate = extractEmployerCandidateFromJobPosting(posting, "Office Angels");
    expect(candidate?.name).toBe("Acme Corp");
    expect(candidate?.source).toBe("jsonld");
  });

  it("extracts employer candidate from text", () => {
    const text = "Our client is MegaCorp Ltd based in London.";
    const candidate = extractEmployerCandidateFromText(text, "Office Angels");
    expect(candidate?.name).toBe("MegaCorp Ltd");
    expect(candidate?.source).toBe("text");
  });

  it("builds poster info from classification", () => {
    const poster = buildPosterInfo(
      "Office Angels",
      { isAgency: false, reasons: [], supportingReasons: [] },
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
    );

    expect(poster.isAgency).toBe(true);
    expect(poster.reasons).toContain("sic_78109");
  });
});
