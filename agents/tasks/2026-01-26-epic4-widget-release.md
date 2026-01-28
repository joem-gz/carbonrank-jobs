# Task: Epic 4 CP4.5 release packaging
Owner agent/tool: Codex CLI
Branch: agent/epic4-widget-release

## Scope
Will change:
- Widget build outputs to include versioned assets
- Partner docs, changelog, and demo deployment guidance
- Example pages to reference versioned assets
Won’t change:
- Widget API logic or auth behavior
- Core scoring calculations

## Files likely touched
- scripts/build_widget.mjs
- tests/e2e/widget_build.ts
- examples/widget-ssr.html
- examples/widget-jobposting-jsonld.html
- examples/widget-jobcards.html
- server/README.md
- docs/widget/partner-guide.md
- CHANGELOG.md

## Success criteria
- Build produces versioned widget assets
- Partner guide + demo deployment plan documented
- Examples align with versioned assets

## Plan (short)
- Add versioned build outputs
- Update docs and changelog
- Align examples and tests
- Validate and handoff

## Validation (commands)
- `npm test` (pass)
- `npm run build` (pass)
- `npm run test:e2e` (pass; required escalated permissions)

## Risks / edge cases
- Versioned assets must stay in sync with unversioned files
- Demo deployment steps are documentation only
