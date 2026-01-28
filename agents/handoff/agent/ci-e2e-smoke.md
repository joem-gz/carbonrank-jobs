# Handoff: agent/ci-e2e-smoke

## Summary
- CI now installs Chromium once and runs a smoke E2E on PR/push, with nightly headless runs.
- E2E runner respects `PLAYWRIGHT_BROWSERS_PATH` and forwards extra args.
- E2E specs allow headless mode via `PLAYWRIGHT_HEADLESS`.

## Key files
- `.github/workflows/ci.yml`
- `scripts/run_e2e.mjs`
- `tests/e2e/annotates_cards.spec.ts`
- `tests/e2e/page_score_jobposting.spec.ts`
- `tests/e2e/search_page.spec.ts`

## How to verify
Commands + expected result
- `npm run test:e2e -- tests/e2e/annotates_cards.spec.ts` runs the smoke spec.
- `PLAYWRIGHT_HEADLESS=1 npm run test:e2e` runs the full E2E suite headless.

## Behavior changes
- CI schedules nightly headless Chromium E2E runs and limits PR/push to a smoke spec.
- E2E launcher now honors `PLAYWRIGHT_BROWSERS_PATH` and extra CLI args.

## Risks / edge cases
- Headless Chromium must support extension loading for nightly runs.

## Follow-ups
- None.
