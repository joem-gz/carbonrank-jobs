const POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

function normalizePostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (compact.length <= 3) {
    return compact;
  }
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function extractPostcode(text: string): string | null {
  const match = text.toUpperCase().match(POSTCODE_REGEX);
  if (!match) {
    return null;
  }
  return normalizePostcode(match[1]);
}
