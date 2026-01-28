# Handoff: feature/epic3-employer-impact-signals

## Summary
- Added Companies House client + resolver scoring utilities for employer matching.
- Added `/api/employer/resolve` and `/api/employer/signals` endpoints with caching.
- Added unit tests for normalization/ranking and mocked HTTP requests.
- Added `Makefile` with `make test` runner.
- Added ONS intensity import + mapping to provide sector baseline bands.
- Added employer signals UI panel with override controls and tooltip status.

## Key files
- `server/companies_house.ts`
- `server/index.ts`
- `server/ons_intensity.ts`
- `server/data/ons/ons_intensity_map.json`
- `scripts/build_ons_intensity.mjs`
- `src/features/page_score/index.ts`
- `src/content/scan.ts`
- `src/storage/employer_overrides.ts`
- `tests/unit/ons_intensity.test.ts`
- `docs/attribution.md`

## How to verify
- `make test`
- `npm run lint`
- `npm run build`

## Behavior changes
- New backend endpoints for employer resolution and SIC lookup.
- `/api/employer/signals` now returns sector intensity band/value from ONS data.
- Employer signals panel appears in the page score UI; job card tooltip includes employer status.

## Risks / edge cases
- Employer matching relies on heuristic scores; low-confidence matches may be shown.
- Sector baseline values are illustrative until production ONS data is supplied.

## Follow-ups
- Continue with CP3.2 ONS intensity mapping after review.
