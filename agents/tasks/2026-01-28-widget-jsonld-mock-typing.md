# Task: Fix widget JSON-LD fetch mock typing
Owner agent/tool: Codex
Branch: agent/widget-jsonld-mock-typing

## Scope
Will change:
- Update the vitest mock typing in widget JSON-LD unit test to match vi.fn signature.
Won’t change:
- Runtime widget behavior or JSON-LD logic.
- Other tests or fixtures.

## Files likely touched
- tests/unit/widget_jsonld.test.ts
- agents/handoff/agent/widget-jsonld-mock-typing.md

## Success criteria
- TypeScript errors in widget_jsonld.test.ts are resolved.
- Test behavior remains the same.

## Plan (short)
- Update vi.fn generic to a single function-type argument.
- Document changes and validation status.

## Validation (commands)
- (pending) npm test -- tests/unit/widget_jsonld.test.ts

## Risks / edge cases
- None expected; typing-only change.

## Decisions / notes
- Use vi.fn<(input, init?) => Promise<Response>> for compatibility with current Vitest types.
