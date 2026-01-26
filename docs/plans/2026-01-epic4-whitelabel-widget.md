# docs/plans/epic4-whitelabel-widget.md

## Epic 4 — White-label widget for job boards (8-week sprint, aggressive)

### Goal
Ship a partner-embeddable widget that displays:
- Commute CO2 (or WFH=0 / No data)
- Optional Employer Signals (from Epic 3)
- A “How we calculate” modal + attribution

Widget must work on:
1) Job detail pages with JobPosting JSON-LD
2) Job listings pages with partner-provided selectors or data attributes

### Integration modes
A) Server-side render (preferred for partners)
- Partner calls CarbonRank API during page render and injects:
  - `<span data-carbonrank='{"score":...,"breakdown":...}'></span>`
- Client widget only formats UI.

B) Client-side scan (fastest for pilots)
- Partner includes `<script src=".../carbonrank-widget.js"></script>`
- Widget:
  - detects JobPosting JSON-LD on detail pages
  - detects job cards via attributes/config
  - calls CarbonRank API to fetch scores

---

## Deliverables
1) `widget/` package
- TypeScript source
- build to `dist/widget.js` + `dist/widget.css`
- minimal footprint; no heavy deps

2) CarbonRank Widget API (extend existing backend)
- `POST /api/widget/score`
  - input: job payload `{title, employer, locationName, lat, lon, remoteFlag, jobPostingJsonLd?}`
  - output: `{badgeText, status, score, breakdown, employerSignals?}`
- API keys per partner (rate limiting + usage metrics)

3) Partner docs + demo pages
- `examples/widget-jobposting-jsonld.html`
- `examples/widget-jobcards.html`
- Setup guide + troubleshooting (CSP, CORS, caching)

---

## Milestones & checkpoints (must stop for human review)

### CP4.1 — Widget skeleton + server-side render mode
- Implement a widget that renders from `data-carbonrank` attribute only (no API calls yet)
- Provide a “methodology” modal shell + attribution footer
- Tests:
  - unit: render states
  - playwright: open local example page and assert DOM

STOP: review UI, branding, and accessibility.

### CP4.2 — JSON-LD detail page support
- Parse JobPosting JSON-LD (reuse existing extractor)
- Resolve remote:
  - if `jobLocationType == TELECOMMUTE` OR applicantLocationRequirements present -> remote candidate
- Fallback to place-name resolver if no lat/lon
- Tests:
  - fixtures with JobPosting variants (remote + on-site + missing fields)
  - playwright against static example pages

STOP: review remote/hybrid heuristics.

### CP4.3 — Job cards integration (configurable)
- Support partner config:
  - `window.CarbonRankWidget.init({ cardSelector, fields: { employer, location, link }, ... })`
- Idempotent MutationObserver
- Tests:
  - DOM mutation fixture
  - ensure no double-annotation

STOP: review performance + selector ergonomics.

### CP4.4 — Live API mode + partner keys
- Add `/api/widget/score` and partner API key auth
- Implement caching:
  - per job URL hash (TTL 1–7 days)
- Add CORS allowlist per partner origin
- Tests:
  - backend integration: auth + rate limit
  - widget integration: mock fetch and assert badge updates

STOP: review security model + key rotation story.

### CP4.5 — Packaging + release readiness
- Versioned build artefacts
- Changelog + partner docs
- Demo deployment plan (static hosting)

STOP: final review.

---

## Testing plan
- Widget:
  - unit tests with jsdom
  - playwright: example pages
- Backend:
  - unit: auth, rate limiting, caching keys
  - integration: score endpoint with representative payloads

---

## Operational / security notes
- Provide SRI hash guidance for partner script tags (optional)
- Document CSP requirements (script-src, connect-src)
- Clarify data handling: only job metadata + optional user postcode (if partner chooses)

---

## Acceptance criteria
- Partner can integrate in <30 minutes using either:
  - server-side render (no API calls from browser)
  - client-side scan + API key
- Widget correctly shows:
  - WFH = 0
  - “No data” for broad locations
  - numeric values for resolvable locations
- Accessibility: keyboard + screen-reader friendly tooltip/modal
