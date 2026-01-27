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
import { createEmployerSignalsPanel, EmployerSignalsElements } from "../../ui/employer_signals";
import {
  formatEmployerStatusLabel,
  resolveEmployerSignals,
} from "../../employer/api";
import { EmployerCandidate, EmployerSignalsResult } from "../../employer/types";
import {
  clearEmployerOverride,
  EmployerOverride as StoredEmployerOverride,
  getEmployerOverride,
  setEmployerOverride,
} from "../../storage/employer_overrides";
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
  employer: EmployerSignalsElements;
};

export type PageScoreDependencies = {
  doc?: Document;
  getSettings?: () => Promise<Settings>;
  scoreLocation?: (locationName: string, settings: Settings) => Promise<ScoreResult>;
  telemetry?: Telemetry;
  fetchEmployerSignals?: (
    name: string,
    hintLocation: string,
    override?: StoredEmployerOverride | null,
  ) => Promise<EmployerSignalsResult>;
  getEmployerOverride?: (name: string) => Promise<StoredEmployerOverride | null>;
  setEmployerOverride?: (name: string, override: StoredEmployerOverride) => Promise<void>;
  clearEmployerOverride?: (name: string) => Promise<void>;
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
    const employerRoot = existing.querySelector(
      ".carbonrank-page-score__employer",
    ) as HTMLDivElement;
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
      employer: {
        root: employerRoot,
        status: employerRoot.querySelector(
          ".carbonrank-page-score__employer-status",
        ) as HTMLParagraphElement,
        matchName: employerRoot.querySelector(
          ".carbonrank-page-score__employer-name",
        ) as HTMLSpanElement,
        matchConfidence: employerRoot.querySelector(
          ".carbonrank-page-score__employer-confidence",
        ) as HTMLSpanElement,
        changeButton: employerRoot.querySelector(
          ".carbonrank-page-score__employer-change",
        ) as HTMLButtonElement,
        select: employerRoot.querySelector(
          ".carbonrank-page-score__employer-select",
        ) as HTMLSelectElement,
        sicCodes: employerRoot.querySelector(
          ".carbonrank-page-score__employer-sic",
        ) as HTMLParagraphElement,
        intensity: employerRoot.querySelector(
          ".carbonrank-page-score__employer-intensity",
        ) as HTMLParagraphElement,
        note: employerRoot.querySelector(
          ".carbonrank-page-score__employer-note",
        ) as HTMLParagraphElement,
      },
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
  const employer = createEmployerSignalsPanel(doc);

  body.append(title, company, location, scoreValue, scoreReason, breakdown, employer.root);
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
    employer,
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

function formatEmployerStatusText(result: EmployerSignalsResult): string {
  return `Employer signals: ${formatEmployerStatusLabel(result.status)}`;
}

function formatEmployerConfidence(result: EmployerSignalsResult): string {
  if (result.overrideApplied) {
    return "Confidence: user-selected";
  }
  switch (result.status) {
    case "available":
      return "Confidence: high";
    case "low_confidence":
      return "Confidence: low";
    case "no_data":
      return "Confidence: unavailable";
    case "error":
      return "Confidence: unavailable";
  }
}

function formatBandLabel(band: string): string {
  if (!band || band === "unknown") {
    return "Unknown";
  }
  return band.charAt(0).toUpperCase() + band.slice(1);
}

function formatSicCodes(
  codes: string[],
  description?: string | null,
  matchedCode?: string | null,
): string {
  if (description) {
    const codeLabel = matchedCode || codes[0];
    if (codeLabel) {
      return `${codeLabel} — ${description}`;
    }
    return description;
  }
  return codes.length > 0 ? codes.join(", ") : "Not listed";
}

function populateEmployerOptions(
  select: HTMLSelectElement,
  candidates: EmployerCandidate[],
  overrideCompanyNumber?: string,
): void {
  select.innerHTML = "";
  const autoOption = new Option("Auto (top match)", "");
  select.append(autoOption);
  for (const candidate of candidates) {
    const label = candidate.address_snippet
      ? `${candidate.title} • ${candidate.address_snippet}`
      : candidate.title;
    const option = new Option(label, candidate.company_number);
    select.append(option);
  }
  select.value = overrideCompanyNumber ?? "";
}

function setEmployerLoading(elements: EmployerSignalsElements): void {
  elements.status.textContent = "Employer signals: loading";
  elements.matchName.textContent = "Loading…";
  elements.matchConfidence.textContent = "";
  elements.sicCodes.textContent = "SIC codes: —";
  elements.intensity.textContent = "Sector baseline: —";
  elements.changeButton.disabled = true;
  elements.select.disabled = true;
  elements.select.hidden = true;
}

function setEmployerEmpty(elements: EmployerSignalsElements, message: string): void {
  elements.status.textContent = "Employer signals: no data";
  elements.matchName.textContent = message;
  elements.matchConfidence.textContent = "";
  elements.sicCodes.textContent = "SIC codes: Not listed";
  elements.intensity.textContent = "Sector baseline: unavailable";
  elements.changeButton.disabled = true;
  elements.select.disabled = true;
  elements.select.hidden = true;
}

function setEmployerSignalsState(
  elements: EmployerSignalsElements,
  result: EmployerSignalsResult,
  override?: StoredEmployerOverride | null,
): void {
  elements.status.textContent = formatEmployerStatusText(result);
  elements.matchConfidence.textContent = formatEmployerConfidence(result);

  if (!result.selectedCandidate) {
    elements.matchName.textContent = result.reason ?? "No match";
    elements.sicCodes.textContent = "SIC codes: Not listed";
    elements.intensity.textContent = "Sector baseline: unavailable";
    elements.changeButton.disabled = true;
    elements.select.hidden = true;
    return;
  }

  elements.matchName.textContent = result.selectedCandidate.title || "Unknown";

  const sicCodes = result.signals?.sic_codes ?? result.selectedCandidate.sic_codes ?? [];
  elements.sicCodes.textContent = `SIC codes: ${formatSicCodes(
    sicCodes,
    result.signals?.sector_description,
    result.signals?.sector_intensity_sic_code,
  )}`;

  if (
    result.signals?.sector_intensity_value !== null &&
    result.signals?.sector_intensity_value !== undefined
  ) {
    const bandLabel = formatBandLabel(result.signals.sector_intensity_band);
    const value = result.signals.sector_intensity_value.toFixed(2);
    elements.intensity.textContent = `Sector baseline: ${bandLabel} (${value})`;
  } else {
    elements.intensity.textContent = "Sector baseline: unavailable";
  }

  const hasCandidates = result.candidates.length > 0;
  elements.changeButton.disabled = !hasCandidates;
  elements.select.disabled = !hasCandidates;
  if (hasCandidates) {
    populateEmployerOptions(elements.select, result.candidates, override?.companyNumber);
    elements.select.hidden = true;
  } else {
    elements.select.hidden = true;
  }
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
  const fetchEmployerSignalsFn =
    deps.fetchEmployerSignals ??
    ((name, hintLocation, override) =>
      resolveEmployerSignals(name, hintLocation, override ?? undefined));
  const getEmployerOverrideFn = deps.getEmployerOverride ?? getEmployerOverride;
  const setEmployerOverrideFn = deps.setEmployerOverride ?? setEmployerOverride;
  const clearEmployerOverrideFn = deps.clearEmployerOverride ?? clearEmployerOverride;

  let elements: PageScoreElements | null = null;
  let currentContext: JobPostingContext | null = null;
  let currentKey = "";
  let scoreRequestId = 0;
  let employerRequestId = 0;
  let refreshQueued = false;
  let currentEmployerName = "";
  let currentEmployerCandidates: EmployerCandidate[] = [];

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

  const runEmployerSignals = async () => {
    if (!currentContext) {
      return;
    }
    const activeElements = ensureElements();
    const employerName = currentContext.jobPosting.hiringOrganizationName;
    const hintLocation = currentContext.locationText;
    const requestId = ++employerRequestId;

    currentEmployerName = employerName;
    currentEmployerCandidates = [];

    if (!employerName) {
      setEmployerEmpty(activeElements.employer, "Employer not listed");
      return;
    }

    setEmployerLoading(activeElements.employer);

    const override = await getEmployerOverrideFn(employerName);
    let result: EmployerSignalsResult;
    try {
      result = await fetchEmployerSignalsFn(employerName, hintLocation, override);
    } catch (error) {
      console.error("[EmployerSignals] Failed to load", error);
      result = {
        status: "error",
        candidates: [],
        reason: "Unable to load employer signals",
      };
    }
    if (requestId !== employerRequestId) {
      return;
    }

    currentEmployerCandidates = result.candidates;
    setEmployerSignalsState(activeElements.employer, result, override);
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

    if (!activeElements.root.dataset.employerControls) {
      activeElements.root.dataset.employerControls = "true";
      activeElements.employer.changeButton.addEventListener("click", () => {
        if (activeElements.employer.changeButton.disabled) {
          return;
        }
        activeElements.employer.select.hidden =
          !activeElements.employer.select.hidden;
        if (!activeElements.employer.select.hidden) {
          activeElements.employer.select.focus();
        }
      });
      activeElements.employer.select.addEventListener("change", async () => {
        if (!currentEmployerName) {
          return;
        }
        const selectedNumber = activeElements.employer.select.value;
        if (!selectedNumber) {
          await clearEmployerOverrideFn(currentEmployerName);
        } else {
          const candidate = currentEmployerCandidates.find(
            (item) => item.company_number === selectedNumber,
          );
          await setEmployerOverrideFn(currentEmployerName, {
            companyNumber: selectedNumber,
            companyName: candidate?.title ?? currentEmployerName,
            updatedAt: Date.now(),
          });
        }
        activeElements.employer.select.hidden = true;
        await runEmployerSignals();
      });
    }

    if (!activeElements.root.dataset.settingsListener) {
      activeElements.root.dataset.settingsListener = "true";
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === "sync" && changes.carbonrankSettings) {
            void runScore();
            return;
          }
          if (areaName === "local" && changes.carbonrankEmployerOverrides) {
            void runEmployerSignals();
          }
        });
      }
    }

    if (keyChanged) {
      applyJobDetails(activeElements, context.jobPosting, context.locationText);
      await Promise.all([runScore(), runEmployerSignals()]);
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
