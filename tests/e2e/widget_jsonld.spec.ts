import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { ensureWidgetBuild } from "./widget_build";

test.beforeAll(async () => {
  await ensureWidgetBuild();
});

test("renders JSON-LD detail widget", async ({ page }) => {
  await page.addInitScript(() => {
    window.fetch = async () =>
      new Response(JSON.stringify({ status: "ok", score: 321 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
  });

  const examplePath = resolve("examples/widget-jobposting-jsonld.html");
  await page.goto(pathToFileURL(examplePath).toString(), {
    waitUntil: "domcontentloaded",
  });

  const badge = page.locator(
    "[data-carbonrank-detail] .carbonrank-widget__badge",
  );
  await expect(badge).toHaveText("321 kgCO2e/yr");
});
