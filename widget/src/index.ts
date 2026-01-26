import "./styles.css";

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
};

const DATA_ATTR = "data-carbonrank";
const RENDERED_ATTR = "data-carbonrank-rendered";
const MODAL_ID = "carbonrank-widget-modal";
const MODAL_TITLE_ID = "carbonrank-widget-modal-title";

type ModalState = {
  modal: HTMLDivElement;
  closeButton: HTMLButtonElement;
  lastActive?: HTMLElement | null;
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
  if (host.getAttribute(RENDERED_ATTR) === "true") {
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
  const run = () => renderAll(options);

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
