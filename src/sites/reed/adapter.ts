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
