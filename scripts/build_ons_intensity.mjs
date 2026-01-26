import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";

const INPUT_PATH = resolve("server", "data", "ons", "ons_intensity_source.csv");
const OUTPUT_PATH = resolve("server", "data", "ons", "ons_intensity_map.json");

function parseIntensity(value) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(sortedValues.length - 1, lowerIndex + 1);
  const weight = position - lowerIndex;
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];
  return lower + (upper - lower) * weight;
}

async function build() {
  const csv = await readFile(INPUT_PATH, "utf-8");
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const exact = {};
  const groups = {};
  const intensities = [];

  for (const record of records) {
    const code = String(record.sic_code ?? "").trim();
    const intensity = parseIntensity(record.intensity);
    if (!code || intensity === null) {
      continue;
    }
    intensities.push(intensity);
    if (code.length <= 2) {
      groups[code] = intensity;
    } else {
      exact[code] = intensity;
    }
  }

  const sorted = intensities.slice().sort((a, b) => a - b);
  const bandThresholds = {
    low: Number(quantile(sorted, 0.33).toFixed(3)),
    high: Number(quantile(sorted, 0.66).toFixed(3)),
  };

  const payload = {
    meta: {
      source: "ONS Environmental Accounts (example snapshot)",
      generated_at: new Date().toISOString(),
      band_thresholds: bandThresholds,
    },
    exact,
    groups,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
