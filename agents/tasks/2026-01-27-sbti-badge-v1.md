# Task: CP3.4 SBTi badge v1
Owner agent/tool: Codex CLI
Branch: agent/sbti-badge-v1

## Scope
Will change:
- Add SBTi snapshot build + matching (server)
- Add SBTi block in `/api/employer/signals`
- Update employer panel with SBTi badge/details
- Add tests covering SBTi matching and UI states
- Track SBTi CSV snapshot + derived index files
- Update attribution/docs references

Won’t change:
- Companies House/ONS logic beyond shared normalization updates
- Add new dependencies or broad refactors

## Files likely touched
- `server/sbti_snapshot.ts`
- `scripts/build_sbti_snapshot.mjs`
- `server/index.ts`
- `server/companies_house.ts`
- `src/employer/types.ts`
- `src/employer/api.ts`
- `src/ui/employer_signals.ts`
- `src/features/page_score/index.ts`
- `src/features/page_score/page_score.css`
- `tests/unit/sbti_snapshot.test.ts`
- `tests/unit/page_score_ui.test.ts`
- `docs/attribution.md`
- `docs/plans/2026-01-epic3-employer-impact-signals.md`
- `server/data/sbti/sbti_targets_uk_companies20260127.csv`
- `server/data/sbti/sbti_records.json`
- `server/data/sbti/sbti_name_index.json`

## Success criteria
- `/api/employer/signals` returns SBTi block using Companies House title
- Employer panel shows SBTi badge + details for high-confidence matches
- Matching tests cover exact + fuzzy guardrails
- Snapshot CSV + derived indexes are tracked

## Plan (short)
- Create SBTi snapshot build/index
- Implement matching + API response
- Update UI + types
- Add tests + docs + handoff

## Validation (commands)
- `npm test -- tests/unit/sbti_snapshot.test.ts tests/unit/page_score_ui.test.ts`
  - Result: pass (before matched-name display update)

## Risks / edge cases
- Ambiguous company names across regions
- Short/generic names should not fuzzy-match

## Decisions / notes
- Exact matches treated as high confidence; fuzzy matches flagged low confidence.
