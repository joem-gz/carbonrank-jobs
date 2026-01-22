import { findCards, injectBadge, matches, selectors } from "./sites/reed/adapter";
import { ensureStyles } from "./ui/badge";
import badgeStyles from "./ui/styles.css";

function scanAndAnnotate(root: ParentNode): void {
  const cards = findCards(root);
  if (cards.length === 0) {
    console.debug("[CarbonRank] No Reed cards found", selectors);
    return;
  }

  for (const card of cards) {
    injectBadge(card, "CarbonRank");
  }
}

function init(): void {
  const url = new URL(window.location.href);
  if (!matches(url)) {
    return;
  }

  ensureStyles(badgeStyles);
  scanAndAnnotate(document);
}

init();
