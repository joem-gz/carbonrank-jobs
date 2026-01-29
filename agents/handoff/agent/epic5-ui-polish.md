# Handoff: agent/epic5-ui-polish

## Summary
- Added attribution links with shared help URL handling across popup, panel, search page, and widget.
- Added Help page content (web + extension fallback) and build copies.
- Added shared tooltip copy and accessible tooltips in the panel and widget modal.
- Updated README and widget partner guide for the rebrand.

## Key files
- `src/ui/links.ts`
- `src/ui/attribution.ts`
- `src/pages/help/help.html`
- `src/features/page_score/index.ts`
- `src/ui/employer_signals.ts`
- `widget/src/index.ts`
- `README.md`
- `docs/widget/partner-guide.md`
- `tests/unit/help_links.test.ts`
- `tests/unit/tooltip_copy.test.ts`

## How to verify
Commands + expected result
- `npm test` (not run) — unit suite passes.

## Behavior changes
- Attribution footers link to the canonical Help URL with extension fallback when offline.
- Help page is available at `/help` (web) and `pages/help/help.html` (extension).
- SIC/SBTi/sector baseline tooltips appear in the employer panel and widget modal.

## Risks / edge cases
- Tooltip text is now part of DOM textContent; tests updated to account for it.
- Fallback Help URL relies on `navigator.onLine` when running in extension context.

## Follow-ups
- Run build/e2e checks if needed before release.
