import { TOOLTIP_COPY } from "./copy/tooltips";
import { createTooltip } from "./tooltip";

export type EmployerSignalsElements = {
  root: HTMLDivElement;
  status: HTMLParagraphElement;
  advertiser: HTMLParagraphElement;
  matchName: HTMLSpanElement;
  matchConfidence: HTMLSpanElement;
  changeButton: HTMLButtonElement;
  select: HTMLSelectElement;
  sicCodes: HTMLParagraphElement;
  sicValue: HTMLSpanElement;
  intensity: HTMLParagraphElement;
  intensityValue: HTMLSpanElement;
  note: HTMLParagraphElement;
  sbtiBadge: HTMLSpanElement;
  sbtiDetails: HTMLDivElement;
  sbtiNote: HTMLParagraphElement;
};

const SIC_TOOLTIP_ID = "carbonrank-page-score-tooltip-sic";
const SECTOR_TOOLTIP_ID = "carbonrank-page-score-tooltip-sector";
const SBTI_TOOLTIP_ID = "carbonrank-page-score-tooltip-sbti";

function createElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  text = "",
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  el.className = className;
  if (text) {
    el.textContent = text;
  }
  return el;
}

function createTooltipLabel(
  doc: Document,
  labelText: string,
  tooltip: { description: string; ariaLabel: string },
  tooltipId: string,
): HTMLSpanElement {
  const label = createElement(doc, "span", "carbonrank-page-score__label", labelText);
  const tooltipEl = createTooltip(doc, {
    id: tooltipId,
    text: tooltip.description,
    ariaLabel: tooltip.ariaLabel,
  });
  label.append(tooltipEl);
  return label as HTMLSpanElement;
}

export function createEmployerSignalsPanel(doc: Document): EmployerSignalsElements {
  const root = createElement(doc, "div", "carbonrank-page-score__employer");
  const title = createElement(
    doc,
    "p",
    "carbonrank-page-score__section-title",
    "Employer signals",
  );
  const status = createElement(doc, "p", "carbonrank-page-score__employer-status");
  const advertiser = createElement(
    doc,
    "p",
    "carbonrank-page-score__employer-advertiser",
  );

  const matchRow = createElement(doc, "div", "carbonrank-page-score__employer-match");
  const matchLabel = createElement(
    doc,
    "span",
    "carbonrank-page-score__label",
    "Matched entity",
  );
  const matchName = createElement(
    doc,
    "span",
    "carbonrank-page-score__employer-name",
  );
  const matchConfidence = createElement(
    doc,
    "span",
    "carbonrank-page-score__employer-confidence",
  );
  const changeButton = createElement(
    doc,
    "button",
    "carbonrank-page-score__employer-change",
    "Change",
  );
  changeButton.type = "button";

  matchRow.append(matchLabel, matchName, matchConfidence, changeButton);

  const select = createElement(
    doc,
    "select",
    "carbonrank-page-score__employer-select",
  ) as HTMLSelectElement;
  select.hidden = true;

  const sicCodes = createElement(doc, "p", "carbonrank-page-score__employer-sic");
  const sicLabel = createTooltipLabel(
    doc,
    TOOLTIP_COPY.sic.label,
    TOOLTIP_COPY.sic,
    SIC_TOOLTIP_ID,
  );
  const sicValue = createElement(doc, "span", "carbonrank-page-score__value");
  sicCodes.append(sicLabel, sicValue);

  const intensity = createElement(doc, "p", "carbonrank-page-score__employer-intensity");
  const intensityLabel = createTooltipLabel(
    doc,
    TOOLTIP_COPY.sectorBaseline.label,
    TOOLTIP_COPY.sectorBaseline,
    SECTOR_TOOLTIP_ID,
  );
  const intensityValue = createElement(doc, "span", "carbonrank-page-score__value");
  intensity.append(intensityLabel, intensityValue);
  const note = createElement(
    doc,
    "p",
    "carbonrank-page-score__employer-note",
    "Sector baseline is industry average, not company footprint.",
  );

  const sbtiRow = createElement(doc, "div", "carbonrank-page-score__employer-sbti");
  const sbtiLabel = createTooltipLabel(
    doc,
    TOOLTIP_COPY.sbti.label,
    TOOLTIP_COPY.sbti,
    SBTI_TOOLTIP_ID,
  );
  const sbtiBadge = createElement(
    doc,
    "span",
    "carbonrank-page-score__employer-sbti-badge",
    "—",
  );
  sbtiRow.append(sbtiLabel, sbtiBadge);

  const sbtiDetails = createElement(
    doc,
    "div",
    "carbonrank-page-score__employer-sbti-details",
  ) as HTMLDivElement;
  sbtiDetails.hidden = true;
  const sbtiNote = createElement(
    doc,
    "p",
    "carbonrank-page-score__employer-sbti-note",
    "Indicates whether the employer has an SBTi commitment/validated target. It doesn’t quantify the employer’s footprint.",
  );

  root.append(
    title,
    status,
    advertiser,
    matchRow,
    select,
    sicCodes,
    intensity,
    note,
    sbtiRow,
    sbtiDetails,
    sbtiNote,
  );

  return {
    root,
    status,
    advertiser: advertiser as HTMLParagraphElement,
    matchName: matchName as HTMLSpanElement,
    matchConfidence: matchConfidence as HTMLSpanElement,
    changeButton,
    select,
    sicCodes: sicCodes as HTMLParagraphElement,
    sicValue: sicValue as HTMLSpanElement,
    intensity: intensity as HTMLParagraphElement,
    intensityValue: intensityValue as HTMLSpanElement,
    note: note as HTMLParagraphElement,
    sbtiBadge: sbtiBadge as HTMLSpanElement,
    sbtiDetails,
    sbtiNote: sbtiNote as HTMLParagraphElement,
  };
}
