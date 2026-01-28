import { JobPostingExtract } from "../../extractors/jobposting_jsonld";

const MODAL_SELECTOR = "[data-qa='job-details-drawer-modal']";
const TITLE_SELECTOR = "[data-qa='job-title']";
const POSTED_BY_SELECTOR = "[data-qa='job-posted-by']";
const LOCATION_SELECTORS = [
  "[data-qa='job-location']",
  "[data-qa='job-metadata-location']",
  "[data-qa='job-location-text']",
];
const LOGO_SELECTOR = "img[data-qa='company-logo-image']";

function readText(container: Element, selector: string): string {
  const el = container.querySelector(selector);
  if (!el || !el.textContent) {
    return "";
  }
  return el.textContent.replace(/\s+/g, " ").trim();
}

function readTextFromSelectors(container: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const text = readText(container, selector);
    if (text) {
      return text;
    }
  }
  return "";
}

function readLogoAlt(container: Element): string {
  const logo = container.querySelector<HTMLImageElement>(LOGO_SELECTOR);
  if (!logo) {
    return "";
  }
  const alt = logo.getAttribute("alt")?.trim() ?? "";
  return alt.replace(/\s+jobs?$/i, "").trim();
}

function extractCompanyName(postedBy: string, logoAlt: string): string {
  if (postedBy) {
    const normalized = postedBy.trim();
    const lower = normalized.toLowerCase();
    const marker = " by ";
    const index = lower.lastIndexOf(marker);
    if (index >= 0) {
      const candidate = normalized.slice(index + marker.length).trim();
      if (candidate) {
        return candidate;
      }
    }
    return normalized;
  }
  return logoAlt;
}

export function findReedModal(doc: Document): Element | null {
  return doc.querySelector(MODAL_SELECTOR);
}

export function extractReedModalJobPosting(doc: Document): JobPostingExtract | null {
  const modal = findReedModal(doc);
  if (!modal) {
    return null;
  }

  const title = readText(modal, TITLE_SELECTOR);
  const postedBy = readText(modal, POSTED_BY_SELECTOR);
  const locationText = readTextFromSelectors(modal, LOCATION_SELECTORS);
  const company = extractCompanyName(postedBy, readLogoAlt(modal));

  if (!title && !company && !locationText) {
    return null;
  }

  return {
    title,
    hiringOrganizationName: company,
    jobLocations: locationText ? [{ addressLocality: locationText }] : [],
    jobLocationType: [],
    applicantLocationRequirements: [],
  };
}
