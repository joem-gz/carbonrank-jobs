import { resolve } from "node:path";
import { build } from "esbuild";

const distDir = resolve("dist");
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
}
