# Handoff: agent/epic4-widget-api

## Summary
- Added `/api/widget/score` API with partner auth, CORS allowlist, rate limiting, and caching.
- Added widget score service and unit coverage for auth, rate limit, and caching.
- Updated widget requests to include job URL plus docs/examples for API usage.

## Key files
- server/widget_service.ts
- server/index.ts
- server/README.md
- widget/src/index.ts
- tests/unit/widget_api.test.ts
- examples/widget-jobposting-jsonld.html
- examples/widget-jobcards.html

## How to verify
Commands + expected result
- `npm test`
- `npm run build`
- `npm run test:e2e` (Playwright; requires escalated permissions)

## Behavior changes
- Widget API now requires `X-API-Key` and allowed `Origin` for `/api/widget/score`.
- Widget requests include job URL for cache hashing.

## Risks / edge cases
- Defaults use configured home coordinates and commute settings.
- Missing `Origin` header bypasses allowlist for server-to-server requests.

## Follow-ups
- Add partner docs and key rotation guidance.
