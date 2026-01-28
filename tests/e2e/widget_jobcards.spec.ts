import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { ensureWidgetBuild } from "./widget_build";

test.beforeAll(async () => {
  await ensureWidgetBuild();
});

test("renders widgets on job cards", async ({ page }) => {
  await page.addInitScript(() => {
    window.fetch = async (_input, init) => {
      const bodyText = typeof init?.body === "string" ? init.body : "{}";
      const parsed = JSON.parse(bodyText) as { title?: string };
      const score = parsed.title?.includes("Designer") ? 140 : 95;
      return new Response(JSON.stringify({ status: "ok", score }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  });

  const examplePath = resolve("examples/widget-jobcards.html");
  await page.goto(pathToFileURL(examplePath).toString(), {
    waitUntil: "domcontentloaded",
  });

  const badges = page.locator(".job-card .carbonrank-widget__badge");
  await expect(badges).toHaveCount(2);
  await expect(badges.nth(0)).toHaveText("95 kgCO2e/yr");
  await expect(badges.nth(1)).toHaveText("140 kgCO2e/yr");
});
