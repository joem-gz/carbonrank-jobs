import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCards, injectBadge } from "../../src/sites/reed/adapter";
import { BADGE_ATTR } from "../../src/ui/badge";

function loadFixture(path: string): Document {
  const url = new URL(path, import.meta.url);
  const html = readFileSync(url, "utf-8");
  return new DOMParser().parseFromString(html, "text/html");
}

describe("reed adapter", () => {
  it("finds cards via stable selectors", () => {
    const doc = loadFixture("../fixtures/reed_search_results_minimal.html");
    const cards = findCards(doc);
    expect(cards).toHaveLength(2);
  });

  it("finds cards via fallback link heuristics", () => {
    const doc = loadFixture("../fixtures/reed_search_results_variant.html");
    const cards = findCards(doc);
    expect(cards).toHaveLength(2);
  });

  it("injects a single badge per card", () => {
    const doc = loadFixture("../fixtures/reed_search_results_minimal.html");
    const cards = findCards(doc);

    const card = cards[0];
    injectBadge(card, "CarbonRank");
    injectBadge(card, "CarbonRank");

    const badges = card.querySelectorAll(`[${BADGE_ATTR}]`);
    expect(badges).toHaveLength(1);
  });
});
