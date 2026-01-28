# Handoff: feature/epic4-whitelabel-widget

## Summary
- Added Epic 4 CP4.1 widget renderer with modal shell + attribution.
- Added JSON-LD detail scanning with remote handling + geo extraction.
- Added job card scanning with selectors + MutationObserver support.
- Added examples and unit/e2e coverage for SSR, JSON-LD, and cards.

## Key files
- src/extractors/jobposting_jsonld.ts
- widget/src/index.ts
- widget/src/styles.css
- scripts/build_widget.mjs
- examples/widget-jobposting-jsonld.html
- examples/widget-jobcards.html
- examples/widget-ssr.html
- tests/unit/widget_render.test.ts
- tests/unit/widget_jsonld.test.ts
- tests/unit/widget_cards.test.ts
- tests/e2e/widget_ssr.spec.ts
- tests/e2e/widget_jsonld.spec.ts
- tests/e2e/widget_jobcards.spec.ts

## How to verify
Commands + expected result
- `npm test` (unit tests)
- `npm run build` (extension bundle for e2e suite)
- `npm run test:e2e` (Playwright widget + extension specs; requires Playwright browsers)

## Behavior changes
- `CarbonRankWidget.init()` now scans JobPosting JSON-LD and job cards when configured.
- JSON-LD parsing captures geo coordinates and uses place-name fallback.

## Risks / edge cases
- Example page expects widget assets in `dist/`.
- `make test` target not present; using npm scripts instead.
- Playwright needed escalated permissions to launch Chromium in this environment.

## Follow-ups
- CP4.4 API endpoint, auth, and caching.
- CP4.5 release packaging.
