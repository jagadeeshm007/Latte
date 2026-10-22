---
title: Batches and exports
description: Follow a batch, retry its failures and export results as CSV or ZIP.
section: Guides
order: 22
---

# Batches and exports

Every upload lands in a batch. A batch reports its progress and is where results are exported.

## Following a batch

`GET /api/batches/{id}` answers the counts and state:

| Field | Meaning |
| --- | --- |
| `total` | calls in the batch |
| `queued`, `processing` | not finished yet |
| `scored`, `failed` | finished |
| `flagged` | scored calls that need QA |
| `avgScore` | average score of the scored calls, or null |
| `state` | `processing`, `completed` or `has_failures` |

A batch is finished when `queued` and `processing` are both 0. Rather than polling, subscribe to `batch.completed` ([Webhooks](webhooks.md)). The SDK's `latte.batches.wait(id)` polls for you.

`GET /api/batches` lists batches, with `q`, `state` and `archived` filters. `PATCH /api/batches/{id}` renames or archives one.

## Retrying failures

`POST /api/batches/{id}/retry-failed` queues every failed call again and answers `202`. Fix the cause first: each failed call's `error` says what went wrong.

## Results CSV

`GET /api/batches/{id}/results.csv` (scope `exports:read`, `bulk` bucket) has one row per call. Columns: `call_id`, `file`, `call_date`, `agent`, `team`, `product`, `language`, `status`, `duration_seconds`, `score`, `flagged`, `review`, `breaches`, one column per rubric item (by its key), then `error`. It suits spreadsheets and warehouse loads.

```bash
curl -H "Authorization: Bearer $LATTE_API_KEY" -o results.csv "$LATTE_URL/api/batches/$BATCH_ID/results.csv"
```

## Export ZIP

`GET /api/batches/{id}/export.zip?include=transcripts,audio` adds each call's transcript and, with `audio`, its recording. ZIPs are for batches of up to 200 calls; larger batches export as CSV.

```ts
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";

const zip = await latte.batches.exportZip(batchId, ["transcripts"]);
Readable.fromWeb(zip).pipe(createWriteStream("batch.zip"));
```

Exports mask personal data the same way as the API.
