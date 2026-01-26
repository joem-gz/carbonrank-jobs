import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const outdir = process.env.WIDGET_OUTDIR ?? "dist";
const resolvedOutdir = resolve(outdir);

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
