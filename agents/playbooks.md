# File: agents/playbooks.md

## What belongs here

Longer guidance, templates, and optional playbooks. Agents should only pull this into context when needed.

---

## Templates

### Task note template (agents/tasks/YYYY-MM-DD-topic.md)

```md
# Task: <title>
Owner agent/tool:
Branch:

## Scope
Will change:
Won’t change:

## Files likely touched
- …

## Success criteria
- …

## Plan (short)
- …

## Validation (commands)
- …

## Risks / edge cases
- …

## Decisions / notes
- …
```

### Handoff template (agents/handoff/<branch>.md)

```md
# Handoff: <branch>

## Summary
- …

## Key files
- …

## How to verify
Commands + expected result

## Behavior changes
- …

## Risks / edge cases
- …

## Follow-ups
- …
```

---

## Playbook: Running parallel agents with worktrees

Typical layout (sibling folders):

* `../repo-main` (primary)
* `../repo-wt-<topic1>`
* `../repo-wt-<topic2>`

Worktree commands:

```bash
# from your main repo
git worktree add ../repo-wt-<topic> -b agent/<topic>

# list worktrees
git worktree list

# remove worktree when done
git worktree remove ../repo-wt-<topic>

git branch -D agent/<topic>   # only after merge / no longer needed
```

Collision avoidance:

* If two tasks must touch the same files, **sequence** them (merge one, rebase the other).

---

## Playbook: Keeping diffs reviewable

* Touch only files needed for the task.
* Avoid formatting unrelated code.
* If you must refactor, do it in a separate branch/PR.
* Prefer “smallest change that works” over “best possible design”.

---

## Playbook: Validation strategy

Order of operations (if available in repo):

1. Format / lint / typecheck
2. Unit tests near the change
3. Integration tests
4. E2E tests (only if user-facing flows affected)

If tests are slow/flaky:

* run the smallest relevant subset
* document exactly what ran
* propose a follow-up to improve test reliability

---

## Playbook: When you need to add a dependency

Before adding:

* Is there an existing dependency that already solves this?
* Is a standard library solution good enough?

If adding:

* justify in the task note
* keep the dependency scoped (avoid “framework creep”)
* update lockfiles consistently

---

## Tool notes (optional)

### Codex

* Prefer repo scripts for commands.
* If sandbox constraints block required steps, document the **minimum** allowances needed in the task note.

### Claude Code

* Same rules: branch isolation, task note, validation, handoff.
* Be cautious of broad edits; keep changes targeted.
