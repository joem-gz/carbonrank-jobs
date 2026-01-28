import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";

mkdirSync(".pw-tmp", { recursive: true });
mkdirSync(".pw-home", { recursive: true });

const homeDir = resolve(".pw-home");

const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "../.pw-browsers";
const extraArgs = process.argv.slice(2);

const env = {
  ...process.env,
  TMPDIR: ".pw-tmp",
  PLAYWRIGHT_BROWSERS_PATH: browsersPath,
  HOME: homeDir,
  USERPROFILE: homeDir,
};

if (process.platform === "darwin") {
  const releaseMajor = Number(os.release().split(".")[0]);
  const macMajor = Number.isNaN(releaseMajor) ? 15 : Math.min(releaseMajor - 9, 15);
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = `mac${macMajor}-${arch}`;
}

const result = spawnSync("playwright", ["test", ...extraArgs], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
