# Contributing

How work moves through this repository. The standards themselves are in
`AGENTS.md`; this page is the procedure.

## First day

1. Clone, then `make setup`. It installs dependencies and points git at the
   committed hooks (`.githooks/`).
2. Install the workflow once per machine: follow `docs/INSTALL.md` in the
   Bearing repository (Claude Code plugin, or `harness-setup` for Cursor,
   Codex, Gemini CLI, Copilot and others). Run `doctor` in this repo
   to confirm.
3. `make help` lists every target. `make dev` runs the app. `make check` is
   the gate CI runs; it prints `check: R gates run, S skipped` and fails
   when anything was skipped.

## A task, start to finish

1. Pick the task. Note its id: a ticket key from the tracker in the
   `CLAUDE.md` snapshot, or a chosen id such as `TASK-142` when there is
   no tracker.
2. `start-task TASK-142 <PascalName>` creates `feature/TASK-142-<PascalName>`
   from the trunk.
3. Vague task or boundary change: write the spec and plan first
   (Superpowers `brainstorming`, `writing-plans`, then `/plan-eng-review`).
4. Build test-first. Commit small, Conventional, with `[TASK-142]` at the
   end of the subject. The commit-msg hook enforces the shape.
5. `definition-of-done` when you think you are done. It walks the definition of done
   and asks for evidence.
6. `branch-review` for a stack-aware review; the harness's security review
   if you touched auth, payments, PII or external input.
7. `merge-request` runs `make check`, audits the commits and fills the merge
   request or pull request template into `.scratch/`. You push and open
   the request yourself; the pre-push hook asks you to type the branch
   name.
8. One peer and one lead approve. Address every thread; resolve none of
   your own.
9. Squash-merge with the Conventional subject. Delete the branch.
   `tracker-sync` moves the ticket, or skips with a note when there is none.

## Branches

Trunk-based by default: `main` is the trunk and what is in production.

- `feature|bugfix|chore|docs/<TASK-ID>-<PascalName>` from `main`, merged
  back to `main`.
- `hotfix/<TASK-ID>-<PascalName>` from `main`.
- `release/vX.Y.Z` only when a release needs stabilising; `release`
  prepares the changelog and the tag command, a person tags.

Teams that keep a `develop` integration branch say so in the `CLAUDE.md`
snapshot (`Trunk:` line); task branches then start from `develop`, only
`release/*` and `hotfix/*` merge to `main`, and hotfixes merge to both.

## Reviews

A review is findings, ranked, with file and line, each with the concrete
way it fails. Style is the formatter's job, not the reviewer's. Approve
only what you would answer for in an incident.

## Documentation

- A decision future readers will ask "why" about: `adr`.
- A new alert: `runbook` before the alert is enabled.
- An incident: `postmortem` within five working days.
- A new product event: `analytics-events` before the code emits it.

## Sessions with the agent

One task per session. `session-handoff` before you stop mid-task; the next
session starts with that state. Never let the agent push, merge or deploy;
the hooks stop it, and so should you.
