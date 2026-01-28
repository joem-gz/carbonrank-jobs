# Handoff: agent/widget-jsonld-mock-typing

## Summary
- Fixed the Vitest fetch mock typing in the widget JSON-LD unit test by using a single function-type generic.

## Key files
- tests/unit/widget_jsonld.test.ts

## How to verify
npm test -- tests/unit/widget_jsonld.test.ts
Expected result: tests pass and TypeScript errors are gone.

## Behavior changes
- None; typing-only update.

## Risks / edge cases
- None expected.

## Follow-ups
- Run the test command above when convenient.
