import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCards, injectBadge, parseCard } from "../../src/sites/reed/adapter";
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

  it("finds cards with job-title button layout", () => {
    const doc = loadFixture("../fixtures/reed_search_results_button.html");
    const cards = findCards(doc);
    expect(cards).toHaveLength(1);

    const parsed = parseCard(cards[0]);
    expect(parsed.title).toBe("Private Client Tax Senior");
    expect(parsed.company).toBe("Austin Rose");
    expect(parsed.locationText).toBe("Work from home");
    expect(parsed.jobUrl).toBe("https://www.reed.co.uk/jobs/private-client-tax-senior/56365685");
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

  it("parses job title, company, location, and url", () => {
    const doc = loadFixture("../fixtures/reed_search_results_minimal.html");
    const card = findCards(doc)[0];
    const parsed = parseCard(card);

    expect(parsed.title).toBe("Software Engineer");
    expect(parsed.company).toBe("Acme Analytics");
    expect(parsed.locationText).toBe("London SW1A 1AA");
    expect(parsed.jobUrl).toBe("https://www.reed.co.uk/jobs/software-engineer/12345");
  });

  it("parses cards using fallback selectors", () => {
    const doc = loadFixture("../fixtures/reed_search_results_variant.html");
    const card = findCards(doc)[1];
    const parsed = parseCard(card);

    expect(parsed.title).toBe("QA Engineer");
    expect(parsed.company).toBe("Foundry Labs");
    expect(parsed.locationText).toBe("Leeds LS1 2AA");
    expect(parsed.jobUrl).toBe("https://www.reed.co.uk/jobs/qa-engineer/222");
  });
});
