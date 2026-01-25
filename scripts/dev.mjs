import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const distDir = resolve("dist");

const shared = {
  bundle: true,
  sourcemap: true,
  outdir: distDir,
  outbase: "src",
  loader: {
    ".css": "text",
    ".json": "json",
  },
};

async function copyStatic() {
  await copyFile("src/manifest.json", "dist/manifest.json");
  await mkdir(resolve(distDir, "popup"), { recursive: true });
  await copyFile("src/popup/popup.html", "dist/popup/popup.html");
  await copyFile("src/popup/popup.css", "dist/popup/popup.css");
  await mkdir(resolve(distDir, "pages", "search"), { recursive: true });
  await copyFile(
    "src/pages/search/search.html",
    "dist/pages/search/search.html",
  );
  await copyFile(
    "src/pages/search/search.css",
    "dist/pages/search/search.css",
  );
}

async function watch() {
  await mkdir(distDir, { recursive: true });

  const contentContext = await esbuild.context({
    entryPoints: ["src/content_script.ts"],
    format: "iife",
    platform: "browser",
    ...shared,
  });

  const workerContext = await esbuild.context({
    entryPoints: ["src/service_worker.ts"],
    format: "esm",
    platform: "browser",
    ...shared,
  });

  const popupContext = await esbuild.context({
    entryPoints: ["src/popup/popup.ts"],
    format: "iife",
    platform: "browser",
    ...shared,
  });

  const searchContext = await esbuild.context({
    entryPoints: ["src/pages/search/search.ts"],
    format: "iife",
    platform: "browser",
    ...shared,
  });

  await contentContext.watch();
  await workerContext.watch();
  await popupContext.watch();
  await searchContext.watch();
  await copyStatic();

  console.log("Watching for changes...");
}

watch().catch((error) => {
  console.error(error);
  process.exit(1);
});
