import { ScoreBreakdown, ScoreResult } from "./scoring/types";
import { findCards, injectBadge, matches, parseCard, selectors } from "./sites/reed/adapter";
import { ScoreRequestMessage, ScoreResponseMessage } from "./messages";
import { getSettings, Settings } from "./storage/settings";
import { ensureStyles } from "./ui/badge";
import badgeStyles from "./ui/styles.css";

function setBadgeState(badge: HTMLElement, text: string, tooltip?: string): void {
  badge.textContent = text;
  if (tooltip) {
    badge.title = tooltip;
  } else {
    badge.removeAttribute("title");
  }
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

function requestScore(badge: HTMLElement, settings: Settings, locationName: string): void {
  const requestId = crypto.randomUUID();
  badge.dataset.requestId = requestId;
  badge.dataset.state = "loading";
  setBadgeState(badge, "Loading...", "Checking the job location.");

  const message: ScoreRequestMessage = {
    type: "score_request",
    requestId,
    locationName,
    settings,
  };

  chrome.runtime.sendMessage(message, (response: ScoreResponseMessage | undefined) => {
    if (chrome.runtime.lastError) {
      setBadgeState(badge, "Unknown", "Unable to reach the service worker.");
      badge.dataset.state = "idle";
      return;
    }

    if (!response || response.requestId !== requestId) {
      return;
    }

    applyScoreResult(badge, response.result);
  });
}

function scanAndAnnotate(root: ParentNode, settings: Settings): void {
  const cards = findCards(root);
  if (cards.length === 0) {
    console.debug("[CarbonRank] No Reed cards found", selectors);
    return;
  }

  for (const card of cards) {
    const badge = injectBadge(card, "CarbonRank");
    const parsed = parseCard(card);
    const locationName = parsed.locationText ?? "";
    const requestKey = `${locationName}|${settings.homePostcode}|${settings.commuteMode}|${settings.officeDaysPerWeek}`;
    if (badge.dataset.requestKey === requestKey && badge.dataset.state === "done") {
      continue;
    }

    if (badge.dataset.requestKey === requestKey && badge.dataset.state === "loading") {
      continue;
    }

    badge.dataset.requestKey = requestKey;
    requestScore(badge, settings, locationName);
  }
}

async function init(): Promise<void> {
  const url = new URL(window.location.href);
  if (!matches(url)) {
    return;
  }

  ensureStyles(badgeStyles);
  const settings = await getSettings();
  scanAndAnnotate(document, settings);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.carbonrankSettings) {
      return;
    }
    void getSettings().then((next) => {
      scanAndAnnotate(document, next);
    });
  });
}

void init();
