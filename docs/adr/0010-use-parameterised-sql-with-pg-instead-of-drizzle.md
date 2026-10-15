# ADR-0010: Use parameterised SQL with pg instead of Drizzle

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering
- Area: orm
- Reversibility: cheap: repositories in apps/api/src/repo are the only SQL; swapping the query layer touches those files

## Context

The node-api template ships Drizzle ORM with drizzle-kit migrations. The schema here is designed and generated from one definition (docs/design/tools/gen_model.py) as plain SQL with named CHECK constraints, partial indexes and RLS, applied as migration 0001. Most reads are reporting queries with LATERAL joins and FILTER aggregates (repo/analytics.ts, repo/calls.ts).

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| pg with parameterised SQL in repository modules, SQL migrations applied in order (chosen) | no generated row types; each repository declares its row interface | a schema designed in SQL with reporting-heavy queries |
| Drizzle ORM and drizzle-kit | a second schema definition to keep in step with schema.sql; the reporting queries would be sql template strings anyway | CRUD-heavy services whose schema starts in TypeScript |

## Decision

We will keep SQL in apps/api/src/repo, always parameterised, with pg types parsed once in db/pool.ts (int8 and numeric as numbers, dates as strings), and apply src/db/migrations/*.sql in name order through db/migrate.ts.

## Consequences

Row types are hand-written next to each query; integration tests against postgres:17 catch drift. Revisit if the number of tables doubles or CRUD screens dominate.

## Commits us to

pg 8, postgres:17 for tests
