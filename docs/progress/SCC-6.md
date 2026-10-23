# Progress: SCC-6 TruthInDocs

- Task: SCC-6
- Title: TruthInDocs
- Branch: docs/SCC-6-TruthInDocs
- Status: in review
- Owner: Jagadeesh
- Started: 2026-10-23
- Updated: 2026-10-23
- Acceptance criteria: 4

## Next
- Merge SCC-6-1, then the Intent into main
- Then Intent B (durable pipeline: outbox, attempt history, provenance) with its own plan, and the multi-tenancy ADR (Intent G) alongside it

## Done
- SCC-6-1: docs/architecture/production-readiness.md checks the outside review against the code; design docs no longer name pg-boss as the job system; ADR-0004 marked narrowed by ADR-0032; owner questions Q-012 to Q-016

## Blockers
- none

## Decisions
- Multi-tenancy is planned (owner, 2026-10-23; Q-014, Intent G)
- Order: A, then B with G's ADR alongside, then C to F

## Links
- MR: none
- Ticket: none
