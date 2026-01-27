import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";

const INPUT_PATH = resolve(
  "server",
  "data",
  "sbti",
  "sbti_targets_uk_companies20260127.csv",
);
const RECORDS_OUTPUT_PATH = resolve("server", "data", "sbti", "sbti_records.json");
const INDEX_OUTPUT_PATH = resolve("server", "data", "sbti", "sbti_name_index.json");

const LEGAL_SUFFIXES = new Set([
  "ltd",
  "limited",
  "holdings",
  "holding",
  "group",
  "groups",
  "plc",
  "llp",
  "lp",
  "inc",
  "incorporated",
  "co",
  "company",
  "corp",
  "corporation",
  "llc",
  "gmbh",
  "sa",
  "sarl",
]);

const STOPWORDS = new Set([
  "the",
  "and",
  "group",
  "groups",
  "holding",
  "holdings",
  "company",
  "companies",
  "co",
  "plc",
  "limited",
  "ltd",
  "inc",
  "incorporated",
  "llp",
  "llc",
  "corp",
  "corporation",
  "international",
  "services",
  "service",
  "solutions",
  "solution",
  "global",
  "uk",
]);

const MIN_TOKEN_LENGTH = 2;
const RARE_TOKEN_MAX = 50;

function normalizeFreeform(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStrict(name) {
  return normalizeFreeform(name);
}

function normalizeLoose(name) {
  const cleaned = normalizeStrict(name);
  if (!cleaned) {
    return "";
  }
  const tokens = cleaned.split(" ");
  while (tokens.length > 0 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function tokenize(value) {
  return value.split(/\s+/).filter(Boolean);
}

function trimToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function normalizeDate(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return trimmed;
}

async function build() {
  const csvContent = await readFile(INPUT_PATH, "utf-8");
  const rows = parse(csvContent, {
    columns: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const records = {};
  const nameIndex = {};
  const recordTokens = {};
  const tokenCounts = {};
  const tokenIndex = new Map();

  for (const row of rows) {
    const sbtiId = String(row.sbti_id ?? "").trim();
    if (!sbtiId) {
      continue;
    }

    const companyName = String(row.company_name ?? "").trim();
    const nameStrict = normalizeStrict(companyName);
    const nameLoose = normalizeLoose(companyName);
    const rawTokens = tokenize(nameLoose)
      .filter((token) => token.length >= MIN_TOKEN_LENGTH)
      .filter((token) => !STOPWORDS.has(token));
    const tokens = Array.from(new Set(rawTokens));

    records[sbtiId] = {
      sbti_id: sbtiId,
      company_name: companyName || null,
      location: trimToNull(row.location),
      region: trimToNull(row.region),
      sector: trimToNull(row.sector),
      near_term_status: trimToNull(row.near_term_status),
      near_term_target_classification: trimToNull(row.near_term_target_classification),
      near_term_target_year: trimToNull(row.near_term_target_year),
      net_zero_status: trimToNull(row.net_zero_status),
      net_zero_year: trimToNull(row.net_zero_year),
      ba15_status: trimToNull(row.ba15_status),
      date_updated: normalizeDate(row.date_updated),
      reason_for_extension_or_removal: trimToNull(row.reason_for_extension_or_removal),
    };

    recordTokens[sbtiId] = {
      name_strict: nameStrict,
      name_loose: nameLoose,
      tokens,
    };

    if (nameLoose) {
      (nameIndex[nameLoose] ??= []).push(sbtiId);
    }

    for (const token of tokens) {
      tokenCounts[token] = (tokenCounts[token] ?? 0) + 1;
      const bucket = tokenIndex.get(token) ?? new Set();
      bucket.add(sbtiId);
      tokenIndex.set(token, bucket);
    }
  }

  const rareTokens = {};
  for (const [token, ids] of tokenIndex.entries()) {
    if ((tokenCounts[token] ?? 0) <= RARE_TOKEN_MAX) {
      rareTokens[token] = Array.from(ids);
    }
  }

  const meta = {
    snapshot_file: "sbti_targets_uk_companies20260127.csv",
    generated_at: new Date().toISOString(),
    record_count: Object.keys(records).length,
    min_token_length: MIN_TOKEN_LENGTH,
    rare_token_max: RARE_TOKEN_MAX,
    stopwords: Array.from(STOPWORDS).sort(),
    token_frequencies: tokenCounts,
  };

  const recordsPayload = { meta, records };
  const indexPayload = {
    meta,
    names: nameIndex,
    tokens: rareTokens,
    records: recordTokens,
  };

  await mkdir(dirname(RECORDS_OUTPUT_PATH), { recursive: true });
  await writeFile(RECORDS_OUTPUT_PATH, `${JSON.stringify(recordsPayload, null, 2)}\n`);
  await writeFile(INDEX_OUTPUT_PATH, `${JSON.stringify(indexPayload, null, 2)}\n`);
  console.log(`Wrote ${RECORDS_OUTPUT_PATH} and ${INDEX_OUTPUT_PATH}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
