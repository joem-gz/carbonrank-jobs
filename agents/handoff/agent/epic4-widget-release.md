# Handoff: agent/epic4-widget-release

## Summary
- Added versioned widget build outputs and aligned examples to `widget-1.0.0` assets.
- Added partner guide, changelog, and demo deployment plan for CP4.5.
- Updated e2e widget build helper to emit versioned assets.

## Key files
- scripts/build_widget.mjs
- tests/e2e/widget_build.ts
- examples/widget-ssr.html
- examples/widget-jobposting-jsonld.html
- examples/widget-jobcards.html
- docs/widget/partner-guide.md
- CHANGELOG.md

## How to verify
Commands + expected result
- `npm test`
- `npm run build`
- `npm run test:e2e` (Playwright; requires escalated permissions)

## Behavior changes
- Widget build now produces `dist/widget-1.0.0.js` and `dist/widget-1.0.0.css` alongside unversioned assets.

## Risks / edge cases
- Examples hardcode the current widget version; bump when version changes.
- Playwright requires escalated permissions to launch Chromium.

## Follow-ups
- Publish versioned assets to CDN and add SRI hashes in docs.
