import { ScoreRequestMessage, ScoreResponseMessage } from "../messages";
import { ScoreBreakdown, ScoreResult } from "../scoring/types";
import { findCards, injectBadge, parseCard, selectors } from "../sites/reed/adapter";
import { Settings } from "../storage/settings";
import { BADGE_ATTR } from "../ui/badge";
import { fetchEmployerStatus, formatEmployerStatusLabel } from "../employer/api";
import { EmployerSignalStatus } from "../employer/types";
import { normalizeEmployerName } from "../employer/normalize";

const NON_JOB_PATH_HINTS = ["/courses", "/course", "/learning", "/events", "/training"];
const employerStatusCache = new Map<string, EmployerSignalStatus>();
const employerStatusRequests = new Map<string, Promise<EmployerSignalStatus>>();

type SendMessage = (
  message: ScoreRequestMessage,
  callback: (response: ScoreResponseMessage | undefined) => void,
) => void;

export type ScanDependencies = {
  sendMessage?: SendMessage;
  createRequestId?: () => string;
  fetchEmployerStatus?: (name: string, hintLocation: string) => Promise<EmployerSignalStatus>;
};

function getOrCreateBadge(card: HTMLElement): HTMLElement {
  const existing = card.querySelector(`[${BADGE_ATTR}]`);
  if (existing instanceof HTMLElement) {
    return existing;
  }
  return injectBadge(card, "CarbonRank");
}

function updateBadgeTooltip(badge: HTMLElement): void {
  const scoreTooltip = badge.dataset.scoreTooltip ?? "";
  const employerTooltip = badge.dataset.employerTooltip ?? "";
  const combined = [scoreTooltip, employerTooltip].filter(Boolean).join("\n\n");
  if (combined) {
    badge.title = combined;
  } else {
    badge.removeAttribute("title");
  }
}

function setBadgeState(badge: HTMLElement, text: string, tooltip?: string): void {
  badge.textContent = text;
  if (tooltip) {
    badge.dataset.scoreTooltip = tooltip;
  } else {
    delete badge.dataset.scoreTooltip;
  }
  updateBadgeTooltip(badge);
}

function setEmployerTooltip(badge: HTMLElement, status: EmployerSignalStatus): void {
  badge.dataset.employerTooltip = `Employer signals: ${formatEmployerStatusLabel(status)}`;
  updateBadgeTooltip(badge);
}

function normalizeLocation(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildEmployerStatusKey(name: string, location: string): string {
  return `${normalizeEmployerName(name)}|${normalizeLocation(location)}`;
}

function resolveEmployerStatus(
  name: string,
  location: string,
  fetchFn: (name: string, hintLocation: string) => Promise<EmployerSignalStatus>,
): Promise<EmployerSignalStatus> {
  const cacheKey = buildEmployerStatusKey(name, location);
  const cached = employerStatusCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = employerStatusRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = fetchFn(name, location)
    .catch(() => "no_data" as EmployerSignalStatus)
    .then((status) => {
      employerStatusCache.set(cacheKey, status);
      employerStatusRequests.delete(cacheKey);
      return status;
    });
  employerStatusRequests.set(cacheKey, request);
  return request;
}

function formatBreakdown(breakdown: ScoreBreakdown, placeName: string): string {
  return [
    `place: ${placeName}`,
    `distance_km: ${breakdown.distanceKm.toFixed(1)}`,
    `office_days_per_week: ${breakdown.officeDaysPerWeek}`,
    `annual_km: ${Math.round(breakdown.annualKm)}`,
    `emission_factor: ${breakdown.emissionFactorKgPerKm.toFixed(3)} kgCO2e/km`,
    `annual_kgco2e: ${Math.round(breakdown.annualKgCO2e)}`,
    "Estimate uses straight-line distance.",
  ].join("\n");
}

function formatWfhBreakdown(breakdown: ScoreBreakdown, reason: string): string {
  return [
    reason,
    `distance_km: ${breakdown.distanceKm.toFixed(1)}`,
    `office_days_per_week: ${breakdown.officeDaysPerWeek}`,
    `annual_km: ${Math.round(breakdown.annualKm)}`,
    `emission_factor: ${breakdown.emissionFactorKgPerKm.toFixed(3)} kgCO2e/km`,
    `annual_kgco2e: ${Math.round(breakdown.annualKgCO2e)}`,
  ].join("\n");
}

function applyScoreResult(badge: HTMLElement, result: ScoreResult): void {
  badge.dataset.state = "done";
  switch (result.status) {
    case "set_postcode":
      setBadgeState(badge, "Set postcode", "Add a home postcode in the extension settings.");
      return;
    case "wfh":
      setBadgeState(badge, "0 kgCO2e/yr", formatWfhBreakdown(result.breakdown, result.reason));
      return;
    case "no_data":
      setBadgeState(badge, "No data", result.reason);
      return;
    case "loading":
      badge.dataset.state = "loading";
      setBadgeState(badge, "Loading...", "Resolving the job location.");
      return;
    case "ok": {
      const annualKg = Math.round(result.breakdown.annualKgCO2e);
      setBadgeState(
        badge,
        `${annualKg} kgCO2e/yr`,
        formatBreakdown(result.breakdown, result.placeName),
      );
      return;
    }
    case "error":
      setBadgeState(badge, "Error", result.reason);
      return;
  }
}

function isNonJobUrl(jobUrl: string, baseUri: string): boolean {
  if (!jobUrl) {
    return false;
  }
  try {
    const url = new URL(jobUrl, baseUri);
    const pathname = url.pathname.toLowerCase();
    return NON_JOB_PATH_HINTS.some((hint) => pathname.includes(hint));
  } catch {
    return false;
  }
}

function requestScore(
  badge: HTMLElement,
  settings: Settings,
  locationName: string,
  sendMessage: SendMessage,
  createRequestId: () => string,
): void {
  const requestId = createRequestId();
  badge.dataset.requestId = requestId;
  badge.dataset.state = "loading";
  setBadgeState(badge, "Loading...", "Resolving the job location.");

  const message: ScoreRequestMessage = {
    type: "score_request",
    requestId,
    locationName,
    settings,
  };

  sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      setBadgeState(badge, "Error", "Unable to reach the service worker.");
      badge.dataset.state = "idle";
      return;
    }

    if (!response || response.requestId !== requestId) {
      return;
    }

    applyScoreResult(badge, response.result);
  });
}

export function scanAndAnnotate(
  root: ParentNode,
  settings: Settings,
  deps: ScanDependencies = {},
): void {
  const cards = findCards(root);
  if (cards.length === 0) {
    console.debug("[CarbonRank] No Reed cards found", selectors);
    return;
  }

  const sendMessage = deps.sendMessage ?? chrome.runtime.sendMessage;
  const createRequestId = deps.createRequestId ?? (() => crypto.randomUUID());
  const fetchEmployerStatusFn = deps.fetchEmployerStatus ?? fetchEmployerStatus;

  for (const card of cards) {
    const parsed = parseCard(card);
    if (isNonJobUrl(parsed.jobUrl, card.ownerDocument.baseURI)) {
      continue;
    }

    const badge = getOrCreateBadge(card);
    const locationName = parsed.locationText ?? "";

    if (parsed.company) {
      const employerKey = buildEmployerStatusKey(parsed.company, locationName);
      badge.dataset.employerStatusKey = employerKey;
      void resolveEmployerStatus(parsed.company, locationName, fetchEmployerStatusFn).then(
        (status) => {
          if (badge.dataset.employerStatusKey !== employerKey) {
            return;
          }
          setEmployerTooltip(badge, status);
        },
      );
    } else {
      setEmployerTooltip(badge, "no_data");
    }

    const requestKey = `${locationName}|${settings.homePostcode}|${settings.commuteMode}|${settings.officeDaysPerWeek}`;
    if (badge.dataset.requestKey === requestKey && badge.dataset.state === "done") {
      continue;
    }

    if (badge.dataset.requestKey === requestKey && badge.dataset.state === "loading") {
      continue;
    }

    badge.dataset.requestKey = requestKey;
    requestScore(badge, settings, locationName, sendMessage, createRequestId);
  }
}

export function createDebounced(callback: () => void, delayMs: number): () => void {
  let timer: number | undefined;
  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = window.setTimeout(callback, delayMs);
  };
}

export function observeMutations(
  target: Node,
  onChange: () => void,
): MutationObserver {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}
