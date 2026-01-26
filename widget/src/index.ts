import "./styles.css";
import {
  extractJobPostingJsonLd,
  formatJobLocation,
  JobPostingExtract,
} from "../../src/extractors/jobposting_jsonld";
import { classifyLocation } from "../../src/geo/location_classifier";
import { resolvePlaceFromLocationTokens } from "../../src/geo/place_resolver";

export type WidgetBreakdown = {
  distanceKm?: number;
  officeDaysPerWeek?: number;
  annualKm?: number;
  emissionFactorKgPerKm?: number;
  annualKgCO2e?: number;
};

export type WidgetPayload = {
  status?: "ok" | "wfh" | "no_data" | "error" | "loading";
  badgeText?: string;
  score?: number;
  breakdown?: WidgetBreakdown;
  reason?: string;
};

export type WidgetInitOptions = {
  root?: ParentNode;
  doc?: Document;
  apiBaseUrl?: string;
  apiKey?: string;
};

const DATA_ATTR = "data-carbonrank";
const RENDERED_ATTR = "data-carbonrank-rendered";
const PAYLOAD_ATTR = "data-carbonrank-payload";
const MODAL_ID = "carbonrank-widget-modal";
const MODAL_TITLE_ID = "carbonrank-widget-modal-title";
const DEFAULT_API_BASE = "/api/widget/score";
const DETAIL_HOST_ATTR = "data-carbonrank-detail";

type ModalState = {
  modal: HTMLDivElement;
  closeButton: HTMLButtonElement;
  lastActive?: HTMLElement | null;
};

type WidgetScoreRequest = {
  title?: string;
  employer?: string;
  locationName?: string;
  lat?: number;
  lon?: number;
  remoteFlag?: boolean;
};

type ResolvedLocation =
  | {
      kind: "wfh";
      reason: string;
    }
  | {
      kind: "no_data";
      reason: string;
    }
  | {
      kind: "resolved";
      lat: number;
      lon: number;
      locationName: string;
    };

const modalStates = new WeakMap<Document, ModalState>();

function parsePayload(raw: string | null): WidgetPayload | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as WidgetPayload;
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined): string {
  return value ? value.trim() : "";
}

function hasServerPayload(root: ParentNode): boolean {
  if (!(root instanceof Document) && !(root instanceof Element)) {
    return false;
  }
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
  return nodes.some((node) => Boolean(normalizeText(node.getAttribute(DATA_ATTR))));
}

function resolveLocation(
  locationName: string,
  lat?: number,
  lon?: number,
  allowWfh = true,
): ResolvedLocation {
  if (typeof lat === "number" && typeof lon === "number") {
    return {
      kind: "resolved",
      lat,
      lon,
      locationName,
    };
  }

  const classification = classifyLocation(locationName);
  if (classification.kind === "wfh" && allowWfh) {
    return { kind: "wfh", reason: "Remote role" };
  }

  if (classification.kind === "no_data") {
    return { kind: "no_data", reason: classification.reason };
  }

  if (classification.kind === "wfh") {
    return { kind: "no_data", reason: "Remote role" };
  }

  const resolved = resolvePlaceFromLocationTokens(classification.tokens);
  if (resolved.kind === "unresolved") {
    return { kind: "no_data", reason: "Cannot resolve place" };
  }

  return {
    kind: "resolved",
    lat: resolved.lat,
    lon: resolved.lon,
    locationName: resolved.chosenName,
  };
}

function isRemoteCandidate(jobPosting: JobPostingExtract): boolean {
  const normalized = jobPosting.jobLocationType.map((value) => value.toUpperCase());
  return normalized.includes("TELECOMMUTE") ||
    jobPosting.applicantLocationRequirements.length > 0;
}

function extractGeo(jobPosting: JobPostingExtract): { lat?: number; lon?: number } {
  for (const location of jobPosting.jobLocations) {
    if (typeof location.latitude === "number" && typeof location.longitude === "number") {
      return { lat: location.latitude, lon: location.longitude };
    }
  }
  return {};
}

function formatBadgeText(payload: WidgetPayload | null): string {
  if (!payload) {
    return "Invalid data";
  }
  if (payload.badgeText) {
    return payload.badgeText;
  }
  if (payload.status === "wfh") {
    return "0 kgCO2e/yr";
  }
  if (payload.status === "no_data") {
    return "No data";
  }
  if (payload.status === "loading") {
    return "Loading...";
  }
  if (payload.status === "error") {
    return "Error";
  }
  const annualKg = payload.score ?? payload.breakdown?.annualKgCO2e;
  if (typeof annualKg === "number") {
    return `${Math.round(annualKg)} kgCO2e/yr`;
  }
  return "Unknown";
}

function formatReason(payload: WidgetPayload | null): string | null {
  if (!payload) {
    return "Invalid carbon data";
  }
  if (payload.reason) {
    return payload.reason;
  }
  switch (payload.status) {
    case "wfh":
      return "Remote role; commute assumed 0.";
    case "no_data":
      return "Location missing or too broad.";
    case "error":
      return "Unable to calculate.";
    default:
      return null;
  }
}

function resolveDocument(options?: WidgetInitOptions): Document {
  if (options?.doc) {
    return options.doc;
  }
  if (options?.root && !(options.root instanceof Document)) {
    return options.root.ownerDocument ?? document;
  }
  return options?.root instanceof Document ? options.root : document;
}

function ensureModal(doc: Document): ModalState {
  const existing = modalStates.get(doc);
  if (existing) {
    return existing;
  }

  const modal = doc.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "carbonrank-widget__modal";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");

  const backdrop = doc.createElement("div");
  backdrop.className = "carbonrank-widget__modal-backdrop";
  backdrop.setAttribute("data-carbonrank-modal-close", "true");

  const dialog = doc.createElement("div");
  dialog.className = "carbonrank-widget__modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", MODAL_TITLE_ID);

  const header = doc.createElement("div");
  header.className = "carbonrank-widget__modal-header";

  const title = doc.createElement("h2");
  title.id = MODAL_TITLE_ID;
  title.className = "carbonrank-widget__modal-title";
  title.textContent = "How we calculate";

  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.className = "carbonrank-widget__modal-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";

  header.append(title, closeButton);

  const body = doc.createElement("div");
  body.className = "carbonrank-widget__modal-body";
  body.innerHTML =
    "<p>CarbonRank estimates commute emissions using the job location, typical distance, and a transport factor.</p>" +
    "<p>Partners may provide additional data for more precise estimates.</p>";

  dialog.append(header, body);
  modal.append(backdrop, dialog);

  const target = doc.body ?? doc.documentElement;
  target.appendChild(modal);

  const state: ModalState = { modal, closeButton };
  modalStates.set(doc, state);

  const closeModal = () => {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    state.lastActive?.focus();
  };

  closeButton.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  return state;
}

function openModal(doc: Document, trigger?: HTMLElement | null): void {
  const state = ensureModal(doc);
  state.lastActive = trigger ?? (doc.activeElement as HTMLElement | null);
  state.modal.hidden = false;
  state.modal.setAttribute("aria-hidden", "false");
  state.closeButton.focus();
}

function renderWidget(host: HTMLElement, payload: WidgetPayload | null, doc: Document): void {
  const payloadKey = JSON.stringify(payload ?? {});
  if (
    host.getAttribute(RENDERED_ATTR) === "true" &&
    host.getAttribute(PAYLOAD_ATTR) === payloadKey
  ) {
    return;
  }

  const container = doc.createElement("div");
  container.className = "carbonrank-widget";
  container.setAttribute("data-status", payload?.status ?? "unknown");

  const badge = doc.createElement("div");
  badge.className = "carbonrank-widget__badge";
  badge.setAttribute("role", "status");
  badge.textContent = formatBadgeText(payload);

  const reason = formatReason(payload);
  const reasonEl = doc.createElement("p");
  reasonEl.className = "carbonrank-widget__reason";
  reasonEl.textContent = reason ?? "";
  if (!reason) {
    reasonEl.hidden = true;
  }

  const actions = doc.createElement("div");
  actions.className = "carbonrank-widget__actions";
  const howButton = doc.createElement("button");
  howButton.type = "button";
  howButton.className = "carbonrank-widget__how";
  howButton.textContent = "How we calculate";
  howButton.addEventListener("click", () => openModal(doc, howButton));
  actions.appendChild(howButton);

  const attribution = doc.createElement("div");
  attribution.className = "carbonrank-widget__attribution";
  attribution.textContent = "Powered by CarbonRank";

  container.append(badge, reasonEl, actions, attribution);
  host.textContent = "";
  host.appendChild(container);
  host.setAttribute(RENDERED_ATTR, "true");
  host.setAttribute(PAYLOAD_ATTR, payloadKey);
}

async function fetchScore(
  request: WidgetScoreRequest,
  options: WidgetInitOptions,
): Promise<WidgetPayload> {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  try {
    const response = await fetch(apiBaseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return {
        status: "error",
        reason: `Score request failed (${response.status})`,
      };
    }

    const payload = (await response.json()) as WidgetPayload;
    if (!payload.status) {
      return { status: "error", reason: "Invalid score response" };
    }

    return payload;
  } catch {
    return { status: "error", reason: "Score request failed" };
  }
}

function buildRequestKey(request: WidgetScoreRequest): string {
  return JSON.stringify(request);
}

async function requestScore(
  host: HTMLElement,
  request: WidgetScoreRequest,
  options: WidgetInitOptions,
  doc: Document,
): Promise<void> {
  const requestKey = buildRequestKey(request);
  if (
    host.dataset.carbonrankRequestKey === requestKey &&
    host.dataset.carbonrankRequestState === "done"
  ) {
    return;
  }

  host.dataset.carbonrankRequestKey = requestKey;
  host.dataset.carbonrankRequestState = "loading";
  renderWidget(host, { status: "loading" }, doc);

  const payload = await fetchScore(request, options);
  renderWidget(host, payload, doc);
  host.dataset.carbonrankRequestState = "done";
}

function ensureDetailHost(doc: Document): HTMLElement {
  const existing = doc.querySelector(`[${DETAIL_HOST_ATTR}]`);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const host = doc.createElement("div");
  host.setAttribute(DETAIL_HOST_ATTR, "true");

  const heading = doc.querySelector("h1");
  if (heading?.parentElement) {
    heading.insertAdjacentElement("afterend", host);
  } else {
    const target = doc.body ?? doc.documentElement;
    target.prepend(host);
  }

  return host;
}

function renderResolvedPayload(
  host: HTMLElement,
  resolved: ResolvedLocation,
  doc: Document,
): void {
  if (resolved.kind === "wfh") {
    renderWidget(host, { status: "wfh", reason: resolved.reason }, doc);
    return;
  }

  if (resolved.kind === "no_data") {
    renderWidget(host, { status: "no_data", reason: resolved.reason }, doc);
  }
}

function buildJobPostingRequest(
  jobPosting: JobPostingExtract,
  locationName: string,
  lat: number,
  lon: number,
  remoteFlag: boolean,
): WidgetScoreRequest {
  return {
    title: jobPosting.title,
    employer: jobPosting.hiringOrganizationName,
    locationName,
    lat,
    lon,
    remoteFlag,
  };
}

function handleJobPosting(
  jobPosting: JobPostingExtract,
  options: WidgetInitOptions,
  doc: Document,
): void {
  const host = ensureDetailHost(doc);
  const remoteFlag = isRemoteCandidate(jobPosting);
  if (remoteFlag) {
    renderWidget(host, { status: "wfh", reason: "Remote role" }, doc);
    return;
  }

  const locationName = formatJobLocation(jobPosting);
  const { lat, lon } = extractGeo(jobPosting);
  const resolved = resolveLocation(locationName, lat, lon);

  if (resolved.kind !== "resolved") {
    renderResolvedPayload(host, resolved, doc);
    return;
  }

  const request = buildJobPostingRequest(
    jobPosting,
    resolved.locationName,
    resolved.lat,
    resolved.lon,
    remoteFlag,
  );
  void requestScore(host, request, options, doc);
}

function initJobPosting(options: WidgetInitOptions, doc: Document): void {
  if (hasServerPayload(options.root ?? doc)) {
    return;
  }
  const jobPostings = extractJobPostingJsonLd(doc);
  if (jobPostings.length === 0) {
    return;
  }
  handleJobPosting(jobPostings[0], options, doc);
}

export function renderAll(options: WidgetInitOptions = {}): void {
  const root = options.root ?? options.doc ?? document;
  const doc = resolveDocument(options);
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
  for (const node of nodes) {
    const payload = parsePayload(node.getAttribute(DATA_ATTR));
    renderWidget(node, payload, doc);
  }
}

export function init(options: WidgetInitOptions = {}): void {
  const doc = resolveDocument(options);
  const run = () => {
    renderAll(options);
    initJobPosting(options, doc);
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
