import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test, expect, chromium } from "@playwright/test";

const fixtureHtml = readFileSync(
  resolve("tests/fixtures/reed_search_results_e2e.html"),
  "utf-8",
);

test("annotates Reed cards with expected badge states", async () => {
  test.setTimeout(60_000);
  const extensionPath = resolve("dist");
  const userDataDir = mkdtempSync(join(tmpdir(), "carbonrank-e2e-"));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  await context.route("https://www.reed.co.uk/jobs*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: fixtureHtml,
    });
  });

  await context.route("https://api.postcodes.io/postcodes/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        result: { latitude: 51.501, longitude: -0.141 },
      }),
    });
  });

  const page = await context.newPage();
  await page.goto("https://www.reed.co.uk/jobs?e2e=1", {
    waitUntil: "domcontentloaded",
  });

  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 5000 }));

  await worker.evaluate(() =>
    chrome.storage.sync.set({
      carbonrankSettings: {
        homePostcode: "SW1A 1AA",
        commuteMode: "car",
        officeDaysPerWeek: 3,
      },
    }),
  );

  const badges = page.locator("[data-carbonrank-badge]");
  await expect(badges).toHaveCount(3);

  await expect(badges.nth(0)).toContainText("kgCO2e/yr");
  await expect(badges.nth(1)).toHaveText("0 kgCO2e/yr");
  await expect(badges.nth(2)).toHaveText("No data");

  await context.close();
});
