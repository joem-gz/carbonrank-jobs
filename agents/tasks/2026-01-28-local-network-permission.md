# Task: Avoid local-network prompt for employer signals
Owner agent/tool: Codex CLI
Branch: agent/fix-local-network-permission

## Scope
Will change:
- Route employer API fetches through the extension service worker.
- Add runtime message types + unit coverage for the new fetch path.
Won't change:
- Employer API endpoints or response schemas.
- Search proxy behavior or base URLs.

## Files likely touched
- src/employer/api.ts
- src/messages.ts
- src/service_worker.ts
- tests/unit/employer_api.test.ts

## Success criteria
- Employer signals load without prompting sites for local network access.
- Employer API fetches still resolve via the service worker.

## Plan (short)
- Add runtime fetch message handling.
- Use runtime fetch in employer API.
- Add unit coverage for fetch routing.
- Document handoff + validation.

## Validation (commands)
- npm test -- tests/unit/employer_api.test.ts

## Validation results
- User ran full test suite and smoke test (all green).

## Risks / edge cases
- Service worker not responding would now fail employer API calls.

## Decisions / notes
- Keep proxy base URL unchanged; just move fetch into background context.
