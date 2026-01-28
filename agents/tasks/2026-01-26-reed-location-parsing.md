# Task: Fix Reed no-data location parsing
Owner agent/tool: Codex CLI
Branch: agent/employer-signals-fix

## Scope
Will change:
- Expand Reed listing location selectors to include metadata location rows.
- Expand Reed drawer modal location selectors for newer markup.
- Add unit coverage for updated selectors.
Won’t change:
- Employer signals API wiring or proxy behavior.
- Badge styling or layout.

## Files likely touched
- src/sites/reed/adapter.ts
- src/sites/reed/job_details_modal.ts
- tests/unit/reed_adapter.test.ts
- tests/unit/reed_modal_extract.test.ts
- tests/fixtures/reed_search_results_metadata_location.html

## Success criteria
- Reed listing badges use location data instead of "Missing location".
- Drawer modal uses location data for score.
- Tests cover the new selectors.

## Plan (short)
- Update Reed location selectors.
- Add fixtures/tests for location parsing.
- Document changes in handoff.

## Validation (commands)
- npm test

## Risks / edge cases
- Reed may ship additional markup variants requiring new selectors.

## Decisions / notes
- Keep selector changes minimal and focused on known markup.
