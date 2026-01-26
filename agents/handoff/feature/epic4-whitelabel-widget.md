# Handoff: feature/epic4-whitelabel-widget

## Summary
- Added Epic 4 CP4.1 widget renderer with modal shell + attribution.
- Added widget build script and server-rendered example page.
- Added unit and Playwright coverage for widget render states.

## Key files
- widget/src/index.ts
- widget/src/styles.css
- scripts/build_widget.mjs
- examples/widget-jobposting-jsonld.html
- tests/unit/widget_render.test.ts
- tests/e2e/widget_ssr.spec.ts

## How to verify
Commands + expected result
- `npm run build` (extension bundle for e2e suite)
- `npm run build:widget` (generates `dist/widget.js` + `dist/widget.css`)
- `npm test` (unit tests)
- `npm run test:e2e` (Playwright checks widget example; requires Playwright browsers)

## Behavior changes
- New `CarbonRankWidget.init()` renders server-provided `data-carbonrank` payloads.

## Risks / edge cases
- Example page expects widget assets in `dist/`.
- `make test` target not present; using npm scripts instead.
- Playwright needed escalated permissions to launch Chromium in this environment.

## Follow-ups
- CP4.2 JSON-LD detail parsing.
- CP4.3 job card integration.
