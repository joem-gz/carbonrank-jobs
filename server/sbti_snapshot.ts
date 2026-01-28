import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeCompanyNameLoose, normalizeCompanyNameStrict } from "./companies_house";

export type SbtiRecord = {
  sbti_id: string;
  company_name: string | null;
  location: string | null;
  region: string | null;
  sector: string | null;
  near_term_status: string | null;
  near_term_target_classification: string | null;
  near_term_target_year: string | null;
  net_zero_status: string | null;
  net_zero_year: string | null;
  ba15_status: string | null;
  date_updated: string | null;
  reason_for_extension_or_removal: string | null;
};

export type SbtiMatchStatus = "matched" | "no_match" | "low_confidence";

export type SbtiMatchResult = {
  match_status: SbtiMatchStatus;
  match_confidence: number;
  matched_company_name: string | null;
  sbti_id: string | null;
  near_term_status: string | null;
  near_term_target_classification: string | null;
  near_term_target_year: string | null;
  net_zero_status: string | null;
  net_zero_year: string | null;
  ba15_status: string | null;
  date_updated: string | null;
  reason_for_extension_or_removal: string | null;
  sources: string[];
};

type SbtiRecordIndex = {
  name_strict: string;
  name_loose: string;
  tokens: string[];
};

export type SbtiNameIndex = {
  meta: {
    snapshot_file: string;
    generated_at: string;
    record_count: number;
    min_token_length?: number;
    rare_token_max?: number;
    stopwords?: string[];
    token_frequencies?: Record<string, number>;
  };
  names: Record<string, string[]>;
  tokens: Record<string, string[]>;
  records: Record<string, SbtiRecordIndex>;
};

export type SbtiSnapshot = {
  records: Record<string, SbtiRecord>;
  index: SbtiNameIndex;
};

type SbtiRecordsPayload = {
  records: Record<string, SbtiRecord>;
};

const DEFAULT_RECORDS_PATH = resolve(
  process.cwd(),
  "server",
  "data",
  "sbti",
  "sbti_records.json",
);
const DEFAULT_INDEX_PATH = resolve(
  process.cwd(),
  "server",
  "data",
  "sbti",
  "sbti_name_index.json",
);
const FALLBACK_RECORDS_PATH = resolve(
  process.cwd(),
  "data",
  "sbti",
  "sbti_records.json",
);
const FALLBACK_INDEX_PATH = resolve(
  process.cwd(),
  "data",
  "sbti",
  "sbti_name_index.json",
);

const SBTI_SOURCE = "SBTi Companies Taking Action (snapshot)";
const FUZZY_SCORE_THRESHOLD = 95;
const STRONG_TOKEN_LENGTH = 4;
const MIN_TOKEN_MATCHES = 2;
const MAX_CANDIDATES = 200;

let cachedSnapshot: SbtiSnapshot | null | undefined;

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as T;
}

export function loadSbtiSnapshot(
  recordsPath: string = DEFAULT_RECORDS_PATH,
  indexPath: string = DEFAULT_INDEX_PATH,
): SbtiSnapshot | null {
  if (cachedSnapshot !== undefined) {
    return cachedSnapshot;
  }

  const recordCandidates =
    recordsPath === DEFAULT_RECORDS_PATH
      ? [recordsPath, FALLBACK_RECORDS_PATH]
      : [recordsPath];
  const indexCandidates =
    indexPath === DEFAULT_INDEX_PATH ? [indexPath, FALLBACK_INDEX_PATH] : [indexPath];

  let lastError: unknown;

  for (const recordPath of recordCandidates) {
    for (const indexCandidate of indexCandidates) {
      try {
        const recordsPayload = loadJson<SbtiRecordsPayload>(recordPath);
        const indexPayload = loadJson<SbtiNameIndex>(indexCandidate);
        cachedSnapshot = { records: recordsPayload.records, index: indexPayload };
        return cachedSnapshot;
      } catch (error) {
        lastError = error;
      }
    }
  }

  console.warn("[SBTI] Unable to load snapshot", lastError);
  cachedSnapshot = null;
  return cachedSnapshot;
}

function tokenize(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function isUkLocation(location?: string | null): boolean {
  if (!location) {
    return false;
  }
  const normalized = location.toLowerCase();
  return [
    "united kingdom",
    "uk",
    "great britain",
    "england",
    "scotland",
    "wales",
    "northern ireland",
  ].some((token) => normalized.includes(token));
}

function buildEmptyResult(): SbtiMatchResult {
  return {
    match_status: "no_match",
    match_confidence: 0,
    matched_company_name: null,
    sbti_id: null,
    near_term_status: null,
    near_term_target_classification: null,
    near_term_target_year: null,
    net_zero_status: null,
    net_zero_year: null,
    ba15_status: null,
    date_updated: null,
    reason_for_extension_or_removal: null,
    sources: [SBTI_SOURCE],
  };
}

function buildMatchResult(
  record: SbtiRecord,
  status: SbtiMatchStatus,
  confidence: number,
): SbtiMatchResult {
  return {
    match_status: status,
    match_confidence: confidence,
    matched_company_name: record.company_name ?? null,
    sbti_id: record.sbti_id ?? null,
    near_term_status: record.near_term_status ?? null,
    near_term_target_classification: record.near_term_target_classification ?? null,
    near_term_target_year: record.near_term_target_year ?? null,
    net_zero_status: record.net_zero_status ?? null,
    net_zero_year: record.net_zero_year ?? null,
    ba15_status: record.ba15_status ?? null,
    date_updated: record.date_updated ?? null,
    reason_for_extension_or_removal: record.reason_for_extension_or_removal ?? null,
    sources: [SBTI_SOURCE],
  };
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a) {
    return b.length;
  }
  if (!b) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, () => new Array<number>(cols));

  for (let i = 0; i < rows; i += 1) {
    dist[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    dist[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }

  return dist[a.length][b.length];
}

function ratioScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 100;
  }
  const distance = levenshteinDistance(a, b);
  const score = 1 - distance / maxLen;
  return Math.round(score * 100);
}

function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  const intersection: string[] = [];
  const diffA: string[] = [];
  const diffB: string[] = [];

  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection.push(token);
    } else {
      diffA.push(token);
    }
  }
  for (const token of tokensB) {
    if (!tokensA.has(token)) {
      diffB.push(token);
    }
  }

  const sortedIntersection = intersection.sort().join(" ");
  const combinedA = [...intersection, ...diffA].sort().join(" ");
  const combinedB = [...intersection, ...diffB].sort().join(" ");

  return Math.max(
    ratioScore(sortedIntersection, combinedA),
    ratioScore(sortedIntersection, combinedB),
    ratioScore(combinedA, combinedB),
  );
}

function pickExactMatch(
  ids: string[],
  normalizedStrict: string,
  snapshot: SbtiSnapshot,
): SbtiRecord | null {
  const candidates = ids
    .map((id) => ({ record: snapshot.records[id], index: snapshot.index.records[id] }))
    .filter((entry) => entry.record && entry.index);

  if (candidates.length === 0) {
    return null;
  }

  const ukCandidates = candidates.filter((entry) => isUkLocation(entry.record.location));
  const pool = ukCandidates.length > 0 ? ukCandidates : candidates;
  const strictMatch = pool.find((entry) => entry.index.name_strict === normalizedStrict);
  return (strictMatch ?? pool[0]).record;
}

function hasStrongTokenOverlap(
  queryTokens: string[],
  candidateTokens: string[],
  stopwords: Set<string>,
): boolean {
  const candidateSet = new Set(candidateTokens);
  return queryTokens
    .filter((token) => token.length >= STRONG_TOKEN_LENGTH)
    .filter((token) => !stopwords.has(token))
    .some((token) => candidateSet.has(token));
}

function buildCandidateIds(
  queryTokens: string[],
  index: SbtiNameIndex,
  stopwords: Set<string>,
): string[] {
  const rareTokenIndex = index.tokens ?? {};
  const filteredTokens = queryTokens.filter(
    (token) => !stopwords.has(token) && rareTokenIndex[token],
  );

  if (filteredTokens.length < MIN_TOKEN_MATCHES) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const token of filteredTokens) {
    for (const id of rareTokenIndex[token] ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= MIN_TOKEN_MATCHES)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);
}

export function matchSbtiCompany(
  name: string,
  snapshot: SbtiSnapshot | null,
): SbtiMatchResult {
  if (!snapshot || !name) {
    return buildEmptyResult();
  }

  const normalizedStrict = normalizeCompanyNameStrict(name);
  const normalizedLoose = normalizeCompanyNameLoose(name);
  if (!normalizedLoose) {
    return buildEmptyResult();
  }

  const exactIds = snapshot.index.names[normalizedLoose];
  if (exactIds && exactIds.length > 0) {
    const record = pickExactMatch(exactIds, normalizedStrict, snapshot);
    if (record) {
      return buildMatchResult(record, "matched", 1);
    }
  }

  const queryTokens = tokenize(normalizedLoose);
  if (queryTokens.length <= 2) {
    return buildEmptyResult();
  }

  const stopwords = new Set(snapshot.index.meta.stopwords ?? []);
  const candidateIds = buildCandidateIds(queryTokens, snapshot.index, stopwords);
  if (candidateIds.length === 0) {
    return buildEmptyResult();
  }

  let best:
    | { record: SbtiRecord; score: number; strictMatch: boolean; isUk: boolean }
    | undefined;

  for (const id of candidateIds) {
    const record = snapshot.records[id];
    const indexRecord = snapshot.index.records[id];
    if (!record || !indexRecord) {
      continue;
    }

    const score = tokenSetRatio(normalizedLoose, indexRecord.name_loose);
    if (score < FUZZY_SCORE_THRESHOLD) {
      continue;
    }
    if (!hasStrongTokenOverlap(queryTokens, indexRecord.tokens, stopwords)) {
      continue;
    }

    const candidate = {
      record,
      score,
      strictMatch: indexRecord.name_strict === normalizedStrict,
      isUk: isUkLocation(record.location),
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.score > best.score) {
      best = candidate;
      continue;
    }

    if (candidate.score === best.score) {
      if (candidate.isUk && !best.isUk) {
        best = candidate;
        continue;
      }
      if (candidate.strictMatch && !best.strictMatch) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return buildEmptyResult();
  }

  return buildMatchResult(best.record, "low_confidence", Number((best.score / 100).toFixed(2)));
}
