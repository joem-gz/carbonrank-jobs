# docs/plans/epic3-employer-impact-signals.md

## Epic 3 — Employer impact signals v1 (6-week sprint, aggressive)

### Goal
Add an employer “Impact Signals” panel that complements commute CO2 with:
1) Employer identity + SIC code(s) (Companies House)
2) Sector emissions-intensity baseline band (ONS, SIC 2007-based)
3) SBTi target/commitment badge (public list ingestion)

### Non-goals (v1)
- No claims of company-specific footprint unless employer provides verified disclosures.
- No automated “greenwashing” scoring.
- No paid features/billing in this epic (just feature foundation).

---

## Architecture (recommended)
- Extend the existing backend proxy (already needed for job-feed APIs) with **employer enrichment endpoints**.
- Keep API keys off the extension (Companies House API key stays server-side).
- Cache aggressively (employer lookups are repetitive).

### New backend endpoints (proposal)
- `GET /api/employer/resolve?name=...&hint_location=...`
  - returns ranked candidates: `{company_number, title, status, address_snippet, sic_codes[], score, reasons[]}`
- `GET /api/employer/signals?company_number=...`
  - returns `{company_number, sic_codes[], sector_intensity_band, sector_intensity_value, sbti_status, sources[]}`
- `GET /api/employer/sbti?name=...`
  - optional: direct SBTi match endpoint using ingested dataset snapshot

### New extension UI
- Job card tooltip (short): “Employer signals: available / low confidence / no data”
- Job detail panel (full):
  - “Employer match” (name + confidence + “change match”)
  - SIC codes + sector baseline band
  - SBTi status badge (if matched)

---

## Data pipeline tasks

### A) Companies House integration
1. Add Companies House API client:
   - supports company search by name
   - fetch company profile by company_number (to get sic_codes)
2. Implement name normalization:
   - strip legal suffixes (Ltd, Limited, PLC, LLP, Inc, etc.)
   - remove punctuation, normalize whitespace
3. Implement resolver ranking:
   - exact normalized match
   - token overlap
   - optional location hint match (if job location contains city/region)
4. Cache:
   - search results (TTL 7 days)
   - company profile (TTL 30 days)

### B) ONS sector intensity baseline
## Replace Epic 3 section “B) ONS sector intensity baseline” with this

### B) ONS sector intensity baseline (revised)

1. Source + storage:
   - Use the ONS “UK environmental accounts: Atmospheric emissions – GHG emissions intensity” Excel snapshot.
   - Store the downloaded `.xlsx` at `server/data/ons/04atmosphericemissionsghgintensity.xlsx` (pinned snapshot), and generate a derived JSON map committed to repo: `server/data/ons/ons_intensity_map.json`.

2. Table + year selection (deterministic):
   - Extract from sheet **“GHG intensity”**, **Table 1b** (anchor cell **Y7**).
   - Read **SIC labels** from the header row (starting **Z9**; **Y9** is the label cell), and **industry names** from the next row (starting **Z10**).
   - Year values are in **column Y** from row 11 downward; select the **latest year row present** and use that row for all intensity values.

3. Keying & runtime lookup rule
   - Build a mapping keyed primarily to **SIC group (3-digit)**, to match Companies House SIC5 → **first 3 digits** (`sic3`) resolution.
   - Also generate a **SIC division (2-digit)** fallback map (`sic2`) for cases where only a division-level match is possible.
   - Runtime resolution: try `sic3` first → else `sic2` → else “unknown”.

4. Parsing SIC header labels (including combined cells)
   - Use the **formatted cell text** from Excel (not raw numeric) to avoid float/formatting issues.
   - Expand combined labels into deterministic keys, supporting patterns seen in the sheet:
     * ranges (e.g., `23.1-4`, `11.01-6`)
     * conjunctions (e.g., `… & 12`)
     * plus lists (e.g., `20.11+20.13+20.15`, `30.2+4+9`)
     * division-only labels with exclusions (e.g., `33 (not 33.15-16)`): treat as **division key only** (`"33"`) and do not attempt to infer missing group keys.

5. Collisions & conservatism
   - When a generated key would be assigned multiple intensities (due to combined labels / overlaps), resolve deterministically using **max intensity** (conservative).
   - Record collisions in the generated JSON (for audit/review).

6. Band thresholds + metadata
   - Compute Low/Medium/High bands from quantiles over all extracted intensity values (e.g., 33rd and 66th percentiles) and store thresholds in JSON.
   - Store metadata: source name, file name, sheet/table anchor, selected year, generated timestamp, collision policy.

7. Tests

   - Unit tests for: label expansion cases above, year-row detection, `sic3` then `sic2` lookup, and collision policy behaviour.

### C) SBTi dataset ingestion
1. Decide ingestion method (v1):
   - manual download of a public dataset snapshot into `server/data/sbti/` (tracked)
   - OR a scheduled fetch job that updates a stored snapshot (requires legal/ToS review)
2. Implement matching:
   - normalized company name matching (plus aliases if available)
   - store match confidence + matched string

---

## Milestones & checkpoints (must stop for human review)

### CP3.1 — Backend: Companies House resolve + profile (no UI)
- Implement `/api/employer/resolve`
- Implement `/api/employer/signals` returning sic_codes only
- Tests: unit + integration (mock HTTP)
- STOP: provide a short report + sample JSON outputs + proposed confidence rules

### CP3.2 — ONS mapping + intensity bands wired into `/signals`
- Add import script + generated `ons_intensity_map.json`
- `/api/employer/signals` includes sector intensity band + value
- Tests: mapping edge cases (missing SIC, multiple SICs, fallback)
- Report with 10 manual spot-checks, proceed to CP3.3

### CP3.3 — Extension UI: employer panel (confidence + override)
- Add UI section showing:
  - “Matched entity” with confidence and “change”
  - SIC codes + sector band explanation tooltip
- Add local storage of user override by employer name/domain
- Tests: UI unit tests + minimal e2e fixture
- STOP: screenshot + UX notes (avoid misleading claims)

### CP3.4 — SBTi badge v1
- Add SBTi snapshot ingestion
- Matching + badge in UI with confidence threshold
- Tests: matching fixtures
- STOP: show false-positive/false-negative examples; confirm threshold

---

## Testing plan
- Backend:
  - unit tests: normalization, ranking, SIC mapping, banding
  - integration tests: mock Companies House API responses
- Extension:
  - unit tests: rendering states (no data / low confidence / matched)
  - e2e: mock backend endpoints; verify panel displays expected fields

---

## Repo changes checklist
- `server/`:
  - new clients: `companies_house.ts`, `ons_intensity.ts`, `sbti_snapshot.ts`
  - data: `server/data/ons/*.json`, `server/data/sbti/*.json`
- `extension/`:
  - new UI component: `EmployerSignalsPanel`
  - new storage keys for overrides
- `docs/`:
  - add attribution section (OS / OGL / sources list)

---

## Acceptance criteria
- For ≥70% of jobs with a clear employer name, show:
  - an employer match confidence
  - SIC codes (when found)
  - sector intensity band (when SIC can be mapped)
- SBTi badge shown only when match confidence is high
- Clear caveats in UI: “sector baseline” not “company footprint”
