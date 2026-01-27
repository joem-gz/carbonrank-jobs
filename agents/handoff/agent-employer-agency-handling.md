# Handoff: agent/employer-agency-handling

## Summary
- Detect recruitment-agency disclosures and avoid using advertiser identity for employer signals.
- Add employer candidate extraction from JSON-LD and description text.
- Extend Companies House resolve with agency classification.
- Add UI support for advertiser display and undisclosed employer state.

## Key files
- src/employer/agency.ts
- src/employer/types.ts
- src/employer/api.ts
- src/features/page_score/index.ts
- src/ui/employer_signals.ts
- src/storage/employer_overrides.ts
- server/companies_house.ts
- server/README.md
- tests/unit/employer_agency.test.ts
- tests/unit/page_score_ui.test.ts
- tests/unit/companies_house.test.ts

## How to verify
npm test (passed)

## Behavior changes
- Employer signals skip agency posters unless an employer candidate/override exists.
- Employer panel shows advertiser name and “Employer not disclosed” messaging.

## Risks / edge cases
- Text heuristics may miss employer names in some ads.
- Manual override uses a prompt for employer name when undisclosed.

## Follow-ups
- Replace the prompt flow with a richer inline input if desired.
