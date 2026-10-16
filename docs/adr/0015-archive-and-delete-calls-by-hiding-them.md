# ADR-0015: Archive and delete calls by hiding them

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering, with the product owner (both actions soft)
- Area: data model, api
- Reversibility: cheap: two nullable columns (migration 0005); unhiding a call is one update

## Context

QA reviewers and managers need to tidy the call lists: set aside calls that are done with, and remove calls uploaded by mistake. Calls carry findings, QA decisions and an audit trail that compliance work may need later, and the audio already has a retention purge (90 days).

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Archive and delete both hide the call: `archived_at` and `deleted_at` on `calls` (chosen) | storage and rows are never freed by these actions; the retention purge still removes audio | an audited product where a removed call may need explaining |
| Archive hides, delete removes rows and audio | a mistaken delete cannot be undone, and the audit trail loses its subject | data a customer asks to have erased |
| Archive only | no way to take a wrong upload out of the dashboards | very small teams |

## Decision

Archive sets `calls.archived_at`, and Unarchive clears it; QA reviewers and managers can do both.
- An archived call leaves the call list and the review queue, unless the list is asked for archived calls.
- It still counts in dashboards, scorecards and judge agreement.

Delete sets `calls.deleted_at`; only managers can do it.
- A deleted call leaves every list, the queue, the call page (404) and every statistic.
- Nothing is removed.

Each action writes an audit event (`call_archived`, `call_unarchived` or `call_deleted`), and each checks the call is in the caller's scope.

## Consequences

- **Queries**: every query that reads calls for people filters `deleted_at IS NULL`. A partial index on `(created_at, id) WHERE deleted_at IS NULL` serves the list.
- **No undelete yet**: there is no undelete in the app; a deleted call is restored by clearing `deleted_at` by hand, with an audit note.
- **Real erasure**: a request to truly erase a call (privacy) needs its own flow, which this ADR does not provide.

## Commits us to

calls.archived_at and calls.deleted_at (migration 0005); POST /api/calls/:id/archive, /unarchive, /delete
