import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { ensureWidgetBuild } from "./widget_build";

test.beforeAll(async () => {
  await ensureWidgetBuild();
});

test("renders server-rendered widget payloads", async ({ page }) => {
  const examplePath = resolve("examples/widget-ssr.html");
  await page.goto(pathToFileURL(examplePath).toString(), {
    waitUntil: "domcontentloaded",
  });

  const badges = page.locator(".carbonrank-widget__badge");
  await expect(badges).toHaveCount(3);
  await expect(badges.nth(0)).toHaveText("123 kgCO2e/yr");
  await expect(badges.nth(1)).toHaveText("0 kgCO2e/yr");
  await expect(badges.nth(2)).toHaveText("No data");

  const howButton = page.getByRole("button", { name: "How we calculate" }).first();
  await howButton.click();
  await expect(page.locator("#carbonrank-widget-modal")).toBeVisible();
});
