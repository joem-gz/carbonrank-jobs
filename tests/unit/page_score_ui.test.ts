import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { initPageScore } from "../../src/features/page_score";
import { Settings } from "../../src/storage/settings";

const settings: Settings = {
  homePostcode: "SW1A 1AA",
  commuteMode: "car",
  officeDaysPerWeek: 3,
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

    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
    });
    await initPageScore({
      doc,
      getSettings: async () => settings,
      scoreLocation,
    });

    expect(doc.querySelectorAll("#carbonrank-page-score-root")).toHaveLength(1);
    expect(doc.querySelectorAll(".carbonrank-page-score__pill")).toHaveLength(1);
  });
});
