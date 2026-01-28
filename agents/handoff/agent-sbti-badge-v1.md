# Handoff: agent/sbti-badge-v1

## Summary
- Added SBTi snapshot build script + indexed data for matching.
- Wired SBTi matching into `/api/employer/signals` and employer panel badge/details.
- Added tests for matching + UI and updated attribution/docs.
- SBTi details now show matched company name for testing.

## Key files
- `scripts/build_sbti_snapshot.mjs`
- `server/sbti_snapshot.ts`
- `server/index.ts`
- `server/data/sbti/sbti_records.json`
- `server/data/sbti/sbti_name_index.json`
- `src/ui/employer_signals.ts`
- `src/features/page_score/index.ts`
- `src/features/page_score/page_score.css`
- `tests/unit/sbti_snapshot.test.ts`

## How to verify
- `npm test -- tests/unit/sbti_snapshot.test.ts tests/unit/page_score_ui.test.ts`
- Optional: `node scripts/build_sbti_snapshot.mjs` to regenerate SBTi indexes.

## Behavior changes
- `/api/employer/signals` now returns an `sbti` block based on company title matching.
- Employer panel displays SBTi badge and details on high-confidence matches.

## Risks / edge cases
- Short or generic names skip fuzzy matches by design.
- Duplicate names prefer UK locations before strict match.

## Follow-ups
- Consider surfacing snapshot date in the methodology modal.
