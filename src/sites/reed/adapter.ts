import { ParsedJobCard } from "../../scoring/types";
import { ensureBadge } from "../../ui/badge";

export const selectors = {
  stableCardSelectors: [
    "[data-testid=\"job-card\"]",
    "article[data-qa=\"job-card\"]",
    "article.job-result",
    "li[data-qa=\"search-result\"]",
    "div[data-qa=\"job-card\"]",
    "div[class*=\"job-card_jobCard__body\"]",
  ],
  jobLinkSelector:
    "a[data-qa=\"job-card-title\"], button[data-qa=\"job-title-btn-wrapper\"], a[href*='/jobs/']",
  fallbackCardClosest:
    "div[class*=\"job-card_jobCard__body\"], div[data-qa=\"job-card\"], article[data-qa=\"job-card\"], article.job-result, li[data-qa=\"search-result\"], article, li, section",
  titleSelectors: [
    "button[data-qa=\"job-title-btn-wrapper\"]",
    "[data-qa=\"job-card-title\"]",
    "h2 a",
    "h3 a",
    "a[href*='/jobs/']",
  ],
  companySelectors: [
    "[data-qa=\"company-name\"]",
    "[data-testid=\"company-name\"]",
    ".job-company",
    ".company",
    "a[data-page-component=\"job_card\"][data-element=\"recruiter\"]",
    ".gtmJobListingPostedBy",
  ],
  locationSelectors: [
    "li[data-qa=\"job-card-location\"]",
    "[data-qa=\"job-metadata-location\"]",
    "[data-qa=\"location\"]",
    "[data-testid=\"location\"]",
    ".job-location",
    ".location",
  ],
};

const PREFERRED_CARD_SELECTOR = "div[class*=\"job-card_jobCard__body\"]";
const EXCLUDED_CONTAINER_SELECTOR =
  "[aria-label*='breadcrumb' i], [class*='breadcrumb'], [class*='bread-crumb'], " +
  "[data-qa='job-details-drawer-modal'], " +
  "[data-qa='job-details-drawer-modal-body'], " +
  "[data-qa='job-details-drawer-modal-header']";

export function matches(url: URL): boolean {
  return url.hostname.endsWith("reed.co.uk") && url.pathname.includes("/jobs");
}

function preferCards(cards: HTMLElement[]): HTMLElement[] {
  const preferred = cards.filter((card) => card.matches(PREFERRED_CARD_SELECTOR));
  return preferred.length > 0 ? preferred : cards;
}

function isInExcludedContainer(element: Element): boolean {
  return element.closest(EXCLUDED_CONTAINER_SELECTOR) !== null;
}

function dedupeNested(cards: HTMLElement[]): HTMLElement[] {
  return cards.filter(
    (card) => !cards.some((other) => other !== card && other.contains(card)),
  );
}

export function findCards(root: ParentNode): HTMLElement[] {
  const cards = new Set<HTMLElement>();

  for (const selector of selectors.stableCardSelectors) {
    for (const el of root.querySelectorAll(selector)) {
      if (el instanceof HTMLElement) {
        if (isInExcludedContainer(el)) {
          continue;
        }
        cards.add(el);
      }
    }
  }

  if (cards.size > 0) {
    const preferred = preferCards(Array.from(cards));
    return dedupeNested(preferred);
  }

  for (const link of root.querySelectorAll(selectors.jobLinkSelector)) {
    if (!(link instanceof HTMLElement)) {
      continue;
    }
    if (isInExcludedContainer(link)) {
      continue;
    }
    const card = link.closest(selectors.fallbackCardClosest);
    if (card instanceof HTMLElement && !isInExcludedContainer(card)) {
      cards.add(card);
    }
  }

  const preferred = preferCards(Array.from(cards));
  return dedupeNested(preferred);
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

function getRemoteLabel(cardEl: HTMLElement): string {
  const remoteIcon = cardEl.querySelector("svg[aria-labelledby=\"title-remote\"]");
  if (!remoteIcon) {
    return "";
  }
  const label = remoteIcon.closest("li")?.textContent?.trim();
  return label ?? "";
}

export function parseCard(cardEl: HTMLElement): ParsedJobCard {
  const linkEl = cardEl.querySelector("a[data-qa=\"job-card-title\"], a[href*='/jobs/']");
  const jobUrl = linkEl instanceof HTMLAnchorElement ? linkEl.href : "";
  const title = getTextFromSelectors(cardEl, selectors.titleSelectors);
  const company = getTextFromSelectors(cardEl, selectors.companySelectors);
  const remoteLabel = getRemoteLabel(cardEl);
  const locationText =
    remoteLabel || getTextFromSelectors(cardEl, selectors.locationSelectors);

  return {
    title,
    company,
    locationText,
    jobUrl,
  };
}
