import { describe, expect, it } from "vitest";
import {
  extractJobPostingJsonLd,
  formatJobLocation,
  isRemoteJobPosting,
  JobPostingExtract,
} from "../../src/extractors/jobposting_jsonld";

function loadDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("JobPosting JSON-LD extractor", () => {
  it("parses a minimal JobPosting", () => {
    const doc = loadDoc(`
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Data Analyst",
          "hiringOrganization": { "name": "Acme Analytics" },
          "jobLocation": {
            "address": {
              "addressLocality": "Manchester",
              "addressRegion": "Greater Manchester",
              "addressCountry": "UK"
            }
          }
        }
      </script>
    `);

    const result = extractJobPostingJsonLd(doc);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Data Analyst");
    expect(result[0].hiringOrganizationName).toBe("Acme Analytics");
    expect(formatJobLocation(result[0])).toBe("Manchester, Greater Manchester, UK");
  });

  it("parses JobPosting entries inside @graph", () => {
    const doc = loadDoc(`
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "BreadcrumbList" },
            { "@type": "JobPosting", "title": "Platform Engineer" }
          ]
        }
      </script>
    `);

    const result = extractJobPostingJsonLd(doc);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Platform Engineer");
  });

  it("parses JobPosting entries inside arrays", () => {
    const doc = loadDoc(`
      <script type="application/ld+json">
        [
          { "@type": "BreadcrumbList" },
          { "@type": "JobPosting", "title": "Product Designer" }
        ]
      </script>
    `);

    const result = extractJobPostingJsonLd(doc);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Product Designer");
  });

  it("handles missing fields with defaults", () => {
    const doc = loadDoc(`
      <script type="application/ld+json">
        { "@type": "JobPosting" }
      </script>
    `);

    const result = extractJobPostingJsonLd(doc);
    expect(result).toEqual([
      {
        title: "",
        hiringOrganizationName: "",
        jobLocations: [],
        jobLocationType: [],
        applicantLocationRequirements: [],
      },
    ]);
  });
});

describe("JobPosting remote detection", () => {
  it("treats TELECOMMUTE jobLocationType as remote", () => {
    const posting: JobPostingExtract = {
      title: "",
      hiringOrganizationName: "",
      jobLocations: [],
      jobLocationType: ["TELECOMMUTE"],
      applicantLocationRequirements: [],
    };

    expect(isRemoteJobPosting(posting)).toBe(true);
  });

  it("treats applicantLocationRequirements as remote", () => {
    const posting: JobPostingExtract = {
      title: "",
      hiringOrganizationName: "",
      jobLocations: [],
      jobLocationType: [],
      applicantLocationRequirements: ["Remote - UK"],
    };

    expect(isRemoteJobPosting(posting)).toBe(true);
  });
});
