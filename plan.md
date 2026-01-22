# plan.md — CarbonRank Jobs (Chrome Extension MVP)

## 0) Goal (MVP)

Build a Manifest V3 Chrome extension that:

- Runs on **one job site only** (MVP: `reed.co.uk`)
- Detects job listing “cards” on search results pages
- Injects a small **CarbonRank badge** per card
- Computes a **commute-only annual CO₂e proxy** (kgCO₂e/year) when possible
- Shows an **explainable breakdown** + “insufficient data” states
- Stores user settings (home postcode, commute mode, office days/week)
- Has unit + integration + E2E tests
- Ships as an unpacked extension that a human can load locally

Non-goals (MVP):

- Perfect carbon accounting (no full scope-3, no office energy modelling)
- Multi-site support
- Scraping / bypassing ToS
- LLM usage (keep deterministic + lightweight)

---

## 1) User stories

1. As a jobseeker, I can set my **home postcode**, **commute mode**, and **days/week in office**.
2. As I browse Reed search results, I see a **CarbonRank badge** on each job card.
3. I can sort/filter in Reed normally, but the badge helps me prefer lower-CO₂e commutes.
4. If the job location can’t be resolved (e.g., “UK Wide”), the badge clearly says **“Unknown”** and why.

---

## 2) Carbon model (MVP: commute-only proxy)

### 2.1 Annual commute CO₂e

For a job with a resolvable work location:

- distance_km = haversine(home_latlng, work_latlng)
- round_trip_km_per_week = 2 _ distance_km _ office_days_per_week
- annual_km = round_trip_km_per_week \* 46 (assume 46 working weeks/year; configurable constant)
- annual_kgco2e = (annual_km \* mode_emission_factor_kgco2e_per_km)

### 2.2 Modes (MVP)

Implement a minimal set with constants sourced from UK Government GHG conversion factors:

- car (average petrol/diesel blended proxy)
- bus
- rail
- cycle (0)
- walk (0)

Store emission factors in `src/scoring/emission_factors_uk_2025্বৰ.json` with a documented update path.

**Important:** Present this as an _estimate_ with caveats.

---

## 3) Data sources (MVP)

### 3.1 Geocoding

- Home postcode -> lat/lng: Postcodes.io `GET /postcodes/:postcode`
- Work location:
  - If Reed card contains a **UK postcode**, use Postcodes.io on that postcode
  - Else: mark “Unknown” in MVP (avoid unreliable city geocoding + rate limits)

### 3.2 No routing API (MVP)

Use haversine straight-line distance for stability + speed. (Routing can be Phase 2.)

---

## 4) Architecture (Manifest V3)

### 4.1 Extension components

- `content_script`:
  - detects Reed job cards
  - extracts job metadata (title, company, location text, job URL)
  - injects badge placeholder
  - observes DOM changes (infinite scroll / dynamic updates) and re-processes new cards
- `service_worker`:
  - receives job metadata from content script
  - runs scoring pipeline (parse -> geocode -> distance -> CO₂e)
  - caches geocoding results + computed scores
  - returns score payload to content script
- `popup` (or `options` page):
  - settings form (home postcode, commute mode, days/week)
  - validation + persistence via chrome.storage
- `shared`:
  - Reed adapter (selectors + parsers)
  - scoring module
  - storage module
  - cache module

### 4.2 “Site adapter” pattern (so we can add more sites later)

Create `src/sites/reed/adapter.ts` that exports:

- `matches(url: URL): boolean`
- `findCards(document): HTMLElement[]`
- `parseCard(cardEl): ParsedJobCard`
- `injectBadge(cardEl, initialState)`
- `updateBadge(cardEl, scorePayload)`

All Reed-specific selectors live in one place.

---

## 5) Repo setup

### 5.1 Tech choices

- TypeScript
- Build: esbuild or Vite (keep simple; no remote code)
- Lint/format: ESLint + Prettier
- Unit tests: Vitest (or Jest)
- E2E: Playwright (chromium channel) to load the unpacked extension

### 5.2 Directory skeleton

- `src/manifest.json`
- `src/content_script.ts`
- `src/service_worker.ts`
- `src/popup/` (UI + styles)
- `src/sites/reed/adapter.ts`
- `src/scoring/` (haversine, emission factors, calculator)
- `src/storage/` (get/set settings, cache)
- `tests/unit/`
- `tests/fixtures/` (saved HTML samples of Reed listings)
- `tests/e2e/` (Playwright tests)
- `scripts/` (build, package, copy manifest)

---

## 6) Incremental tasks with checkpoints (HUMAN REVIEW gates)

> Rule for the agent: **No pushing to main.** Work on feature branches.  
> At each checkpoint: run tests + provide a short summary + screenshots (where relevant) and WAIT for human approval before merging.

### Milestone A — Scaffold + “Hello badge”

**Tasks**

1. Init repo, tooling, build pipeline to `dist/` (MV3-ready)
2. Minimal `manifest.json` with:
   - content script matches Reed URLs only
   - service_worker set
3. Content script injects a static “CarbonRank: …” badge into detected cards (no scoring)

**Tests**

- Unit: `reed.adapter.findCards()` against fixture HTML
- Unit: `reed.adapter.injectBadge()` ensures one badge per card (idempotent)

**Checkpoint A (human review before any PR merge)**

- Demo: load unpacked extension, open Reed search results, confirm badges appear and don’t duplicate on scroll.

---

### Milestone B — Settings UI + storage

**Tasks**

1. Add popup UI:
   - home postcode
   - commute mode dropdown
   - office days/week (0–5)
2. Validate postcode format client-side; persist to `chrome.storage.sync` (fallback to `local` if needed)
3. Content script reads settings and shows “Set your postcode” state if missing

**Tests**

- Unit: storage get/set roundtrip (mock chrome.storage)
- Unit: postcode validator

**Checkpoint B**

- Demo: change settings in popup, reload Reed page, badge reflects configured mode/days.

---

### Milestone C — Parse location & basic scoring pipeline (no network yet)

**Tasks**

1. Extend `parseCard()` to extract:
   - location string
   - job URL
2. Implement scoring pipeline skeleton:
   - `scoreJob(job, settings)` returns either `{status:"unknown"}` or `{status:"ok", kgco2e_year, breakdown}`
3. For now: only score if location string contains a postcode; else unknown

**Tests**

- Unit: `parseCard()` extracts correct fields from fixture variants
- Unit: scoring returns `unknown` when no postcode in location

**Checkpoint C**

- Human validates parsing on multiple Reed pages (different search filters, pagination).

---

### Milestone D — Postcodes.io geocoding + haversine distance

**Tasks**

1. Implement `geocodePostcode(postcode)` calling Postcodes.io
2. Add caching layer:
   - in-memory cache in service worker for session
   - persistent cache in `chrome.storage.local` keyed by postcode
3. Compute haversine distance and annual CO₂e estimate
4. Display:
   - `X kgCO₂e/year` + tooltip breakdown (distance, trips/week, factor)
   - “Unknown” states with reason

**Tests**

- Unit: haversine correctness (known points)
- Unit: cache hit/miss logic
- Integration: scoring uses cached geocode if present
- Network tests: mock Postcodes.io using request interception (no live calls)

**Checkpoint D**

- Human checks:
  - correctness sanity (e.g., 10 km commute by car gives plausible annual kgCO₂e)
  - no excessive network calls when scrolling

---

### Milestone E — DOM change handling (MutationObserver) + robustness

**Tasks**

1. Add MutationObserver to re-scan for new cards
2. Ensure idempotency: never inject multiple badges per card
3. Add error handling:
   - timeouts
   - rate-limit protection (simple concurrency limiter)
   - fallback messaging in UI

**Tests**

- Unit: `scanAndAnnotate()` idempotent on repeated calls
- Integration: simulate DOM mutations in jsdom and confirm new cards are annotated

**Checkpoint E**

- Human verifies:
  - infinite scroll / pagination works
  - extension remains responsive

---

### Milestone F — E2E Playwright tests + CI

**Tasks**

1. Add Playwright setup to load unpacked extension in tests
2. Serve fixture HTML via local test server and run:
   - badge injection visible
   - popup settings can be set
   - score updates from “loading” -> numeric
3. Add GitHub Actions:
   - lint
   - unit tests
   - e2e tests

**Tests**

- E2E: `annotates_cards.spec.ts`
- E2E: `popup_settings_persist.spec.ts`

**Checkpoint F**

- Human review test stability + CI pass.

---

## 7) Definition of Done (MVP)

- Works on Reed search results pages for at least 2–3 representative layouts captured as fixtures
- No repeated badge injection
- Settings persist and are respected
- Scores computed when both home + job postcodes are available; otherwise “Unknown” with reason
- Unit + E2E tests pass in CI
- README includes:
  - how to load unpacked extension
  - privacy note (what is stored, what calls are made)
  - methodology caveats

---

## 8) Security, privacy, sustainability constraints

- Process as much as possible locally; avoid collecting anything beyond:
  - home postcode (stored by the user)
  - mode + days/week
  - cached geocoding for postcodes
- No analytics in MVP
- Rate-limit Postcodes.io calls + cache aggressively
- No LLM calls in MVP (deterministic scoring)

---

## 9) References (implementation docs)

- Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Manifest format: https://developer.chrome.com/docs/extensions/reference/manifest
- MV3 service worker overview: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- chrome.storage: https://developer.chrome.com/docs/extensions/reference/api/storage
- MutationObserver: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
- Playwright testing extensions: https://playwright.dev/docs/chrome-extensions
- Postcodes.io docs: https://postcodes.io/docs/api
- UK GHG conversion factors 2025: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
