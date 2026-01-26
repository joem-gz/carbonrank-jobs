# Handoff: feature/epic3-employer-impact-signals

## Summary
- Added Companies House client + resolver scoring utilities for employer matching.
- Added `/api/employer/resolve` and `/api/employer/signals` endpoints with caching.
- Added unit tests for normalization/ranking and mocked HTTP requests.
- Added `Makefile` with `make test` runner.

## Key files
- `server/companies_house.ts`
- `server/index.ts`
- `tests/unit/companies_house.test.ts`
- `server/.env.example`
- `server/README.md`
- `Makefile`

## How to verify
- `make test`
- `npm run lint`
- `npm run build`

## Behavior changes
- New backend endpoints for employer resolution and SIC lookup.

## Risks / edge cases
- None noted.

## Follow-ups
- Continue with CP3.2 ONS intensity mapping after review.
