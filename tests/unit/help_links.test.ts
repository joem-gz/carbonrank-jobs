import { afterEach, describe, expect, it } from "vitest";
import { setAttributionLink } from "../../src/ui/attribution";
import { APP_ATTRIBUTION } from "../../src/ui/brand";
import { HELP_FALLBACK_PATH, HELP_URL, resolveHelpUrl } from "../../src/ui/links";

const originalChrome = globalThis.chrome;
const originalOnLine = navigator.onLine;

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  globalThis.chrome = originalChrome;
  setNavigatorOnline(originalOnLine);
});

describe("help links", () => {
  it("uses the canonical help URL by default", () => {
    setNavigatorOnline(true);
    expect(resolveHelpUrl()).toBe(HELP_URL);
  });

  it("falls back to the bundled help page when offline", () => {
    globalThis.chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
      },
    } as typeof chrome;
    setNavigatorOnline(false);

    expect(resolveHelpUrl()).toBe(
      `chrome-extension://test/${HELP_FALLBACK_PATH}`,
    );
  });

  it("populates attribution links with help URLs", () => {
    const link = document.createElement("a");
    setAttributionLink(link);

    expect(link.textContent).toBe(APP_ATTRIBUTION);
    expect(link.href).toBe(HELP_URL);
  });
});
