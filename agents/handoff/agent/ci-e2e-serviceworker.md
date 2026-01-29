# Handoff: agent/ci-e2e-serviceworker

## Summary
- Run nightly e2e under xvfb and disable headless-only mode to allow extension service worker startup.

## Key files
- `.github/workflows/ci.yml`

## How to verify
- Trigger the scheduled CI workflow (or rerun the nightly job) and confirm e2e tests no longer time out waiting for a service worker.

## Behavior changes
- Nightly e2e now runs in headed mode with a virtual display (xvfb) instead of true headless.

## Risks / edge cases
- Slightly higher resource usage in nightly runs due to xvfb.

## Follow-ups
- None.
