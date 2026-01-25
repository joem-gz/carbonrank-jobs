import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const distDir = resolve("server", "dist");

async function build() {
  await mkdir(distDir, { recursive: true });

  await esbuild.build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: true,
    outfile: resolve(distDir, "index.js"),
  });
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
