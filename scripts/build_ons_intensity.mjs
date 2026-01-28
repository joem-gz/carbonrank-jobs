import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import XLSX from "xlsx";

const INPUT_PATH = resolve("server", "data", "ons", "04atmosphericemissionsghgintensity.xlsx");
const OUTPUT_PATH = resolve("server", "data", "ons", "ons_intensity_map.json");

const SHEET_NAME = "GHG intensity";

// Table 1b layout in this ONS file:
const TABLE_TITLE_CELL = "Y7";
const HEADER_ROW_CODE = 9;  // row with SIC(07) group labels (e.g. 10.1, 10.2-3, 33 (not ...))
const HEADER_ROW_NAME = 10; // row with industry names
const FIRST_DATA_ROW = 11;  // row where years start (1990...)
const TABLE_START_COL = "Y"; // column where "SIC(07) group" label + years live

function parseIntensity(value) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(sortedValues.length - 1, lowerIndex + 1);
  const weight = position - lowerIndex;
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];
  return lower + (upper - lower) * weight;
}

function colIndex(letter) {
  return XLSX.utils.decode_col(letter); // 0-based
}

function cellAddr(row1Based, col0Based) {
  return XLSX.utils.encode_cell({ r: row1Based - 1, c: col0Based });
}

function getCell(ws, a1) {
  return ws[a1];
}

function getCellValue(ws, a1) {
  const cell = getCell(ws, a1);
  return cell ? cell.v : undefined;
}

// Use formatted text if present (avoids JS float quirks for labels like 10.1)
function getCellText(ws, a1) {
  const cell = getCell(ws, a1);
  if (!cell) return "";
  return String(cell.w ?? cell.v ?? "").trim();
}

function findLatestYearRow(ws, yearCol0) {
  let lastYear = null;
  let lastRow = null;

  // Years are contiguous from 1990 onward; scan a safe window.
  for (let r = FIRST_DATA_ROW; r < FIRST_DATA_ROW + 300; r++) {
    const v = getCellValue(ws, cellAddr(r, yearCol0));
    if (typeof v === "number" && v >= 1990 && v <= 2100) {
      lastYear = v;
      lastRow = r;
      continue;
    }
    if (lastRow && (v === null || v === undefined || v === "")) break;
  }

  if (!lastRow) {
    throw new Error("Could not locate year rows in Table 1b (expected years in column Y).");
  }
  return { year: lastYear, row: lastRow };
}

/**
 * Expand combined SIC labels into lookup keys:
 * - Group keys: 3-digit string derived from "DD.x..." => DD + first digit after dot (e.g. 10.1 => 101, 11.07 => 110)
 * - Division keys: 2-digit string for plain integers (e.g. 1 => 01, 33 => 33)
 *
 * Handles patterns:
 *  - 10.2-3
 *  - 11.01-6 &12
 *  - 20.11+20.13+20.15
 *  - 23.1-4 & 23.7-9
 *  - 30.2+4+9
 *  - 33 (not 33.15-16)  -> treated as division "33"
 */
function expandSicLabel(raw) {
  const original = String(raw ?? "").trim();
  if (!original) return [];

  let s = original.replace(/\s+/g, "");
  if (/^Total/i.test(s)) return [];

  // strip parenthetical notes: "33(not33.15-16)" => "33"
  s = s.replace(/\(.*\)/g, "");

  const tokens = [];
  const segments = s.split("&");

  for (const seg of segments) {
    if (!seg) continue;

    const plusParts = seg.split("+");
    let currentDiv = null;

    for (let part of plusParts) {
      if (!part) continue;

      // shorthand like "30.2+4+9"
      if (currentDiv && /^\d+$/.test(part) && !part.includes(".")) {
        part = `${currentDiv}.${part}`;
      }

      const mDiv = part.match(/^(\d+)\./);
      if (mDiv) currentDiv = mDiv[1];

      // ranges like "23.1-4" or "11.01-6"
      const mRange = part.match(/^(\d+)\.(\d+)-(\d+)$/);
      if (mRange) {
        const div = mRange[1];
        const start = mRange[2];
        let end = mRange[3];

        const width = start.length;
        end = end.padStart(width, "0");

        const startN = Number.parseInt(start, 10);
        const endN = Number.parseInt(end, 10);

        for (let n = startN; n <= endN; n++) {
          tokens.push(`${div}.${String(n).padStart(width, "0")}`);
        }
      } else {
        tokens.push(part);
      }
    }
  }

  const keys = [];
  const pushUnique = (k) => {
    if (k && !keys.includes(k)) keys.push(k);
  };

  for (const t of tokens) {
    if (!t) continue;

    if (t.includes(".")) {
      const [divRaw, restRaw] = t.split(".", 2);
      const div = divRaw.padStart(2, "0");
      const restDigits = restRaw.replace(/\D/g, "");
      const first = restDigits[0];
      if (first) pushUnique(`${div}${first}`); // 3-digit group key
      continue;
    }

    const digits = t.replace(/\D/g, "");
    if (!digits) continue;
    if (digits.length === 1) pushUnique(digits.padStart(2, "0"));
    else pushUnique(digits.slice(0, 2)); // 2-digit division key
  }

  return keys;
}

async function build() {
  const workbookBuf = await readFile(INPUT_PATH);
  const wb = XLSX.read(workbookBuf, { type: "buffer" });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Missing sheet "${SHEET_NAME}" in ${INPUT_PATH}`);

  const title = getCellText(ws, TABLE_TITLE_CELL);
  if (!title.includes("Table 1b")) {
    console.warn(`Warning: expected Table 1b title at ${TABLE_TITLE_CELL}, got: ${title}`);
  }

  const startCol0 = colIndex(TABLE_START_COL);   // Y
  const firstDataCol0 = startCol0 + 1;           // Z
  const { year, row: yearRow } = findLatestYearRow(ws, startCol0);

  const exact = {};        // 3-digit group keys (e.g. "101")
  const groups = {};       // 2-digit division keys (e.g. "01")
  const descriptions = {}; // best-effort descriptions for keys
  const intensities = [];
  const collisions = {};   // key -> [{prev,next,from}...]

  for (let c0 = firstDataCol0; ; c0++) {
    const codeText = getCellText(ws, cellAddr(HEADER_ROW_CODE, c0));
    if (!codeText) break;
    if (/^Total/i.test(codeText)) break;

    const desc = getCellText(ws, cellAddr(HEADER_ROW_NAME, c0));
    const intensity = parseIntensity(getCellValue(ws, cellAddr(yearRow, c0)));
    if (intensity === null) continue;

    intensities.push(intensity);

    const keys = expandSicLabel(codeText);
    for (const k of keys) {
      const target = k.length === 2 ? groups : exact;

      if (target[k] === undefined) {
        target[k] = intensity;
      } else if (target[k] !== intensity) {
        (collisions[k] ??= []).push({ prev: target[k], next: intensity, from: codeText });
        target[k] = Math.max(target[k], intensity); // deterministic + conservative
      }

      if (desc && !descriptions[k]) descriptions[k] = desc;
    }
  }

  const sorted = intensities.slice().sort((a, b) => a - b);
  const bandThresholds = {
    low: Number(quantile(sorted, 0.33).toFixed(3)),
    high: Number(quantile(sorted, 0.66).toFixed(3)),
  };

  const payload = {
    meta: {
      source: "ONS Environmental Accounts – Atmospheric emissions: GHG emissions intensity (Table 1b)",
      source_file: "04atmosphericemissionsghgintensity.xlsx",
      sheet: SHEET_NAME,
      table_anchor: TABLE_TITLE_CELL,
      year,
      generated_at: new Date().toISOString(),
      band_thresholds: bandThresholds,
      collision_policy: "max",
      collision_count: Object.keys(collisions).length,
    },
    exact,
    groups,
    descriptions,
    ...(Object.keys(collisions).length ? { collisions } : {}),
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
