import {
  CommuteMode,
  getSettings,
  isValidUkPostcode,
  normalizePostcode,
  setSettings,
} from "../storage/settings";
import {
  getProxyBaseUrl,
  setProxyBaseUrl,
  sanitizeProxyBaseUrl,
} from "../storage/proxy";
import { setAttributionLink } from "../ui/attribution";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const postcodeInput = document.querySelector<HTMLInputElement>("#home-postcode");
const commuteSelect = document.querySelector<HTMLSelectElement>("#commute-mode");
const officeSelect = document.querySelector<HTMLSelectElement>("#office-days");
const proxyBaseUrlInput = document.querySelector<HTMLInputElement>("#proxy-base-url");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const openSearchButton = document.querySelector<HTMLButtonElement>("#open-search");
const attributionLink = document.querySelector<HTMLAnchorElement>("#popup-attribution");

if (
  !form ||
  !postcodeInput ||
  !commuteSelect ||
  !officeSelect ||
  !proxyBaseUrlInput ||
  !statusEl ||
  !openSearchButton ||
  !attributionLink
) {
  throw new Error("Popup DOM missing required elements");
}

setAttributionLink(attributionLink);

function setStatus(message: string, state: "ok" | "error" = "ok"): void {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  postcodeInput.value = settings.homePostcode;
  commuteSelect.value = settings.commuteMode;
  officeSelect.value = String(settings.officeDaysPerWeek);
  proxyBaseUrlInput.value = await getProxyBaseUrl();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rawPostcode = postcodeInput.value.trim();
  const commuteMode = commuteSelect.value as CommuteMode;
  const officeDaysPerWeek = Number(officeSelect.value);

  if (rawPostcode && !isValidUkPostcode(rawPostcode)) {
    setStatus("Enter a valid UK postcode.", "error");
    return;
  }

  const normalised = rawPostcode ? normalizePostcode(rawPostcode) : "";
  const proxyBaseUrlRaw = proxyBaseUrlInput.value.trim();

  await setSettings({
    homePostcode: normalised,
    commuteMode,
    officeDaysPerWeek,
  });

  const sanitizedProxyBaseUrl = sanitizeProxyBaseUrl(proxyBaseUrlRaw);
  await setProxyBaseUrl(sanitizedProxyBaseUrl);

  postcodeInput.value = normalised;
  proxyBaseUrlInput.value = await getProxyBaseUrl();
  setStatus("Settings saved.");
});

openSearchButton.addEventListener("click", () => {
  const url = chrome.runtime.getURL("pages/search/search.html");
  chrome.tabs.create({ url });
});

void loadSettings().catch((error) => {
  console.error("Failed to load settings", error);
  setStatus("Unable to load settings.", "error");
});
