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
1. Add a build-time data import:
   - source file checked into `server/data/ons/` (or downloaded in CI if stable URL)
   - transform into JSON map keyed by SIC code prefix rules
2. Define mapping rule (draft):
   - try exact SIC4/5
   - fallback to SIC2 prefix group
   - else “unknown”
3. Produce “banding” function:
   - convert numeric intensity into: Low / Medium / High (quantiles over all industries)
   - store band thresholds in the generated JSON

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
