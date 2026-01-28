# Handoff: fix-sector-intensity-display

## Summary
- Load ONS intensity map with a fallback path so values resolve reliably.
- Add SIC sector descriptions to the ONS map and API response.
- Resolve SIC3 matches for the ONS dataset and show sector baseline in UI.
- Add UI test coverage for sector baseline display.
- Track the ONS source snapshot and document attribution.

## Key files
- README.md
- server/ons_intensity.ts
- server/index.ts
- server/data/ons/04atmosphericemissionsghgintensity.xlsx
- server/data/ons/ons_intensity_map.json
- scripts/build_ons_intensity.mjs
- src/employer/types.ts
- src/features/page_score/index.ts
- tests/unit/ons_intensity.test.ts
- tests/unit/page_score_ui.test.ts
- server/README.md

## How to verify
npm test (expect unit tests to pass)

## Behavior changes
- Employer signals now return matched SIC description and code.
- Employer panel shows SIC description and sector baseline when available.

## Risks / edge cases
- Map descriptions only cover codes present in the ONS source CSV.

## Follow-ups
- Update ONS CSV with a fuller dataset for broader coverage.
