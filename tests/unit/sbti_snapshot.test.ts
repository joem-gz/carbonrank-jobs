import { describe, expect, it } from "vitest";
import { matchSbtiCompany, SbtiSnapshot } from "../../server/sbti_snapshot";

const snapshot: SbtiSnapshot = {
  records: {
    "1": {
      sbti_id: "1",
      company_name: "Acme Limited",
      location: "United Kingdom",
      region: "Europe",
      sector: "Services",
      near_term_status: "Targets set",
      near_term_target_classification: "1.5°C",
      near_term_target_year: "2030",
      net_zero_status: null,
      net_zero_year: null,
      ba15_status: null,
      date_updated: "2025-01-01",
      reason_for_extension_or_removal: null,
    },
    "2": {
      sbti_id: "2",
      company_name: "Acme Limited",
      location: "United States of America",
      region: "North America",
      sector: "Services",
      near_term_status: "Targets set",
      near_term_target_classification: "1.5°C",
      near_term_target_year: "2030",
      net_zero_status: null,
      net_zero_year: null,
      ba15_status: null,
      date_updated: "2025-01-01",
      reason_for_extension_or_removal: null,
    },
    "3": {
      sbti_id: "3",
      company_name: "Global Energy Solutions",
      location: "United Kingdom",
      region: "Europe",
      sector: "Energy",
      near_term_status: "Committed",
      near_term_target_classification: null,
      near_term_target_year: null,
      net_zero_status: null,
      net_zero_year: null,
      ba15_status: null,
      date_updated: "2025-01-01",
      reason_for_extension_or_removal: null,
    },
    "4": {
      sbti_id: "4",
      company_name: "AB Services",
      location: "United Kingdom",
      region: "Europe",
      sector: "Services",
      near_term_status: "Targets set",
      near_term_target_classification: "1.5°C",
      near_term_target_year: "2030",
      net_zero_status: null,
      net_zero_year: null,
      ba15_status: null,
      date_updated: "2025-01-01",
      reason_for_extension_or_removal: null,
    },
  },
  index: {
    meta: {
      snapshot_file: "test.csv",
      generated_at: "2026-01-27",
      record_count: 4,
      stopwords: [],
    },
    names: {
      acme: ["1", "2"],
      "global energy solutions": ["3"],
      "ab services": ["4"],
    },
    tokens: {
      global: ["3"],
      energy: ["3"],
      solutions: ["3"],
      ab: ["4"],
      services: ["4"],
    },
    records: {
      "1": {
        name_strict: "acme limited",
        name_loose: "acme",
        tokens: ["acme"],
      },
      "2": {
        name_strict: "acme limited",
        name_loose: "acme",
        tokens: ["acme"],
      },
      "3": {
        name_strict: "global energy solutions",
        name_loose: "global energy solutions",
        tokens: ["global", "energy", "solutions"],
      },
      "4": {
        name_strict: "ab services",
        name_loose: "ab services",
        tokens: ["ab", "services"],
      },
    },
  },
};

describe("SBTi matching", () => {
  it("prefers UK record for exact matches", () => {
    const result = matchSbtiCompany("Acme Ltd", snapshot);
    expect(result.match_status).toBe("matched");
    expect(result.sbti_id).toBe("1");
  });

  it("uses fuzzy matching for strong multi-token overlap", () => {
    const result = matchSbtiCompany("Global Energy Solution", snapshot);
    expect(result.match_status).toBe("low_confidence");
    expect(result.sbti_id).toBe("3");
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("skips fuzzy matching for short names", () => {
    const result = matchSbtiCompany("AB Service", snapshot);
    expect(result.match_status).toBe("no_match");
  });
});
