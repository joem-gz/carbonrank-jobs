import { createDebounced, observeMutations, scanAndAnnotate } from "./content/scan";
import { initPageScore } from "./features/page_score";
import { matches } from "./sites/reed/adapter";
import { getSettings } from "./storage/settings";
import { ensureStyles } from "./ui/badge";
import badgeStyles from "./ui/styles.css";

async function initReedScan(url: URL): Promise<void> {
  if (!matches(url)) {
    return;
  }

  ensureStyles(badgeStyles);
  const runScan = async () => {
    const settings = await getSettings();
    scanAndAnnotate(document, settings);
  };

  await runScan();
  const scheduleScan = createDebounced(() => void runScan(), 250);
  const target = document.body ?? document.documentElement;
  observeMutations(target, scheduleScan);

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes.carbonrankSettings) {
        return;
      }
      scheduleScan();
    });
  }
}

async function init(): Promise<void> {
  const url = new URL(window.location.href);
  await Promise.all([initReedScan(url), initPageScore()]);
}

void init();
