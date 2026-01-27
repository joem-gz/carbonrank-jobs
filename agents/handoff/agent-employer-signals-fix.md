# Handoff: agent/employer-signals-fix

## Summary
- Prevent Reed listing badges from stretching full width.

## Key files
- src/ui/styles.css

## How to verify
Visual check on Reed listings pages

## Behavior changes
- Badge aligns to content width within Reed job cards.

## Risks / edge cases
- Flex/grid containers might still override layout in unexpected cases.

## Follow-ups
- Address Reed no-data location parsing separately.
