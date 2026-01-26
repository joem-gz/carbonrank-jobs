# Task: Epic 3 CP3.1 employer resolve/signals
Owner agent/tool: Codex CLI
Branch: feature/epic3-employer-impact-signals

## Scope
Will change:
- Add Companies House client + resolver ranking utilities.
- Add `/api/employer/resolve` and `/api/employer/signals` (sic codes only) with caching.
- Add unit/integration tests for resolver + HTTP client.
- Update `server/.env.example` and `server/README.md` with new env var + endpoints.

Won’t change:
- ONS intensity mapping, SBTi ingestion, or extension UI (later checkpoints).
- Existing Adzuna proxy behavior.

## Files likely touched
- `server/index.ts`
- `server/companies_house.ts` (new)
- `tests/unit/companies_house.test.ts` (new)
- `server/.env.example`
- `server/README.md`
- `agents/handoff/feature-epic3-employer-impact-signals.md`
- `Makefile`

## Success criteria
- `/api/employer/resolve` returns ranked candidates with confidence + reasons.
- `/api/employer/signals` returns sic codes only.
- Tests cover normalization/ranking + mocked HTTP calls.

## Plan (short)
- Add Companies House client + resolver helpers.
- Wire employer endpoints into the proxy server.
- Add tests and update docs/env template.
- Run lint, unit tests, build; then stop for review.

## Validation (commands)
- `make test`
- `npm run lint`
- `npm run build`

## Validation results
- `make test` (passed)
- `npm run lint` (passed)
- `npm run build` (passed)

## Risks / edge cases
- Repo policy requires stop for human review before any commit.
- Branch naming rule (`agent/...`) conflicts with user-specified branch.
- Companies House API key must remain server-side.

## Decisions / notes
- Following plan checkpoint CP3.1 and stopping for review afterward.
- Added a minimal `Makefile` to support `make test`.
- Conflict: repo policy in `plan.md` requires stopping for human review before any commit at each checkpoint; user requested committing and moving to CP3.2/CP3.3 without review. Options: (1) pause for review then commit, (2) proceed with explicit override of repo policy.
