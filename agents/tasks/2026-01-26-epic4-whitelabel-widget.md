# Task: Epic 4 CP4.1 widget skeleton
Owner agent/tool: Codex CLI
Branch: feature/epic4-whitelabel-widget

## Scope
Will change:
- Widget package scaffold, styles, and renderer
- Build script for widget assets
- Example page for server-rendered mode
- Unit + Playwright tests for widget rendering
- Config updates for widget sources
Won’t change:
- Widget API endpoints
- Client-side JSON-LD/job card scanning
- Partner key auth or caching

## Files likely touched
- widget/src/index.ts
- widget/src/styles.css
- scripts/build_widget.mjs
- package.json
- tsconfig.json
- examples/widget-jobposting-jsonld.html
- tests/unit/widget_render.test.ts
- tests/e2e/widget_ssr.spec.ts

## Success criteria
- Widget renders from `data-carbonrank` attribute only
- Modal shell + attribution footer present
- Unit and Playwright checks cover render states

## Plan (short)
- Scaffold widget package
- Implement renderer + modal
- Add example page + tests
- Record validation + handoff

## Validation (commands)
- `npm test` (pass)
- `npm run build` (pass)
- `npm run test:e2e` (pass; required escalated permissions)

## Risks / edge cases
- `make test` target not found; using repo npm scripts instead
- Example page expects built widget assets in `dist/`

## Decisions / notes
- Implementing CP4.1 only; stop for review before CP4.2
