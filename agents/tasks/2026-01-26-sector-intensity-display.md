# Task: Improve sector intensity display and SIC labels
Owner agent/tool: Codex CLI
Branch: agent/sector-intensity

## Scope
Will change:
- Ensure ONS intensity map loads reliably regardless of working directory.
- Surface sector descriptions for matched SIC codes.
- Update employer signals UI to show friendly sector labels.
- Track the ONS source snapshot and add attribution.
Won’t change:
- Employer resolve logic or matching heuristics.
- Badge layout/styling.

## Files likely touched
- server/ons_intensity.ts
- server/index.ts
- scripts/build_ons_intensity.mjs
- server/data/ons/ons_intensity_map.json
- server/data/ons/04atmosphericemissionsghgintensity.xlsx
- src/employer/types.ts
- src/employer/api.ts
- src/features/page_score/index.ts
- tests/unit/ons_intensity.test.ts
- README.md

## Success criteria
- Sector baseline shows values when SIC codes map to ONS data.
- UI shows sector description alongside SIC code.
- ONS snapshot is tracked with attribution.
- Tests cover map description handling.

## Plan (short)
- Extend ONS map with descriptions.
- Return description from server signals.
- Render description in employer panel.
- Add/update tests and notes.

## Validation (commands)
- npm test

## Risks / edge cases
- Existing map generation must remain compatible.

## Decisions / notes
- Keep description mapping based on ONS source CSV.
