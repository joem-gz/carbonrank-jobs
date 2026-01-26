import {
  extractJobPostingJsonLd,
  formatJobLocation,
  isRemoteJobPosting,
  JobPostingExtract,
} from "../../extractors/jobposting_jsonld";
import { extractReedModalJobPosting } from "../../sites/reed/job_details_modal";
import { scoreLocation } from "../../scoring/location_scoring";
import { ScoreBreakdown, ScoreResult } from "../../scoring/types";
import { getSettings, Settings } from "../../storage/settings";
import { noopTelemetry, Telemetry } from "../../telemetry";
import { ensureStyles } from "../../ui/badge";
import pageScoreStyles from "./page_score.css";

const ROOT_ID = "carbonrank-page-score-root";
const STYLE_ID = "carbonrank-page-score-styles";

type PageScoreElements = {
  root: HTMLElement;
  pill: HTMLButtonElement;
  panel: HTMLDivElement;
  closeButton: HTMLButtonElement;
  title: HTMLElement;
  company: HTMLElement;
  location: HTMLElement;
  scoreValue: HTMLElement;
  scoreReason: HTMLElement;
  breakdown: HTMLElement;
};

export type PageScoreDependencies = {
  doc?: Document;
  getSettings?: () => Promise<Settings>;
  scoreLocation?: (locationName: string, settings: Settings) => Promise<ScoreResult>;
  telemetry?: Telemetry;
};

type JobPostingContext = {
  jobPosting: JobPostingExtract;
  locationText: string;
  isRemote: boolean;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  text = "",
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  el.className = className;
  if (text) {
    el.textContent = text;
  }
  return el;
}

function ensurePageScoreElements(doc: Document): PageScoreElements {
  const existing = doc.getElementById(ROOT_ID);
  if (existing) {
    return {
      root: existing,
      pill: existing.querySelector(".carbonrank-page-score__pill") as HTMLButtonElement,
      panel: existing.querySelector(".carbonrank-page-score__panel") as HTMLDivElement,
      closeButton: existing.querySelector(
        ".carbonrank-page-score__close",
      ) as HTMLButtonElement,
      title: existing.querySelector(".carbonrank-page-score__job-title") as HTMLElement,
      company: existing.querySelector(".carbonrank-page-score__job-company") as HTMLElement,
      location: existing.querySelector(".carbonrank-page-score__job-location") as HTMLElement,
      scoreValue: existing.querySelector(
        ".carbonrank-page-score__score-value",
      ) as HTMLElement,
      scoreReason: existing.querySelector(
        ".carbonrank-page-score__score-reason",
      ) as HTMLElement,
      breakdown: existing.querySelector(
        ".carbonrank-page-score__breakdown",
      ) as HTMLElement,
    };
  }

  const root = doc.createElement("div");
  root.id = ROOT_ID;
  root.className = "carbonrank-page-score";

  const pill = createElement(doc, "button", "carbonrank-page-score__pill", "CarbonRank");
  pill.type = "button";
  pill.setAttribute("aria-expanded", "false");

  const panel = createElement(doc, "div", "carbonrank-page-score__panel");
  panel.hidden = true;

  const header = createElement(doc, "div", "carbonrank-page-score__header");
  const heading = createElement(doc, "span", "carbonrank-page-score__heading", "CarbonRank");
  const closeButton = createElement(doc, "button", "carbonrank-page-score__close", "×");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  header.append(heading, closeButton);

  const body = createElement(doc, "div", "carbonrank-page-score__body");
  const title = createElement(doc, "p", "carbonrank-page-score__job-title");
  const company = createElement(doc, "p", "carbonrank-page-score__job-meta carbonrank-page-score__job-company");
  const location = createElement(doc, "p", "carbonrank-page-score__job-meta carbonrank-page-score__job-location");

  const scoreValue = createElement(doc, "p", "carbonrank-page-score__score-value");
  const scoreReason = createElement(doc, "p", "carbonrank-page-score__score-reason");
  const breakdown = createElement(doc, "div", "carbonrank-page-score__breakdown");

  body.append(title, company, location, scoreValue, scoreReason, breakdown);
  panel.append(header, body);
  root.append(pill, panel);

  const target = doc.body ?? doc.documentElement;
  target.appendChild(root);

  return {
    root,
    pill,
    panel,
    closeButton,
    title,
    company,
    location,
    scoreValue,
    scoreReason,
    breakdown,
  };
}

function formatBreakdown(breakdown: ScoreBreakdown, placeName?: string): string {
  const rows = [
    placeName ? `place: ${placeName}` : null,
    `distance_km: ${breakdown.distanceKm.toFixed(1)}`,
    `office_days_per_week: ${breakdown.officeDaysPerWeek}`,
    `annual_km: ${Math.round(breakdown.annualKm)}`,
    `emission_factor: ${breakdown.emissionFactorKgPerKm.toFixed(3)} kgCO2e/km`,
    `annual_kgco2e: ${Math.round(breakdown.annualKgCO2e)}`,
    "Estimate uses straight-line distance.",
  ].filter(Boolean) as string[];

  return rows.join("\n");
}

function setPanelState(
  elements: PageScoreElements,
  result: ScoreResult,
  displayLocation: string,
  isRemote: boolean,
): void {
  elements.scoreReason.textContent = "";
  elements.breakdown.textContent = "";

  switch (result.status) {
    case "set_postcode":
      elements.scoreValue.textContent = "Set postcode";
      elements.scoreReason.textContent =
        "Add a home postcode in the extension settings.";
      return;
    case "wfh":
      elements.scoreValue.textContent = "0 kgCO2e/yr";
      elements.scoreReason.textContent = result.reason;
      elements.breakdown.textContent = formatBreakdown(result.breakdown);
      return;
    case "no_data":
      elements.scoreValue.textContent = "No data";
      elements.scoreReason.textContent = result.reason;
      return;
    case "loading":
      elements.scoreValue.textContent = "Loading...";
      elements.scoreReason.textContent = "Calculating commute estimate.";
      return;
    case "ok": {
      const annualKg = Math.round(result.breakdown.annualKgCO2e);
      elements.scoreValue.textContent = `${annualKg} kgCO2e/yr`;
      elements.scoreReason.textContent = isRemote
        ? "Remote role; commute assumed 0."
        : `Location: ${displayLocation || "Not specified"}`;
      elements.breakdown.textContent = formatBreakdown(
        result.breakdown,
        result.placeName,
      );
      return;
    }
    case "error":
      elements.scoreValue.textContent = "Error";
      elements.scoreReason.textContent = result.reason;
      return;
  }
}

function formatJobMeta(value: string, fallback: string): string {
  return value ? value : fallback;
}

function applyJobDetails(
  elements: PageScoreElements,
  jobPosting: JobPostingExtract,
  displayLocation: string,
): void {
  elements.title.textContent = formatJobMeta(jobPosting.title, "Job details");
  elements.company.textContent = formatJobMeta(
    jobPosting.hiringOrganizationName,
    "Company not listed",
  );
  elements.location.textContent = `Location: ${displayLocation || "Not specified"}`;
}

function togglePanel(elements: PageScoreElements, open: boolean): void {
  elements.panel.hidden = !open;
  elements.pill.setAttribute("aria-expanded", String(open));
}

function pickJobPosting(postings: JobPostingExtract[]): JobPostingExtract {
  return (
    postings.find(
      (posting) => posting.title || posting.hiringOrganizationName || posting.jobLocations.length,
    ) ?? postings[0]
  );
}

function buildContextKey(context: JobPostingContext): string {
  const { jobPosting, locationText, isRemote } = context;
  return [
    jobPosting.title,
    jobPosting.hiringOrganizationName,
    locationText,
    isRemote ? "remote" : "onsite",
  ].join("|");
}

function resolveJobPostingContext(doc: Document): JobPostingContext | null {
  const postings = extractJobPostingJsonLd(doc);
  if (postings.length > 0) {
    const jobPosting = pickJobPosting(postings);
    const isRemote = isRemoteJobPosting(jobPosting);
    const locationText = isRemote ? "Remote" : formatJobLocation(jobPosting);
    return { jobPosting, locationText, isRemote };
  }

  const modalPosting = extractReedModalJobPosting(doc);
  if (modalPosting) {
    const locationText = formatJobLocation(modalPosting);
    return { jobPosting: modalPosting, locationText, isRemote: false };
  }

  return null;
}

export async function initPageScore(deps: PageScoreDependencies = {}): Promise<void> {
  const doc = deps.doc ?? document;
  const telemetry = deps.telemetry ?? noopTelemetry;
  const getSettingsFn = deps.getSettings ?? getSettings;
  const scoreLocationFn = deps.scoreLocation ?? scoreLocation;

  let elements: PageScoreElements | null = null;
  let currentContext: JobPostingContext | null = null;
  let currentKey = "";
  let scoreRequestId = 0;
  let refreshQueued = false;

  const ensureElements = (): PageScoreElements => {
    ensureStyles(pageScoreStyles, doc, STYLE_ID);
    if (!elements) {
      elements = ensurePageScoreElements(doc);
    }
    return elements;
  };

  const runScore = async () => {
    if (!currentContext) {
      return;
    }
    const activeElements = ensureElements();
    const { locationText, isRemote } = currentContext;
    const requestId = ++scoreRequestId;

    setPanelState(activeElements, { status: "loading" }, locationText, isRemote);
    telemetry.trackEvent("page_score_requested", { remote: isRemote });
    const settings = await getSettingsFn();
    const locationName = isRemote ? "Work from home" : locationText;
    const result = await scoreLocationFn(locationName, settings);
    if (requestId !== scoreRequestId) {
      return;
    }
    const finalResult =
      isRemote && result.status === "wfh"
        ? { ...result, reason: "Job posting marked as remote" }
        : result;
    setPanelState(activeElements, finalResult, locationText, isRemote);
  };

  const refresh = async () => {
    const context = resolveJobPostingContext(doc);
    if (!context) {
      if (elements) {
        togglePanel(elements, false);
        elements.root.hidden = true;
      }
      currentContext = null;
      currentKey = "";
      return;
    }

    const nextKey = buildContextKey(context);
    const activeElements = ensureElements();
    const keyChanged = nextKey !== currentKey || activeElements.root.hidden;

    currentContext = context;
    currentKey = nextKey;
    activeElements.root.hidden = false;

    if (!activeElements.root.dataset.bound) {
      activeElements.root.dataset.bound = "true";
      activeElements.pill.addEventListener("click", () => {
        const open = activeElements.panel.hidden;
        togglePanel(activeElements, open);
        if (open) {
          telemetry.trackEvent("page_score_opened");
        }
      });
      activeElements.closeButton.addEventListener("click", () =>
        togglePanel(activeElements, false),
      );
    }

    if (!activeElements.root.dataset.settingsListener) {
      activeElements.root.dataset.settingsListener = "true";
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== "sync" || !changes.carbonrankSettings) {
            return;
          }
          void runScore();
        });
      }
    }

    if (keyChanged) {
      applyJobDetails(activeElements, context.jobPosting, context.locationText);
      await runScore();
    }
  };

  const scheduleRefresh = () => {
    if (refreshQueued) {
      return;
    }
    refreshQueued = true;
    Promise.resolve().then(() => {
      refreshQueued = false;
      void refresh();
    });
  };

  if (doc.documentElement && !doc.documentElement.dataset.pageScoreObserver) {
    doc.documentElement.dataset.pageScoreObserver = "true";
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(scheduleRefresh);
      observer.observe(doc.documentElement, { childList: true, subtree: true });
    }
  }

  await refresh();
}
