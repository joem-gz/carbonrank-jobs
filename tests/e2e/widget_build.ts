import { readFileSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const distDir = resolve("dist");
const packageJson = JSON.parse(
  readFileSync(resolve("package.json"), "utf-8"),
);
const version = typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
const versionSuffix = version.replace(/[^0-9A-Za-z.-]/g, "-");
let built = false;

export async function ensureWidgetBuild(): Promise<void> {
  if (built) {
    return;
  }
  built = true;
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

  await copyFile(
    resolve(distDir, "widget.js"),
    resolve(distDir, `widget-${versionSuffix}.js`),
  );
  await copyFile(
    resolve(distDir, "widget.css"),
    resolve(distDir, `widget-${versionSuffix}.css`),
  );
}
