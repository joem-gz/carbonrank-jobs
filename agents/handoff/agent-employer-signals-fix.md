# Handoff: agent/employer-signals-fix

## Summary
- Prevent Reed listing badges from stretching full width.
- Expand Reed listing/modal location selectors for metadata rows.
- Add tests covering metadata location parsing.

## Key files
- src/ui/styles.css
- src/sites/reed/adapter.ts
- src/sites/reed/job_details_modal.ts
- tests/fixtures/reed_search_results_metadata_location.html
- tests/unit/reed_adapter.test.ts
- tests/unit/reed_modal_extract.test.ts

## How to verify
Visual check on Reed listings pages
npm test (expect unit tests to pass)

## Behavior changes
- Badge aligns to content width within Reed job cards.
- Reed listings and drawer modals read locations from metadata list items.

## Risks / edge cases
- Flex/grid containers might still override layout in unexpected cases.

## Follow-ups
- Add more selectors if Reed markup shifts again.
