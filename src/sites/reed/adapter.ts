import { ParsedJobCard } from "../../scoring/types";
import { ensureBadge } from "../../ui/badge";

export const selectors = {
  stableCardSelectors: [
    "[data-testid=\"job-card\"]",
    "article[data-qa=\"job-card\"]",
    "article.job-result",
    "li[data-qa=\"search-result\"]",
  ],
  jobLinkSelector: "a[href*='/jobs/']",
  fallbackCardClosest: "article, li, div[data-qa], div[data-testid]",
  titleSelectors: ["h2 a", "h3 a", "a[href*='/jobs/']"],
  companySelectors: [
    "[data-qa=\"company-name\"]",
    "[data-testid=\"company-name\"]",
    ".job-company",
    ".company",
  ],
  locationSelectors: [
    "[data-qa=\"location\"]",
    "[data-testid=\"location\"]",
    ".job-location",
    ".location",
  ],
};

export function matches(url: URL): boolean {
  return url.hostname.endsWith("reed.co.uk") && url.pathname.includes("/jobs");
}

export function findCards(root: ParentNode): HTMLElement[] {
  const cards = new Set<HTMLElement>();

  for (const selector of selectors.stableCardSelectors) {
    for (const el of root.querySelectorAll(selector)) {
      if (el instanceof HTMLElement) {
        cards.add(el);
      }
    }
  }

  if (cards.size > 0) {
    return Array.from(cards);
  }

  for (const link of root.querySelectorAll(selectors.jobLinkSelector)) {
    if (!(link instanceof HTMLElement)) {
      continue;
    }
    const card = link.closest(selectors.fallbackCardClosest);
    if (card instanceof HTMLElement) {
      cards.add(card);
    }
  }

  return Array.from(cards);
}

export function injectBadge(cardEl: HTMLElement, text: string): HTMLElement {
  return ensureBadge(cardEl, text);
}

function getTextFromSelectors(cardEl: HTMLElement, selectorList: string[]): string {
  for (const selector of selectorList) {
    const el = cardEl.querySelector(selector);
    if (el && el.textContent) {
      const text = el.textContent.trim();
      if (text) {
        return text;
      }
    }
  }
  return "";
}

export function parseCard(cardEl: HTMLElement): ParsedJobCard {
  const linkEl = cardEl.querySelector(selectors.jobLinkSelector);
  const jobUrl = linkEl instanceof HTMLAnchorElement ? linkEl.href : "";
  const title = getTextFromSelectors(cardEl, selectors.titleSelectors);
  const company = getTextFromSelectors(cardEl, selectors.companySelectors);
  const locationText = getTextFromSelectors(cardEl, selectors.locationSelectors);

  return {
    title,
    company,
    locationText,
    jobUrl,
  };
}
