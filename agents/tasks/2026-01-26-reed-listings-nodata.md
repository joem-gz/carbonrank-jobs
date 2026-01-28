# Task: Fix Reed listing badge width regression
Owner agent/tool: Codex CLI
Branch: agent/employer-signals-fix

## Scope
Will change:
- Adjust badge styling to avoid full-width stretch in Reed listings.
Won’t change:
- Reed selector logic or location parsing (no-data fix is deferred).
- Employer signals API wiring or proxy behavior.

## Files likely touched
- src/ui/styles.css

## Success criteria
- Reed listing badges no longer stretch full width.

## Plan (short)
- Update badge layout styling.
- Document changes in handoff.

## Validation (commands)
- Visual check on Reed listings

## Risks / edge cases
- Other layouts may still stretch badge if CSS changes are insufficient.

## Decisions / notes
- Defer no-data fix to a separate change.
