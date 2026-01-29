# Task: CI e2e serviceworker timeouts
Owner agent/tool: Codex
Branch: agent/ci-e2e-serviceworker

## Scope
Will change:
- `.github/workflows/ci.yml` to ensure nightly e2e runs with an extension-capable browser mode.
Won’t change:
- Test code or application logic.

## Files likely touched
- `.github/workflows/ci.yml`

## Success criteria
- Nightly scheduled e2e runs no longer time out waiting for the extension service worker.

## Plan (short)
- Switch nightly e2e job to run under xvfb and avoid headless-only mode.

## Validation (commands)
- Not run locally (CI-only change).

## Risks / edge cases
- Nightly job runs in headed mode under xvfb (still headless CI but with display server).

## Decisions / notes
- Preserve smoke test behavior; align nightly run with the passing xvfb setup.
