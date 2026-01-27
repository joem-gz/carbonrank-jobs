export type EmployerSignalsElements = {
  root: HTMLDivElement;
  status: HTMLParagraphElement;
  advertiser: HTMLParagraphElement;
  matchName: HTMLSpanElement;
  matchConfidence: HTMLSpanElement;
  changeButton: HTMLButtonElement;
  select: HTMLSelectElement;
  sicCodes: HTMLParagraphElement;
  intensity: HTMLParagraphElement;
  note: HTMLParagraphElement;
  sbtiBadge: HTMLSpanElement;
  sbtiDetails: HTMLDivElement;
  sbtiNote: HTMLParagraphElement;
};

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
  const intensity = createElement(
    doc,
    "p",
    "carbonrank-page-score__employer-intensity",
  );
  intensity.title = "Sector baseline from ONS industry averages (not company footprint).";
  const note = createElement(
    doc,
    "p",
    "carbonrank-page-score__employer-note",
    "Sector baseline is industry average, not company footprint.",
  );

  const sbtiRow = createElement(doc, "div", "carbonrank-page-score__employer-sbti");
  const sbtiLabel = createElement(doc, "span", "carbonrank-page-score__label", "SBTi");
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
    intensity: intensity as HTMLParagraphElement,
    note: note as HTMLParagraphElement,
    sbtiBadge: sbtiBadge as HTMLSpanElement,
    sbtiDetails,
    sbtiNote: sbtiNote as HTMLParagraphElement,
  };
}
