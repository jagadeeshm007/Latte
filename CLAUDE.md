@AGENTS.md

# CLAUDE.md

Claude Code specifics for this repository; the standard is AGENTS.md above.
Loaded into every session: keep this file under 40 lines.

```
Repository:   SalesCallPlatform (pnpm monorepo: apps/api, apps/web, packages/*, evals)
Stack:        Node 24 + TS 5.9 + Express 5 + Zod 4 + pg + pg-boss + pino; React 19 + Vite + coss ui
Databases:    PostgreSQL (hosted Supabase; local postgres:17 for tests via make db)
Entrypoint:   apps/api/src/server.ts, apps/api/src/worker.ts, apps/web/src/main.tsx
Run, test:    make dev, make test; gate: make check (includes the eval gate)
Git host:     github
Tracker:      SCC-### (BEARING_TRACKER; none is valid)
Trunk:        main (name develop here if this repository keeps one)
```

The Bearing plugin's hooks format and lint each edited file (`make
check-file` when the Makefile has it), add the task id from the branch,
refuse push, amend, rebase, merge, release and deploy commands, send you
back once when files you changed have not passed `make check`, and restore
the branch state and the user's last requests after compaction.
Permissions are in `.claude/settings.json`; `.claude/settings.local.json` may
add to them but must not loosen the deny list.

Intents (epic branch from main) hold Units (start-task branch from the Intent)
made of Bolts (one commit, `[SCC-n-u-b]`); Units merge into Intents, Intents into main.
Plan mode for anything over three files or touching a schema, contract or
auth. On a third failed approach, stop and say so. Bound shell output with
`| tail -40`.

## Things the agent gets wrong in this repository

Add a line each time a mistake repeats; delete lines that stop applying.

- Model calls only through packages/gateway; tests and CI use MODEL_MODE=replay.
- wavefile is CommonJS: load it with createRequire, not a named ESM import.
- coss ui is the component set: group related controls (Group, ToggleGroup, Frame), keep spacing tight.
