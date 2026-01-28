# docs/plans/2026-01-epic5-name-rebrand-ui-polish.md

## Epic 5 — Rebrand to **IsThisJobGreen?** + Help/Methodology UX (front-end)

### Goal

Rename and re-skin all user-facing surfaces from **CarbonRank** to **IsThisJobGreen?**, add consistent “Powered by IsThisJobGreen?” attribution, ship a lightweight Help page (instructions, caveats, sources), and add inline **?** tooltips for jargon (e.g. **SIC**, **SBTi**). **Front-end only**.

---

### Non-goals

* No scoring/model/backend changes
* No new analytics
* No domain/hosting migration (links + UI only)

---

## Deliverables

### 1) Cross-surface rebrand (Extension + Webpage + Widget)

**A. Naming + visuals**

* Replace all visible strings: “CarbonRank” → **“IsThisJobGreen?”** (including the question mark).
* Update icons/logos where present:

  * Extension: toolbar icon, popup header, panel headers, badge label.
  * Webpage: title, header/hero.
  * Widget: modal title, badge label (if any), footer attribution.

**B. Attribution (“Powered by…”)**

* Extension popup/panel footer: **“Powered by IsThisJobGreen?”** → Help page.
* Widget footer: **“Powered by IsThisJobGreen?”** + “How we calculate”.
* Webpage footer: consistent attribution.

**C. Canonical links**

* Single canonical Help URL used everywhere.
* Offline/dev fallback to a bundled extension Help page.

---

### 2) Help page + sources

Short, scannable Help page with:

**How to use**

* Install/enable (where relevant).
* Set postcode, commute mode, office days/week.
* What each badge/state means (numeric estimate, WFH=0, “No data/Unknown”).

**Caveats**

* Commute CO₂e is an estimate.
* Employer signals are **sector baselines**, not company footprints.
* Data gaps (missing location, agency ads, ambiguous employers).

**Sources**

* UK GHG conversion factors.
* Postcodes.io.
* Companies House + ONS sector intensity + SBTi snapshot (if shown).

**Implementation**

* Web-hosted canonical Help page.
* Bundled extension Help page as fallback.

---

### 3) **?** Tooltips for jargon (Panel + Widget)

Add **?** info tooltips for:

* **SIC**: what it is and why shown.
* **SBTi**: what it indicates and confidence caveat.
* **Sector intensity band**: explicitly a **sector baseline**, not company footprint.

Requirements:

* Accessible (keyboard + aria).
* Very short (1–3 sentences).
* Shared copy module reused across extension + widget.

---

## Suggested repo changes (agent-facing)

**Shared**

* `src/ui/brand.ts`: appName = **“IsThisJobGreen?”**, shortName, URLs, attribution text.
* `src/ui/copy/tooltips.ts`: SIC/SBTi/sector baseline copy.
* `src/ui/links.ts`: canonical Help URL + fallback resolver.

**Extension**

* Update `manifest.json` name/description and UI strings.
* Add bundled Help page (e.g. `help.html`).
* Reusable footer attribution component.

**Webpage**

* `/help` route/page using shared copy blocks.
* Footer attribution update.

**Widget**

* Footer attribution + Help link.
* Update modal titles/strings to new brand.
* Add **?** tooltips wherever employer signals appear.

---

## Milestones & checkpoints (must stop for human review where noted)

**CP5.1 — Brand constants + string sweep**
Implement `brand.ts`; replace all visible “CarbonRank” → **IsThisJobGreen?**
*STOP*: screenshots (extension popup/panel, widget demo, webpage header/footer).

**CP5.2 — Attribution everywhere**
Add “Powered by IsThisJobGreen?” with working links + fallback.


**CP5.3 — Help page (web + fallback)**
Create pages with how-to, caveats, sources.
*Commit* this milestone before proceeding.

**CP5.4 — **?** Tooltips**
Add accessible tooltips with shared copy.
*Commit* this milestone before proceeding.

**CP5.5 — Release readiness**
Update docs/readmes; final QA.
*Commit* this milestone then *STOP* for human review.

---

## Testing

* **Unit**: brand constants; tooltip copy snapshots; attribution component.
* **Integration**: widget demo renders branded footer; extension injects correctly.
* **E2E (Playwright)**: unpacked extension shows **IsThisJobGreen?**; Help link opens; widget “How we calculate” works.

---

## Acceptance criteria

* No user-visible “CarbonRank” remains.
* Consistent **“Powered by IsThisJobGreen?”** across extension, webpage, widget.
* Clear Help page (use, caveats, sources).
* **?** tooltips present and non-overclaiming.
* All tests pass; snapshots updated intentionally.
