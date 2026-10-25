# Progress: SCC-6 TruthInDocs

- Task: SCC-6
- Title: TruthInDocs
- Branch: docs/SCC-6-TruthInDocs
- Status: merged
- Owner: Jagadeesh
- Started: 2026-10-23
- Updated: 2026-10-25
- Acceptance criteria: 4

## Next
- Intent B (durable pipeline: outbox, attempt history, provenance) with its own plan, and the multi-tenancy ADR (Intent G) alongside it

## Done
- SCC-6-1: docs/architecture/production-readiness.md checks the outside review against the code; design docs no longer name pg-boss as the job system; ADR-0004 marked narrowed by ADR-0032; owner questions Q-012 to Q-016, now decided; the settings table with defaults

## Blockers
- none

## Decisions
- Multi-tenancy is planned (owner, 2026-10-23; Q-014, Intent G)
- Order: A, then B with G's ADR alongside, then C to F; H (account access: set password after invite, forgot password, Google sign-in on by default) can go at any time
- Every limit, period and switch is a setting with a standard SaaS default, overridable per organisation (Q-001, Q-003, Q-004, Q-009, Q-013)
- Provider limits follow the account through rate-limit headers (Q-012); no legal review for the demo (Q-015); audience is sales-led companies and telecom (Q-016)

## Links
- MR: https://github.com/jagadeeshm007/Latte/pull/26 (SCC-6-1, merged), https://github.com/jagadeeshm007/Latte/pull/28 (Intent, merged)
- Ticket: none
