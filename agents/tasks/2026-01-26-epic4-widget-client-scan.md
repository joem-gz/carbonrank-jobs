# Task: Epic 4 CP4.2 + CP4.3 client-side scan
Owner agent/tool: Codex CLI
Branch: feature/epic4-whitelabel-widget

## Scope
Will change:
- Widget to parse JobPosting JSON-LD and render on detail pages
- Remote detection heuristics and location fallback handling
- Job cards scanning with configurable selectors + MutationObserver
- Fixtures and unit/e2e coverage for new widget modes
Won’t change:
- Widget API endpoints or partner auth
- Server-side scoring logic

## Files likely touched
- widget/src/index.ts
- tests/unit/widget_jsonld.test.ts
- tests/unit/widget_cards.test.ts
- tests/fixtures/widget_jobposting_*.html
- tests/fixtures/widget_cards_*.html
- examples/widget-jobcards.html
- tests/e2e/widget_jobcards.spec.ts

## Success criteria
- JSON-LD detail pages render widget + remote handling
- Job card scanning is configurable and idempotent
- Tests cover JSON-LD variants and mutation observer

## Plan (short)
- Extend widget parser for JSON-LD
- Add job card scanner + observer
- Add fixtures/examples/tests
- Document validation + handoff

## Validation (commands)
- `npm test` (pass)
- `npm run build` (pass)
- `npm run test:e2e` (pass; required escalated permissions)

## Risks / edge cases
- Widget placement on detail pages must remain predictable
- Remote detection differs from extension heuristics

## Decisions / notes
- Align remote detection to Epic 4 spec: TELECOMMUTE or applicantLocationRequirements present.
