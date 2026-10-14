@AGENTS.md

# CLAUDE.md

Claude Code specifics for this repository; the standard is AGENTS.md above.
Loaded into every session: keep this file under 40 lines.

```
Repository:   SalesCallPlatform (Server/API)
Stack:        Node 24 + TypeScript 5.9 + Fastify 5 + Zod 4 + Drizzle ORM + pino + Prometheus + OpenTelemetry + pnpm
Databases:    PostgreSQL
Entrypoint:   src/server.ts
Run, test:    make dev, make test; gate: make check
Git host:     gitlab | github | both (BEARING_GIT_HOST)
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

Plan mode for anything over three files or touching a schema, contract or
auth. On a third failed approach, stop and say so. Bound shell output with
`| tail -40`.

## Things the agent gets wrong in this repository

Add a line each time a mistake repeats; delete lines that stop applying.
