import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { expect, test } from "@playwright/test";

const distDir = resolve("dist");

async function buildWidget() {
  await build({
    entryPoints: ["widget/src/index.ts"],
    outdir: distDir,
    entryNames: "widget",
    bundle: true,
    format: "iife",
    globalName: "CarbonRankWidget",
    platform: "browser",
    sourcemap: true,
    loader: {
      ".css": "css",
    },
  });
}

test.beforeAll(async () => {
  await buildWidget();
});

test("renders server-rendered widget payloads", async ({ page }) => {
  const examplePath = resolve("examples/widget-jobposting-jsonld.html");
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
