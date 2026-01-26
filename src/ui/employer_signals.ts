export type EmployerSignalsElements = {
  root: HTMLDivElement;
  status: HTMLParagraphElement;
  matchName: HTMLSpanElement;
  matchConfidence: HTMLSpanElement;
  changeButton: HTMLButtonElement;
  select: HTMLSelectElement;
  sicCodes: HTMLParagraphElement;
  intensity: HTMLParagraphElement;
  note: HTMLParagraphElement;
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

  root.append(title, status, matchRow, select, sicCodes, intensity, note);

  return {
    root,
    status,
    matchName: matchName as HTMLSpanElement,
    matchConfidence: matchConfidence as HTMLSpanElement,
    changeButton,
    select,
    sicCodes: sicCodes as HTMLParagraphElement,
    intensity: intensity as HTMLParagraphElement,
    note: note as HTMLParagraphElement,
  };
}
