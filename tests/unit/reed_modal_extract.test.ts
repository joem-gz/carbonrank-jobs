import { describe, expect, it } from "vitest";
import { extractReedModalJobPosting } from "../../src/sites/reed/job_details_modal";

describe("extractReedModalJobPosting", () => {
  it("reads location from metadata selector", () => {
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>
        <section data-qa="job-details-drawer-modal">
          <div data-qa="job-title">IT Director</div>
          <div data-qa="job-posted-by">Posted by Robert Walters</div>
          <ul>
            <li data-qa="job-metadata-location">Leeds, West Yorkshire</li>
          </ul>
        </section>
      </body>`,
      "text/html",
    );

    const result = extractReedModalJobPosting(doc);

    expect(result?.jobLocations[0]?.addressLocality).toBe("Leeds, West Yorkshire");
  });
});
