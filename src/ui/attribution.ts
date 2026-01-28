import { APP_ATTRIBUTION } from "./brand";
import { resolveHelpUrl } from "./links";

type AttributionLinkOptions = {
  className?: string;
  preferLocal?: boolean;
};

export function setAttributionLink(
  link: HTMLAnchorElement,
  options: AttributionLinkOptions = {},
): void {
  link.textContent = APP_ATTRIBUTION;
  link.href = resolveHelpUrl({ preferLocal: options.preferLocal });
  link.target = "_blank";
  link.rel = "noreferrer";
  if (options.className) {
    link.className = options.className;
  }
}

export function createAttributionLink(
  doc: Document,
  options: AttributionLinkOptions = {},
): HTMLAnchorElement {
  const link = doc.createElement("a");
  if (options.className) {
    link.className = options.className;
  }
  setAttributionLink(link, options);
  return link;
}
