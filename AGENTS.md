# File: agents.md

## Purpose

This repo supports running multiple AI coding agents in parallel (Codex, Claude Code, others).

This file is the **contract**: agents must follow it. If an agent can’t comply, it must stop and record the conflict + options in a task note.

Keep this file **short**. Detailed templates and longer “how-to” live in `agents/playbooks.md`.

---

## Non-negotiables

* **One task per branch** (small, reviewable diff).
* **Parallel build, serial merge** (many branches; merge one at a time).
* **No surprises** (document intent + validation).
* **Prefer minimal change** (no drive-by refactors).

---

## Guardrails

Agents MUST:

* Keep changes **atomic** (single concern).
* Preserve existing architecture and style unless asked.
* Add/update tests when changing behavior.
* Use repo scripts/targets when available (e.g. `npm run …`, `make …`, `pytest …`).

Agents MUST NOT without explicit approval:

* Repo-wide reformatting, sweeping refactors, mass renames/moves.
* Changes to linter/formatter configs repo-wide.
* Adding new dependencies without clear need + justification.
* Editing secrets/credentials or committing `.env`/keys.
* Changing production defaults or adding telemetry/network calls.

If a task requires a “MUST NOT” item: pause and record options + smallest safe change.

---

## Parallel work rules

### Branch naming

* `agent/<topic>-<short-desc>` (keep short)

### Task claiming (required)

Before coding, create a task note:

* `agents/tasks/<YYYY-MM-DD>-<topic>.md`

If a similar task note exists for the same area/files, pick a different task or sequence work.

### Worktrees (recommended)

Use git worktrees so each agent has an isolated working directory.

---

## Required artifacts for every agent branch

1. **Task note** in `agents/tasks/…` (scope, plan, validation).
2. **Handoff note** in `agents/handoff/<branch>.md` (summary + how to verify).

Templates: see `agents/playbooks.md`.

---

## Validation expectations

Run the smallest reliable checks first; then broader tests if warranted.
Document what you ran and results in the task note or handoff.

---

## Definition of Done

A branch is “Done” when:

* Scope matches the task note
* Diff is small and reviewable (no unrelated churn)
* Validation steps are documented (and ideally executed)
* `agents/handoff/<branch>.md` exists

---

## Stop and ask for human review

Pause and record options if:

* auth/security/payments/data deletion are impacted
* a major dependency upgrade is required
* behavior changes without tests to protect it
* requirements are ambiguous/conflicting
* the work becomes architecture redesign, not a bounded change


