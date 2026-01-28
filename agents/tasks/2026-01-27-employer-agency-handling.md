# Task: Handle recruiter/agency posted ads
Owner agent/tool: Codex CLI
Branch: agent/employer-agency-handling

## Scope
Will change:
- Detect agency disclosures and recruiter SIC classifications.
- Avoid using agency poster for employer signals.
- Add employer candidate extraction + override support.
- Update UI to show advertiser vs employer states.
- Add tests for detection, classification, and UI states.
Won’t change:
- Commute/location scoring behavior.
- Adzuna proxy search flow.

## Files likely touched
- src/employer/agency.ts
- src/employer/types.ts
- src/employer/api.ts
- src/features/page_score/index.ts
- src/ui/employer_signals.ts
- src/storage/employer_overrides.ts
- server/companies_house.ts
- server/index.ts
- tests/unit/*
- tests/fixtures/*

## Success criteria
- Agency posters are detected and do not drive employer signals.
- Employer not disclosed state renders with advertiser name.
- Overrides allow setting the hiring employer.
- Tests cover agency detection, classification, and UI states.

## Plan (short)
- Add agency detection + candidate extraction.
- Extend server resolve classification.
- Update UI/override flow.
- Add tests and document handoff.

## Validation (commands)
- npm test

## Validation results
- npm test (passed)

## Risks / edge cases
- Heuristics may miss recruiter language variants.
- Recruiter SICs missing in search results.

## Decisions / notes
- Keep heuristics deterministic and explainable.
