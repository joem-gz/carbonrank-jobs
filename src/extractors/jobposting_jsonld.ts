export type JobLocationExtract = {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  addressPostalCode?: string;
};

export type JobPostingExtract = {
  title: string;
  hiringOrganizationName: string;
  jobLocations: JobLocationExtract[];
  jobLocationType: string[];
  applicantLocationRequirements: string[];
};

type JsonLdObject = Record<string, unknown>;

const REMOTE_HINTS = [
  "telecommute",
  "remote",
  "work from home",
  "work-from-home",
  "home based",
  "home-based",
  "wfh",
  "anywhere",
];

function isObject(value: unknown): value is JsonLdObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function uniqueParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(part);
  }
  return result;
}

function formatLocationParts(location: JobLocationExtract): string {
  const parts = uniqueParts(
    [location.addressLocality, location.addressRegion, location.addressCountry]
      .map((part) => (part ?? "").trim())
      .filter(Boolean),
  );
  return parts.join(", ");
}

function collectJsonLdObjects(value: unknown): JsonLdObject[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectJsonLdObjects);
  }
  if (!isObject(value)) {
    return [];
  }

  const objects: JsonLdObject[] = [value];
  if (value["@graph"]) {
    objects.push(...collectJsonLdObjects(value["@graph"]));
  }
  return objects;
}

function readScriptJsonLd(script: HTMLScriptElement): JsonLdObject[] {
  const text = script.textContent;
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    return collectJsonLdObjects(parsed);
  } catch {
    return [];
  }
}

function getTypeList(node: JsonLdObject): string[] {
  const typeValue = node["@type"];
  if (typeof typeValue === "string") {
    return [typeValue];
  }
  if (Array.isArray(typeValue)) {
    return typeValue.filter((entry) => typeof entry === "string") as string[];
  }
  return [];
}

function isJobPostingNode(node: JsonLdObject): boolean {
  return getTypeList(node).some(
    (type) => type.trim().toLowerCase() === "jobposting",
  );
}

function extractHiringOrganization(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!isObject(value)) {
    return "";
  }
  return toTrimmedString(value.name ?? value["legalName"]);
}

function extractJobLocationType(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim()].filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => toTrimmedString(entry))
      .filter(Boolean);
  }
  return [];
}

function parseAddress(value: unknown): JobLocationExtract | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { addressLocality: text } : null;
  }
  if (!isObject(value)) {
    return null;
  }

  const addressLocality = toTrimmedString(value.addressLocality);
  const addressRegion = toTrimmedString(value.addressRegion);
  const addressCountry = toTrimmedString(value.addressCountry);
  const addressPostalCode = toTrimmedString(value.postalCode);

  if (!addressLocality && !addressRegion && !addressCountry && !addressPostalCode) {
    return null;
  }

  return {
    addressLocality: addressLocality || undefined,
    addressRegion: addressRegion || undefined,
    addressCountry: addressCountry || undefined,
    addressPostalCode: addressPostalCode || undefined,
  };
}

function parseJobLocation(value: unknown): JobLocationExtract | null {
  if (typeof value === "string") {
    return parseAddress(value);
  }
  if (!isObject(value)) {
    return null;
  }
  if (value.address) {
    return parseAddress(value.address);
  }
  return parseAddress(value);
}

function extractJobLocations(value: unknown): JobLocationExtract[] {
  if (Array.isArray(value)) {
    return value.map(parseJobLocation).filter(Boolean) as JobLocationExtract[];
  }
  const parsed = parseJobLocation(value);
  return parsed ? [parsed] : [];
}

function extractApplicantLocationRequirements(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractApplicantLocationRequirements);
  }
  if (!isObject(value)) {
    return [];
  }

  const name = toTrimmedString(value.name ?? value.description);
  const address = parseAddress(value.address ?? value);
  const formatted = address ? formatLocationParts(address) : "";

  return [name, formatted].filter(Boolean);
}

export function extractJobPostingJsonLd(doc: Document): JobPostingExtract[] {
  const scripts = Array.from(
    doc.querySelectorAll<HTMLScriptElement>("script[type=\"application/ld+json\"]"),
  );

  const nodes = scripts.flatMap(readScriptJsonLd);
  return nodes.filter(isJobPostingNode).map((node) => ({
    title: toTrimmedString(node.title),
    hiringOrganizationName: extractHiringOrganization(node.hiringOrganization),
    jobLocations: extractJobLocations(node.jobLocation),
    jobLocationType: extractJobLocationType(node.jobLocationType),
    applicantLocationRequirements: extractApplicantLocationRequirements(
      node.applicantLocationRequirements,
    ),
  }));
}

export function formatJobLocation(jobPosting: JobPostingExtract): string {
  for (const location of jobPosting.jobLocations) {
    const formatted = formatLocationParts(location);
    if (formatted) {
      return formatted;
    }
  }
  return "";
}

export function isRemoteJobPosting(jobPosting: JobPostingExtract): boolean {
  const normalizedTypes = jobPosting.jobLocationType.map((value) => value.toUpperCase());
  if (normalizedTypes.includes("TELECOMMUTE")) {
    return true;
  }

  const requirementText = jobPosting.applicantLocationRequirements
    .join(" ")
    .toLowerCase();
  return REMOTE_HINTS.some((hint) => requirementText.includes(hint));
}
