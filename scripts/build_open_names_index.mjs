import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";
import proj4 from "proj4";
import yauzl from "yauzl";

const INPUT_ZIP = resolve("data/os-open-names.zip");
const HEADER_PATH = resolve("data/os-open-names-header.csv");
const OUTPUT_PATH = resolve("src/data/uk_places_index.json");
const HEADER_URL =
  "https://1897589978-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F...%2Fos-open-names-header.csv";
const DEFAULT_ZIP_URL =
  "https://api.os.uk/downloads/v1/products/OpenNames/download?format=CSV";
const DOWNLOAD_TIMEOUT_MS = 10_000;

const LOCAL_TYPES = new Set([
  "City",
  "Town",
  "Village",
  "Hamlet",
  "Suburban Area",
  "London Borough",
  "Other Settlement",
]);

const EPSG27700 =
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs";

proj4.defs("EPSG:27700", EPSG27700);

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url, destPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    await mkdir(dirname(destPath), { recursive: true });
    const stream = Readable.fromWeb(response.body);
    await pipeline(stream, createWriteStream(destPath));
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureHeaderFile() {
  if (await fileExists(HEADER_PATH)) {
    return;
  }

  if (await extractHeaderFromZip()) {
    return;
  }

  try {
    console.log("Downloading OS Open Names header CSV...");
    await downloadToFile(HEADER_URL, HEADER_PATH);
  } catch (error) {
    console.error("Failed to download header CSV.");
    console.error(error);
    console.error(`Place the header file at ${HEADER_PATH}.`);
    process.exit(1);
  }
}

async function extractHeaderFromZip() {
  if (!(await fileExists(INPUT_ZIP))) {
    return false;
  }

  return new Promise((resolveExtract, rejectExtract) => {
    yauzl.open(INPUT_ZIP, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        resolveExtract(false);
        return;
      }

      zip.on("entry", (entry) => {
        const name = entry.fileName.toLowerCase();
        if (!name.endsWith("os_open_names_header.csv")) {
          zip.readEntry();
          return;
        }

        zip.openReadStream(entry, async (streamError, stream) => {
          if (streamError || !stream) {
            rejectExtract(streamError ?? new Error("Unable to read header entry"));
            return;
          }

          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", (error) => rejectExtract(error));
          stream.on("end", async () => {
            await mkdir(dirname(HEADER_PATH), { recursive: true });
            await writeFile(HEADER_PATH, Buffer.concat(chunks));
            zip.close();
            resolveExtract(true);
          });
        });
      });

      zip.on("end", () => resolveExtract(false));
      zip.on("error", (error) => rejectExtract(error));

      zip.readEntry();
    });
  });
}

async function ensureZipFile() {
  if (await fileExists(INPUT_ZIP)) {
    return;
  }

  try {
    console.log("Downloading OS Open Names ZIP...");
    await downloadToFile(DEFAULT_ZIP_URL, INPUT_ZIP);
  } catch (error) {
    console.error("Failed to download OS Open Names ZIP.");
    console.error(error);
    console.error(`Place the zip file at ${INPUT_ZIP}.`);
    process.exit(1);
  }
}

async function loadHeaderColumns() {
  await ensureHeaderFile();
  const content = await readFile(HEADER_PATH, "utf-8");
  const records = parseSync(content, {
    relax_quotes: true,
    relax_column_count: true,
  });
  if (!records.length) {
    throw new Error("Header CSV is empty.");
  }

  return records[0].map((value) => String(value).replace(/^\uFEFF/, "").trim());
}

function normalizeKey(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .toLowerCase();
}

function pickValue(record, candidates) {
  for (const key of candidates) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function addPlace(map, key, entry) {
  if (!key) {
    return;
  }
  const list = map.get(key) ?? [];
  const exists = list.some(
    (item) => item.name === entry.name && item.lat === entry.lat && item.lon === entry.lon,
  );
  if (!exists) {
    list.push(entry);
    map.set(key, list);
  }
}

async function processCsvStream(stream, headers, placesMap) {
  const parser = parse({
    columns: headers,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  stream.pipe(parser);

  for await (const record of parser) {
    const localType = pickValue(record, ["LOCAL_TYPE", "LOCALTYPE", "LOCAL_TYPE_CODE"]);
    if (!LOCAL_TYPES.has(localType)) {
      continue;
    }

    const name1 = pickValue(record, ["NAME1", "NAME", "NAME_1"]);
    if (!name1) {
      continue;
    }

    const name2 = pickValue(record, ["NAME2", "ALT_NAME", "NAME_2"]);
    const county = pickValue(record, ["COUNTY_UNITARY", "COUNTY", "COUNTY_UNITARY_NAME"]);
    const region = pickValue(record, ["REGION", "REGION_NAME"]);
    const country = pickValue(record, ["COUNTRY", "COUNTRY_NAME"]);

    const eastingRaw = pickValue(record, ["GEOMETRY_X", "X_COORDINATE", "EASTING"]);
    const northingRaw = pickValue(record, ["GEOMETRY_Y", "Y_COORDINATE", "NORTHING"]);

    const easting = Number(eastingRaw);
    const northing = Number(northingRaw);
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
      continue;
    }

    const [lon, lat] = proj4("EPSG:27700", "EPSG:4326", [easting, northing]);

    const entry = {
      name: name1,
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      local_type: localType,
      county_unitary: county,
      region,
      country,
    };

    addPlace(placesMap, normalizeKey(name1), entry);
    if (name2 && normalizeKey(name2) !== normalizeKey(name1)) {
      addPlace(placesMap, normalizeKey(name2), entry);
    }
  }
}

async function buildIndex() {
  await ensureZipFile();
  const headers = await loadHeaderColumns();

  const placesMap = new Map();

  const zipFile = await new Promise((resolveZip, reject) => {
    yauzl.open(INPUT_ZIP, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(err ?? new Error("Unable to open zip file"));
        return;
      }
      resolveZip(zip);
    });
  });

  await new Promise((resolveZip, reject) => {
    const zip = zipFile;

    function readNext() {
      zip.readEntry();
    }

    zip.on("entry", (entry) => {
      if (entry.fileName.endsWith("/")) {
        readNext();
        return;
      }

      if (!entry.fileName.toLowerCase().endsWith(".csv")) {
        readNext();
        return;
      }

      zip.openReadStream(entry, async (error, stream) => {
        if (error || !stream) {
          reject(error ?? new Error("Unable to read zip entry"));
          return;
        }

        try {
          await processCsvStream(stream, headers, placesMap);
          readNext();
        } catch (streamError) {
          reject(streamError);
        }
      });
    });

    zip.on("error", (err) => reject(err));
    zip.on("end", () => resolveZip());

    readNext();
  });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });

  const output = {
    meta: {
      source: "OS Open Names",
      buildDate: new Date().toISOString().slice(0, 10),
      license: "OGL",
      attribution: "Contains OS Open Names data © Crown copyright and database rights",
    },
    places: Object.fromEntries(placesMap.entries()),
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output));
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Places: ${placesMap.size}`);
}

buildIndex().catch((error) => {
  console.error("Failed to build OS Open Names index.");
  console.error(error);
  process.exit(1);
});
