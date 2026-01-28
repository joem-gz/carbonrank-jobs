import { copyFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const outdir = process.env.WIDGET_OUTDIR ?? "dist";
const resolvedOutdir = resolve(outdir);
const packageJson = JSON.parse(
  await readFile(resolve("package.json"), "utf-8"),
);
const version = typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
const versionSuffix = version.replace(/[^0-9A-Za-z.-]/g, "-");

await mkdir(resolvedOutdir, { recursive: true });

await esbuild.build({
  entryPoints: ["widget/src/index.ts"],
  outdir: resolvedOutdir,
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
  resolve(resolvedOutdir, "widget.js"),
  resolve(resolvedOutdir, `widget-${versionSuffix}.js`),
);
await copyFile(
  resolve(resolvedOutdir, "widget.css"),
  resolve(resolvedOutdir, `widget-${versionSuffix}.css`),
);
