export const HELP_URL = "https://isthisjobgreen.com/help";
export const HELP_FALLBACK_PATH = "pages/help/help.html";

type HelpUrlOptions = {
  preferLocal?: boolean;
};

export function getHelpFallbackUrl(): string | null {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) {
    return null;
  }
  return chrome.runtime.getURL(HELP_FALLBACK_PATH);
}

export function resolveHelpUrl(options: HelpUrlOptions = {}): string {
  const fallback = getHelpFallbackUrl();
  if (options.preferLocal && fallback) {
    return fallback;
  }
  if (fallback && typeof navigator !== "undefined" && navigator.onLine === false) {
    return fallback;
  }
  return HELP_URL;
}
