import { findCards, injectBadge, matches, selectors } from "./sites/reed/adapter";
import { getSettings } from "./storage/settings";
import { ensureStyles } from "./ui/badge";
import badgeStyles from "./ui/styles.css";

function scanAndAnnotate(root: ParentNode, badgeText: string): void {
  const cards = findCards(root);
  if (cards.length === 0) {
    console.debug("[CarbonRank] No Reed cards found", selectors);
    return;
  }

  for (const card of cards) {
    injectBadge(card, badgeText);
  }
}

function resolveBadgeText(homePostcode: string): string {
  return homePostcode.trim() ? "CarbonRank" : "Set postcode";
}

async function init(): Promise<void> {
  const url = new URL(window.location.href);
  if (!matches(url)) {
    return;
  }

  ensureStyles(badgeStyles);
  const settings = await getSettings();
  scanAndAnnotate(document, resolveBadgeText(settings.homePostcode));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.carbonrankSettings) {
      return;
    }
    void getSettings().then((next) => {
      scanAndAnnotate(document, resolveBadgeText(next.homePostcode));
    });
  });
}

void init();
