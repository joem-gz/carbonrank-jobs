# Handoff: agent/fix-local-network-permission

## Summary
- Route employer API fetches through the extension service worker to avoid site-level local network prompts.
- Add runtime fetch message types and handler.
- Add unit tests covering runtime vs fallback fetch routing.

## Key files
- src/employer/api.ts
- src/messages.ts
- src/service_worker.ts
- tests/unit/employer_api.test.ts

## How to verify
- npm test -- tests/unit/employer_api.test.ts

## Validation
- User ran full test suite and smoke test (all green).

## Behavior changes
- Employer signal requests now go through the service worker when available.

## Risks / edge cases
- If the service worker fails to respond, employer API calls will error.

## Follow-ups
- Manual smoke test on Reed/Totaljobs to confirm no local-network prompt.
