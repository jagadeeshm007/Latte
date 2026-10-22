---
title: Use cases
description: Common integrations: CRM sync, dialler push, warehouse export, chat alerts and QA automation.
section: Get started
order: 3
---

# Use cases

Each pattern below uses only the endpoints and events in the [API reference](api-reference.md).

## Push scores into your CRM

Show each call's score and flags on the customer record.

1. Subscribe an endpoint to `call.scored` ([Webhooks](webhooks.md)).
2. On each event, read the call with `GET /api/calls/{callId}` for the findings and coaching notes.
3. Write `overallScore`, `needsReview` and the breached rubric items to the CRM activity your dialler created for the call. Match them by `originalFilename` or your own id in it.

Scopes: `calls:read`, `webhooks:write`.

## Send calls from a dialler

Score every call without anyone uploading by hand.

- With recordings: after each call, sign, PUT and confirm the stereo file ([Uploads](uploads.md)), with your call id as the `Idempotency-Key`.
- With the dialler's own transcripts: send them in chunks of up to 50 to `POST /api/uploads/transcripts` ([Transcripts](transcripts.md)).
- Group a shift or a day into one batch by passing the first answer's `batchId` to later requests.

Scope: `calls:write`.

## Load results into a warehouse

Keep scores next to sales data for reporting.

- Nightly, walk scored calls with the calls cursor ([Pagination](pagination.md)) from the last run's position, or
- on `batch.completed`, download `GET /api/batches/{id}/results.csv` and load it as one table: one row per call, one column per rubric item ([Batches and exports](batches-and-exports.md)).

Scopes: `calls:read` or `exports:read`.

## Alerts in Slack or Teams

Tell a team lead when their team's flag rate jumps.

1. A manager sets up an alert rule in the app (metric, scope, threshold).
2. Subscribe an endpoint to `alert.triggered` and `digest.ready`.
3. Post `ruleName`, `groupName`, `value` against `baseline`, and a link to the team's page in the app to the channel through its incoming webhook.

Verify the signature first, and answer Latte within 10 seconds before posting.

## Automate QA follow-up

Route flagged calls to the right person without opening the queue.

- On `call.scored` with `needsReview: true`, create a ticket for the agent's coach with the breached items and their quotes.
- On `call.failed`, alert whoever owns the upload with `reason`, then retry with `POST /api/calls/{id}/retry` once fixed.
- Weekly, use `GET /api/dashboard/leaderboard?sort=flagRate` to pick agents for coaching ([Analytics](analytics.md)).
