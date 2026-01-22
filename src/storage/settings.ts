export type CommuteMode = "car" | "bus" | "rail" | "walk" | "cycle";

export type Settings = {
  homePostcode: string;
  commuteMode: CommuteMode;
  officeDaysPerWeek: number;
};

const SETTINGS_KEY = "carbonrankSettings";

export const DEFAULT_SETTINGS: Settings = {
  homePostcode: "",
  commuteMode: "car",
  officeDaysPerWeek: 3,
};

export function normalizePostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact.length <= 3) {
    return compact;
  }
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidUkPostcode(value: string): boolean {
  const normalized = normalizePostcode(value);
  const pattern = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/;
  return pattern.test(normalized);
}

function sanitizeSettings(input: Partial<Settings> | undefined): Settings {
  const homePostcode = typeof input?.homePostcode === "string" ? input.homePostcode : "";
  const commuteMode: CommuteMode = isCommuteMode(input?.commuteMode)
    ? input?.commuteMode
    : DEFAULT_SETTINGS.commuteMode;
  const officeDaysPerWeek = clampOfficeDays(input?.officeDaysPerWeek);

  return {
    homePostcode,
    commuteMode,
    officeDaysPerWeek,
  };
}

function isCommuteMode(value: unknown): value is CommuteMode {
  return value === "car" || value === "bus" || value === "rail" || value === "walk" || value === "cycle";
}

function clampOfficeDays(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_SETTINGS.officeDaysPerWeek;
  }
  return Math.min(5, Math.max(0, Math.round(value)));
}

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = data[SETTINGS_KEY] as Partial<Settings> | undefined;

  return {
    ...DEFAULT_SETTINGS,
    ...sanitizeSettings(stored),
  };
}

export async function setSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = {
    ...current,
    ...partial,
  };

  await chrome.storage.sync.set({
    [SETTINGS_KEY]: next,
  });

  return next;
}
