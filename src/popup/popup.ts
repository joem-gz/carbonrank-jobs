import {
  CommuteMode,
  getSettings,
  isValidUkPostcode,
  normalizePostcode,
  setSettings,
} from "../storage/settings";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const postcodeInput = document.querySelector<HTMLInputElement>("#home-postcode");
const commuteSelect = document.querySelector<HTMLSelectElement>("#commute-mode");
const officeSelect = document.querySelector<HTMLSelectElement>("#office-days");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const openSearchButton = document.querySelector<HTMLButtonElement>("#open-search");

if (
  !form ||
  !postcodeInput ||
  !commuteSelect ||
  !officeSelect ||
  !statusEl ||
  !openSearchButton
) {
  throw new Error("Popup DOM missing required elements");
}

function setStatus(message: string, state: "ok" | "error" = "ok"): void {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  postcodeInput.value = settings.homePostcode;
  commuteSelect.value = settings.commuteMode;
  officeSelect.value = String(settings.officeDaysPerWeek);
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

  await setSettings({
    homePostcode: normalised,
    commuteMode,
    officeDaysPerWeek,
  });

  postcodeInput.value = normalised;
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
