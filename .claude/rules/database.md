---
paths:
  - "**/migrations/**"
  - "**/migration/**"
  - "**/*.sql"
  - "**/repository/**"
  - "**/repositories/**"
  - "**/db/**"
  - "**/alembic/**"
  - "**/prisma/**"
---

# Database rules (loaded when migrations, SQL or repositories are touched)

- Every schema change is a migration with a Down that is run in a test
  (`db-migration` scaffolds it). Long-running migrations run in batches
  and never hold an exclusive lock on a hot table.
- Postgres: no `SELECT *` in repository code; list the columns. Every new
  `WHERE` or `ORDER BY` shape records an index decision in the migration
  file's header comment. Add columns as nullable or with a default; backfill
  in batches; add `NOT NULL` in a later migration. `CREATE INDEX
  CONCURRENTLY` outside a transaction on any table over a million rows. No
  column type change in place on a hot table.
- ClickHouse: design `ORDER BY` for the read queries, not the inserts;
  partition by time; no `FINAL` on hot paths; deduplication is explicit
  (ReplacingMergeTree with a version column, or a dedup step) and
  documented in the migration.
- MongoDB: a JSON schema validator on every collection; an index for every
  query shape; arrays inside documents have a documented bound.
- Repositories own SQL and driver calls. Services receive domain types and
  never see a row, a cursor, a connection or a driver.
- Transactions are opened and closed in the service layer around the whole
  unit of work, passed to repositories, never opened inside a repository.
- Parameterised queries only. A string-built query is a finding.
- Timestamps are `timestamptz` (Postgres) or UTC epoch; ids are `uuid` or
  `bigint identity`, never application-generated integers.
