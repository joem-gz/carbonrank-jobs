export const BADGE_ATTR = "data-carbonrank-badge";
const STYLE_ID = "carbonrank-styles";

export function ensureBadge(cardEl: HTMLElement, text: string): HTMLElement {
  const existing = cardEl.querySelector(`[${BADGE_ATTR}]`);
  if (existing instanceof HTMLElement) {
    if (existing.textContent !== text) {
      existing.textContent = text;
    }
    return existing;
  }

  const badge = cardEl.ownerDocument.createElement("span");
  badge.className = "carbonrank-badge";
  badge.setAttribute(BADGE_ATTR, "true");
  badge.textContent = text;

  if (cardEl.firstChild) {
    cardEl.insertBefore(badge, cardEl.firstChild);
  } else {
    cardEl.appendChild(badge);
  }

  return badge;
}

export function ensureStyles(cssText: string, doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;

  const target = doc.head ?? doc.documentElement;
  target.appendChild(style);
}
