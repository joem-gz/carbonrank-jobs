# plan.md — CarbonRank (Next Build) — Epics 3–4

Current Epics:

docs/plans/2026-01-epic4-whitelabel-widget.md
docs/plans/2026-01-epic3-employer-impact-signals.md


Previous Plans:
MVP: docs/plans/2026-01-mvp.md
Epics 1-2: docs/plans/2026-01-epics-1-2.md


Assumptions:
- Existing repo contains working MVP extension (MV3, TS, esbuild, Vitest, Playwright) with Reed card badges and place-name centroid scoring.
- Service worker lifecycle is short (Chrome may terminate after ~30s idle) so avoid heavy runtime initialisation. https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- No remotely hosted code in MV3; all runtime code must be bundled. https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- Playwright extension tests require Chromium persistent context. https://playwright.dev/docs/chrome-extensions

Repo policy (for all agents):
- Work on feature branches only.
- At each checkpoint: run lint + unit tests + build (+ e2e if touched), then STOP for human review before any commit.
- Never add secrets to the repo. Add `.env.example` only.

