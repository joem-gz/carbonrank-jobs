const LEGAL_SUFFIXES = new Set([
  "ltd",
  "limited",
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

function normalizeFreeform(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmployerName(name: string): string {
  const cleaned = normalizeFreeform(name);
  if (!cleaned) {
    return "";
  }

  const tokens = cleaned.split(" ");
  while (tokens.length > 0 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens.join(" ");
}

export function normalizeEmployerDomain(domain: string): string {
  return normalizeFreeform(domain).replace(/^www\./, "");
}
