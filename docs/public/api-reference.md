---
title: API reference
description: Every endpoint an API key can call, every schema and every webhook event, generated from the OpenAPI document.
section: Reference
order: 90
---

# API reference

Version 0.2.0. Generated from [openapi.json](/openapi.json); do not edit by hand.

Every request needs `Authorization: Bearer latte_...`. Errors answer the [Error](#error) shape; see [Errors](errors.md).

## Account

Who the key acts as, and the agents, teams and products to upload against.

### getMe

`GET /api/me`

The manager the key acts as.

Response 200: [Me](#me).

### getReference

`GET /api/reference`

Agents, teams and products to upload against.

Needs the `calls:read` scope.

Response 200: [Reference](#reference).

## Calls

Calls with their transcript, score and findings.

### listCalls

`GET /api/calls`

List calls.

Filter by status, flag, agent, team, product, language, batch or text. Paged with `limit` and `page`, or `cursor`. Needs the `calls:read` scope.

| Parameter     | In    | Type                                                                                                                                                    | Required | Notes                                 |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| `status`      | query | `"uploaded"` or `"transcribing"` or `"transcribed"` or `"scoring"` or `"scored"` or `"failed"`                                                          | no       |                                       |
| `needsReview` | query | `"true"` or `"false"`                                                                                                                                   | no       |                                       |
| `agentId`     | query | string (uuid)                                                                                                                                           | no       |                                       |
| `teamId`      | query | string (uuid)                                                                                                                                           | no       |                                       |
| `productId`   | query | string (uuid)                                                                                                                                           | no       |                                       |
| `language`    | query | `"en-IN"` or `"hi-IN"` or `"bn-IN"` or `"ta-IN"` or `"te-IN"` or `"kn-IN"` or `"ml-IN"` or `"mr-IN"` or `"gu-IN"` or `"od-IN"` or `"pa-IN"` or `"auto"` | no       |                                       |
| `flag`        | query | `"flagged"` or `"passed"` or `"pending"`                                                                                                                | no       |                                       |
| `q`           | query | string                                                                                                                                                  | no       | up to 100 characters                  |
| `batchId`     | query | string (uuid)                                                                                                                                           | no       |                                       |
| `archived`    | query | `"true"` or `"false"`                                                                                                                                   | no       |                                       |
| `groupBy`     | query | `"agent"` or `"team"` or `"product"` or `"language"` or `"status"` or `"flag"`                                                                          | no       |                                       |
| `limit`       | query | integer                                                                                                                                                 | no       | default `50`; at least 1; at most 100 |
| `page`        | query | integer                                                                                                                                                 | no       | at least 1; at most 10000             |
| `cursor`      | query | string                                                                                                                                                  | no       |                                       |

Response 200: [CallList](#calllist).

### getCall

`GET /api/calls/{id}`

One call with its transcript and findings.

Personal data in the transcript and quotes is masked for API keys. Needs the `calls:read` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 200: [CallDetail](#calldetail).

### getAudioUrl

`POST /api/calls/{id}/audio-url`

A short-lived link to the recording.

Needs the `calls:read` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Request body: [AudioUrlRequest](#audiourlrequest).

Response 200: [AudioUrl](#audiourl).

### retryCall

`POST /api/calls/{id}/retry`

Queue a failed or stuck call again.

Needs the `calls:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 202: [CallRetryResponse](#callretryresponse).

### archiveCall

`POST /api/calls/{id}/archive`

Hide a call from lists.

Needs the `calls:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 204: no body.

### unarchiveCall

`POST /api/calls/{id}/unarchive`

Bring an archived call back.

Needs the `calls:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 204: no body.

## Uploads

Add calls: sign upload URLs for recordings and confirm them, or send transcripts with no audio.

### signUploads

`POST /api/uploads/sign`

Signed upload URLs for up to 50 recordings.

PUT each file to its `signedUrl`, then call confirmUploads with the returned paths. Needs the `calls:write` scope.

Request body: [UploadSignRequest](#uploadsignrequest).

Response 200: [UploadSignResponse](#uploadsignresponse).

### confirmUploads

`POST /api/uploads/confirm`

Create calls from uploaded recordings, into a new or existing batch.

Accepts an `Idempotency-Key` header. Needs the `calls:write` scope.

Request body: [UploadConfirmRequest](#uploadconfirmrequest).

Response 201: [UploadResult](#uploadresult).

### uploadTranscripts

`POST /api/uploads/transcripts`

Create calls from transcripts, with no audio, into a new or existing batch.

Give times on every line or on none; without times, findings point to line numbers. Accepts an `Idempotency-Key` header. Needs the `calls:write` scope.

Request body: [TranscriptUploadRequest](#transcriptuploadrequest).

Response 201: [UploadResult](#uploadresult).

## Batches

Calls uploaded together, with their progress and results.

### listBatches

`GET /api/batches`

List batches.

Needs the `batches:read` scope.

| Parameter  | In    | Type                                                | Required | Notes                                  |
| ---------- | ----- | --------------------------------------------------- | -------- | -------------------------------------- |
| `q`        | query | string                                              | no       | up to 100 characters                   |
| `state`    | query | `"processing"` or `"completed"` or `"has_failures"` | no       |                                        |
| `archived` | query | `"true"` or `"false"`                               | no       |                                        |
| `page`     | query | integer                                             | no       | default `1`; at least 1; at most 10000 |
| `limit`    | query | integer                                             | no       | default `20`; at least 1; at most 100  |

Response 200: [BatchList](#batchlist).

### getBatch

`GET /api/batches/{id}`

One batch with its progress and results.

Needs the `batches:read` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 200: [BatchDetail](#batchdetail).

### updateBatch

`PATCH /api/batches/{id}`

Rename or archive a batch.

Needs the `batches:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Request body: [BatchUpdateRequest](#batchupdaterequest).

Response 200: [BatchDetail](#batchdetail).

### retryFailedCalls

`POST /api/batches/{id}/retry-failed`

Queue every failed call in the batch again.

Accepts an `Idempotency-Key` header. Needs the `batches:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 202: [BatchRetryResponse](#batchretryresponse).

## Exports

Batch results as CSV, and transcripts and recordings as a ZIP.

### getBatchResultsCsv

`GET /api/batches/{id}/results.csv`

Results, one row per call and one column per rubric item.

Needs the `exports:read` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 200: a file (`text/csv`).

### exportBatchZip

`GET /api/batches/{id}/export.zip`

Results, transcripts and recordings as a ZIP (up to 200 calls).

Needs the `exports:read` scope.

| Parameter | In    | Type          | Required | Notes |
| --------- | ----- | ------------- | -------- | ----- |
| `id`      | path  | string (uuid) | yes      |       |
| `include` | query | string        | no       |       |

Response 200: a file (`application/zip`).

## Analytics

Scores and flags grouped by team, product, agent or language.

### getDashboard

`GET /api/dashboard`

Results grouped by team, product, agent or language.

Needs the `analytics:read` scope.

| Parameter | In    | Type                                                 | Required | Notes            |
| --------- | ----- | ---------------------------------------------------- | -------- | ---------------- |
| `groupBy` | query | `"team"` or `"product"` or `"agent"` or `"language"` | no       | default `"team"` |
| `from`    | query | string                                               | no       |                  |
| `to`      | query | string                                               | no       |                  |

Response 200: [Dashboard](#dashboard).

### getHighlights

`GET /api/dashboard/highlights`

The period's headline numbers and highlights.

Needs the `analytics:read` scope.

| Parameter | In    | Type   | Required | Notes |
| --------- | ----- | ------ | -------- | ----- |
| `from`    | query | string | no       |       |
| `to`      | query | string | no       |       |

Response 200: [Highlights](#highlights).

### getLeaderboard

`GET /api/dashboard/leaderboard`

A sorted, paged ranking of any grouping.

Needs the `analytics:read` scope.

| Parameter  | In    | Type                                                                  | Required | Notes                                  |
| ---------- | ----- | --------------------------------------------------------------------- | -------- | -------------------------------------- |
| `groupBy`  | query | `"team"` or `"product"` or `"agent"` or `"language"`                  | no       | default `"agent"`                      |
| `q`        | query | string                                                                | no       | up to 100 characters                   |
| `sort`     | query | `"name"` or `"calls"` or `"avgScore"` or `"flagRate"` or `"breaches"` | no       | default `"avgScore"`                   |
| `dir`      | query | `"asc"` or `"desc"`                                                   | no       | default `"desc"`                       |
| `page`     | query | integer                                                               | no       | default `1`; at least 1; at most 10000 |
| `limit`    | query | integer                                                               | no       | default `25`; at least 1; at most 100  |
| `minCalls` | query | integer                                                               | no       | default `1`; at least 0; at most 10000 |
| `from`     | query | string                                                                | no       |                                        |
| `to`       | query | string                                                                | no       |                                        |

Response 200: [Leaderboard](#leaderboard).

## Webhooks

Endpoints that receive signed events. The events themselves are described under `webhooks`.

### listWebhooks

`GET /api/webhooks`

List webhook endpoints.

Needs the `webhooks:write` scope.

Response 200: [WebhookEndpointList](#webhookendpointlist).

### createWebhook

`POST /api/webhooks`

Register an https endpoint; the signing secret is returned once.

Accepts an `Idempotency-Key` header. Needs the `webhooks:write` scope.

Request body: [CreateWebhookRequest](#createwebhookrequest).

Response 201: [CreatedWebhook](#createdwebhook).

### getWebhook

`GET /api/webhooks/{id}`

One webhook endpoint.

Needs the `webhooks:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 200: [WebhookEndpoint](#webhookendpoint).

### updateWebhook

`PATCH /api/webhooks/{id}`

Change the URL, events or description, or turn it off and on.

Needs the `webhooks:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Request body: [UpdateWebhookRequest](#updatewebhookrequest).

Response 200: [WebhookEndpoint](#webhookendpoint).

### deleteWebhook

`DELETE /api/webhooks/{id}`

Delete an endpoint and its deliveries.

Needs the `webhooks:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 204: no body.

### testWebhook

`POST /api/webhooks/{id}/test`

Send a ping event to this endpoint.

Needs the `webhooks:write` scope.

| Parameter | In   | Type          | Required | Notes |
| --------- | ---- | ------------- | -------- | ----- |
| `id`      | path | string (uuid) | yes      |       |

Response 202: [Queued](#queued).

### listWebhookDeliveries

`GET /api/webhooks/{id}/deliveries`

Deliveries to this endpoint, newest first.

Needs the `webhooks:write` scope.

| Parameter | In    | Type                                       | Required | Notes                                  |
| --------- | ----- | ------------------------------------------ | -------- | -------------------------------------- |
| `id`      | path  | string (uuid)                              | yes      |                                        |
| `status`  | query | `"pending"` or `"succeeded"` or `"failed"` | no       |                                        |
| `page`    | query | integer                                    | no       | default `1`; at least 1; at most 10000 |
| `limit`   | query | integer                                    | no       | default `25`; at least 1; at most 100  |

Response 200: [WebhookDeliveryList](#webhookdeliverylist).

### redeliverWebhookDelivery

`POST /api/webhooks/{id}/deliveries/{deliveryId}/redeliver`

Send a delivery again now.

Needs the `webhooks:write` scope.

| Parameter    | In   | Type          | Required | Notes |
| ------------ | ---- | ------------- | -------- | ----- |
| `id`         | path | string (uuid) | yes      |       |
| `deliveryId` | path | string (uuid) | yes      |       |

Response 202: [Queued](#queued).

## Webhook events

Each delivery is a POST of the event's envelope. See [Webhooks](webhooks.md) for signatures and retries.

### call.scored

A call has its score and findings.

Body: [CallScoredEvent](#callscoredevent).

### call.failed

A call could not be processed; retry it once the reason is fixed.

Body: [CallFailedEvent](#callfailedevent).

### batch.completed

Every call in a batch is scored or failed.

Body: [BatchCompletedEvent](#batchcompletedevent).

### alert.triggered

An alert rule fired for a team, product or agent.

Body: [AlertTriggeredEvent](#alerttriggeredevent).

### digest.ready

A daily or weekly digest was built.

Body: [DigestReadyEvent](#digestreadyevent).

### ping

A test event, sent from the endpoint page or the API.

Body: [PingEvent](#pingevent).

## Schemas

### AlertTriggeredData

An alert rule fired for a team, product or agent.

| Field       | Type                                                 | Required | Notes                                       |
| ----------- | ---------------------------------------------------- | -------- | ------------------------------------------- |
| `ruleId`    | string                                               | yes      |                                             |
| `ruleName`  | string                                               | yes      |                                             |
| `metric`    | `"flag_rate"` or `"avg_score"` or `"item_fail_rate"` | yes      |                                             |
| `scope`     | `"team"` or `"product"` or `"agent"`                 | yes      |                                             |
| `itemKey`   | string or null                                       | yes      | the rubric item, for an item fail-rate rule |
| `groupId`   | string                                               | yes      |                                             |
| `groupName` | string                                               | yes      |                                             |
| `value`     | number                                               | yes      | the metric over the recent window           |
| `baseline`  | number                                               | yes      | the metric over the baseline window         |
| `calls`     | integer                                              | yes      |                                             |

### AlertTriggeredEvent

| Field       | Type                                      | Required | Notes                                      |
| ----------- | ----------------------------------------- | -------- | ------------------------------------------ |
| `id`        | string                                    | yes      | the event id; the same on every redelivery |
| `type`      | `"alert.triggered"`                       | yes      |                                            |
| `createdAt` | string                                    | yes      | ISO 8601                                   |
| `data`      | [AlertTriggeredData](#alerttriggereddata) | yes      |                                            |

### AudioUrl

| Field              | Type   | Required | Notes |
| ------------------ | ------ | -------- | ----- |
| `url`              | string | yes      |       |
| `expiresInSeconds` | number | yes      |       |

### AudioUrlRequest

| Field      | Type    | Required | Notes |
| ---------- | ------- | -------- | ----- |
| `download` | boolean | no       |       |

### BatchCompletedData

Every call in a batch is scored or failed.

| Field     | Type    | Required | Notes |
| --------- | ------- | -------- | ----- |
| `batchId` | string  | yes      |       |
| `name`    | string  | yes      |       |
| `total`   | integer | yes      |       |
| `scored`  | integer | yes      |       |
| `failed`  | integer | yes      |       |

### BatchCompletedEvent

| Field       | Type                                      | Required | Notes                                      |
| ----------- | ----------------------------------------- | -------- | ------------------------------------------ |
| `id`        | string                                    | yes      | the event id; the same on every redelivery |
| `type`      | `"batch.completed"`                       | yes      |                                            |
| `createdAt` | string                                    | yes      | ISO 8601                                   |
| `data`      | [BatchCompletedData](#batchcompleteddata) | yes      |                                            |

### BatchDetail

| Field            | Type                                                | Required | Notes |
| ---------------- | --------------------------------------------------- | -------- | ----- |
| `id`             | string                                              | yes      |       |
| `name`           | string                                              | yes      |       |
| `source`         | `"web"` or `"api"`                                  | yes      |       |
| `createdBy`      | string                                              | yes      |       |
| `createdByName`  | string                                              | yes      |       |
| `createdAt`      | string                                              | yes      |       |
| `archivedAt`     | string or null                                      | yes      |       |
| `total`          | number                                              | yes      |       |
| `queued`         | number                                              | yes      |       |
| `processing`     | number                                              | yes      |       |
| `scored`         | number                                              | yes      |       |
| `failed`         | number                                              | yes      |       |
| `flagged`        | number                                              | yes      |       |
| `avgScore`       | number or null                                      | yes      |       |
| `state`          | `"processing"` or `"completed"` or `"has_failures"` | yes      |       |
| `breaches`       | number                                              | yes      |       |
| `audioMs`        | number                                              | yes      |       |
| `costUsd`        | number                                              | yes      |       |
| `lastActivityAt` | string or null                                      | yes      |       |

### BatchList

| Field   | Type                                   | Required | Notes |
| ------- | -------------------------------------- | -------- | ----- |
| `items` | array of [BatchSummary](#batchsummary) | yes      |       |
| `total` | number                                 | yes      |       |

### BatchRetryResponse

| Field    | Type   | Required | Notes |
| -------- | ------ | -------- | ----- |
| `queued` | number | yes      |       |

### BatchSummary

| Field           | Type                                                | Required | Notes |
| --------------- | --------------------------------------------------- | -------- | ----- |
| `id`            | string                                              | yes      |       |
| `name`          | string                                              | yes      |       |
| `source`        | `"web"` or `"api"`                                  | yes      |       |
| `createdBy`     | string                                              | yes      |       |
| `createdByName` | string                                              | yes      |       |
| `createdAt`     | string                                              | yes      |       |
| `archivedAt`    | string or null                                      | yes      |       |
| `total`         | number                                              | yes      |       |
| `queued`        | number                                              | yes      |       |
| `processing`    | number                                              | yes      |       |
| `scored`        | number                                              | yes      |       |
| `failed`        | number                                              | yes      |       |
| `flagged`       | number                                              | yes      |       |
| `avgScore`      | number or null                                      | yes      |       |
| `state`         | `"processing"` or `"completed"` or `"has_failures"` | yes      |       |

### BatchUpdateRequest

| Field      | Type    | Required | Notes                |
| ---------- | ------- | -------- | -------------------- |
| `name`     | string  | no       | up to 120 characters |
| `archived` | boolean | no       |                      |

### CallDetail

| Field            | Type                         | Required | Notes       |
| ---------------- | ---------------------------- | -------- | ----------- |
| `call`           | [CallSummary](#callsummary)  | yes      |             |
| `audioAvailable` | boolean                      | yes      |             |
| `score`          | object or null               | yes      |             |
| `rubricItems`    | array of object              | yes      |             |
| `segments`       | array of [Segment](#segment) | yes      |             |
| `findings`       | array of [Finding](#finding) | yes      |             |
| `redactions`     | number                       | yes      | default `0` |

### CallFailedData

A call could not be processed; retry it once the reason is fixed.

| Field    | Type   | Required | Notes                                |
| -------- | ------ | -------- | ------------------------------------ |
| `callId` | string | yes      |                                      |
| `reason` | string | yes      | why processing gave up, for a person |

### CallFailedEvent

| Field       | Type                              | Required | Notes                                      |
| ----------- | --------------------------------- | -------- | ------------------------------------------ |
| `id`        | string                            | yes      | the event id; the same on every redelivery |
| `type`      | `"call.failed"`                   | yes      |                                            |
| `createdAt` | string                            | yes      | ISO 8601                                   |
| `data`      | [CallFailedData](#callfaileddata) | yes      |                                            |

### CallList

| Field        | Type                                 | Required | Notes |
| ------------ | ------------------------------------ | -------- | ----- |
| `items`      | array of [CallSummary](#callsummary) | yes      |       |
| `nextCursor` | string or null                       | yes      |       |
| `total`      | number                               | yes      |       |

### CallRetryResponse

| Field    | Type       | Required | Notes |
| -------- | ---------- | -------- | ----- |
| `status` | `"queued"` | yes      |       |

### CallScoredData

A call has its score and findings.

| Field          | Type            | Required | Notes                                         |
| -------------- | --------------- | -------- | --------------------------------------------- |
| `callId`       | string          | yes      |                                               |
| `batchId`      | string          | yes      |                                               |
| `agentId`      | string          | yes      |                                               |
| `teamId`       | string          | yes      |                                               |
| `productId`    | string          | yes      |                                               |
| `overallScore` | number or null  | yes      | 0 to 100; null when the judge could not score |
| `needsReview`  | boolean or null | yes      | true when QA should look at the call          |
| `judgeStatus`  | string or null  | yes      | ok, or why the judge failed                   |
| `breaches`     | integer         | yes      | prohibited statements found                   |

### CallScoredEvent

| Field       | Type                              | Required | Notes                                      |
| ----------- | --------------------------------- | -------- | ------------------------------------------ |
| `id`        | string                            | yes      | the event id; the same on every redelivery |
| `type`      | `"call.scored"`                   | yes      |                                            |
| `createdAt` | string                            | yes      | ISO 8601                                   |
| `data`      | [CallScoredData](#callscoreddata) | yes      |                                            |

### CallSummary

| Field              | Type                                                                                                                                                    | Required | Notes             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| `id`               | string                                                                                                                                                  | yes      |                   |
| `agentId`          | string                                                                                                                                                  | yes      |                   |
| `agentName`        | string                                                                                                                                                  | yes      |                   |
| `teamName`         | string                                                                                                                                                  | yes      |                   |
| `productName`      | string                                                                                                                                                  | yes      |                   |
| `callDate`         | string                                                                                                                                                  | yes      |                   |
| `originalFilename` | string                                                                                                                                                  | yes      |                   |
| `language`         | `"en-IN"` or `"hi-IN"` or `"bn-IN"` or `"ta-IN"` or `"te-IN"` or `"kn-IN"` or `"ml-IN"` or `"mr-IN"` or `"gu-IN"` or `"od-IN"` or `"pa-IN"` or `"auto"` | yes      |                   |
| `status`           | `"uploaded"` or `"transcribing"` or `"transcribed"` or `"scoring"` or `"scored"` or `"failed"`                                                          | yes      |                   |
| `error`            | string or null                                                                                                                                          | yes      |                   |
| `durationMs`       | number or null                                                                                                                                          | yes      |                   |
| `createdAt`        | string                                                                                                                                                  | yes      |                   |
| `overallScore`     | number or null                                                                                                                                          | yes      |                   |
| `judgeStatus`      | string or null                                                                                                                                          | yes      |                   |
| `needsReview`      | boolean or null                                                                                                                                         | yes      |                   |
| `reviewStatus`     | `"not_required"` or `"pending"` or `"done"` or null                                                                                                     | yes      |                   |
| `breaches`         | number                                                                                                                                                  | yes      |                   |
| `missed`           | number                                                                                                                                                  | yes      |                   |
| `flag`             | `"flagged"` or `"passed"` or `"pending"`                                                                                                                | yes      |                   |
| `archivedAt`       | string or null                                                                                                                                          | yes      |                   |
| `batchId`          | string                                                                                                                                                  | yes      |                   |
| `batchName`        | string                                                                                                                                                  | yes      |                   |
| `input`            | `"audio"` or `"transcript"`                                                                                                                             | yes      | default `"audio"` |
| `timed`            | boolean                                                                                                                                                 | yes      | default `true`    |

### CreateWebhookRequest

| Field         | Type                                                                                                          | Required | Notes                              |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `url`         | string                                                                                                        | yes      | up to 2000 characters              |
| `description` | string                                                                                                        | no       | default `""`; up to 200 characters |
| `events`      | array of `"call.scored"` or `"call.failed"` or `"batch.completed"` or `"alert.triggered"` or `"digest.ready"` | yes      |                                    |

### CreatedWebhook

| Field      | Type                                | Required | Notes |
| ---------- | ----------------------------------- | -------- | ----- |
| `endpoint` | [WebhookEndpoint](#webhookendpoint) | yes      |       |
| `secret`   | string                              | yes      |       |

### Dashboard

| Field     | Type                                                 | Required | Notes |
| --------- | ---------------------------------------------------- | -------- | ----- |
| `groupBy` | `"team"` or `"product"` or `"agent"` or `"language"` | yes      |       |
| `groups`  | array of object                                      | yes      |       |

### DigestReadyData

A daily or weekly digest was built.

| Field       | Type                    | Required | Notes |
| ----------- | ----------------------- | -------- | ----- |
| `frequency` | `"daily"` or `"weekly"` | yes      |       |
| `from`      | string                  | yes      |       |
| `to`        | string                  | yes      |       |
| `kpis`      | object                  | yes      |       |

### DigestReadyEvent

| Field       | Type                                | Required | Notes                                      |
| ----------- | ----------------------------------- | -------- | ------------------------------------------ |
| `id`        | string                              | yes      | the event id; the same on every redelivery |
| `type`      | `"digest.ready"`                    | yes      |                                            |
| `createdAt` | string                              | yes      | ISO 8601                                   |
| `data`      | [DigestReadyData](#digestreadydata) | yes      |                                            |

### Error

| Field   | Type   | Required | Notes |
| ------- | ------ | -------- | ----- |
| `error` | object | yes      |       |

### Finding

| Field        | Type                                                                                  | Required | Notes |
| ------------ | ------------------------------------------------------------------------------------- | -------- | ----- |
| `id`         | string                                                                                | yes      |       |
| `itemKey`    | string                                                                                | yes      |       |
| `itemType`   | `"mandatory"` or `"prohibited"` or `"quality"`                                        | yes      |       |
| `status`     | `"met"` or `"missed"` or `"partial"` or `"breach"` or `"clear"` or `"not_applicable"` | yes      |       |
| `source`     | `"llm"` or `"rule"` or `"reviewer"`                                                   | yes      |       |
| `quote`      | string or null                                                                        | yes      |       |
| `segmentSeq` | number or null                                                                        | yes      |       |
| `startMs`    | number or null                                                                        | yes      |       |
| `endMs`      | number or null                                                                        | yes      |       |
| `channel`    | `"agent"` or `"customer"` or null                                                     | yes      |       |
| `rationale`  | string or null                                                                        | yes      |       |
| `grounded`   | boolean                                                                               | yes      |       |
| `review`     | object or null                                                                        | yes      |       |

### Highlights

| Field           | Type            | Required | Notes |
| --------------- | --------------- | -------- | ----- |
| `from`          | string          | yes      |       |
| `to`            | string          | yes      |       |
| `previousFrom`  | string          | yes      |       |
| `previousTo`    | string          | yes      |       |
| `kpis`          | object          | yes      |       |
| `topAgents`     | array of object | yes      |       |
| `bottomAgents`  | array of object | yes      |       |
| `riskiestTeams` | array of object | yes      |       |
| `failedItems`   | array of object | yes      |       |
| `languageMix`   | array of object | yes      |       |
| `productMix`    | array of object | yes      |       |

### Leaderboard

| Field     | Type                                                 | Required | Notes |
| --------- | ---------------------------------------------------- | -------- | ----- |
| `groupBy` | `"team"` or `"product"` or `"agent"` or `"language"` | yes      |       |
| `items`   | array of object                                      | yes      |       |
| `total`   | number                                               | yes      |       |

### Me

| Field         | Type                                        | Required | Notes |
| ------------- | ------------------------------------------- | -------- | ----- |
| `id`          | string                                      | yes      |       |
| `email`       | string                                      | yes      |       |
| `displayName` | string                                      | yes      |       |
| `role`        | `"qa_reviewer"` or `"agent"` or `"manager"` | yes      |       |
| `agentId`     | string or null                              | yes      |       |

### PingData

A test event, sent from the endpoint page or the API.

| Field     | Type   | Required | Notes |
| --------- | ------ | -------- | ----- |
| `message` | string | yes      |       |

### PingEvent

| Field       | Type                  | Required | Notes                                      |
| ----------- | --------------------- | -------- | ------------------------------------------ |
| `id`        | string                | yes      | the event id; the same on every redelivery |
| `type`      | `"ping"`              | yes      |                                            |
| `createdAt` | string                | yes      | ISO 8601                                   |
| `data`      | [PingData](#pingdata) | yes      |                                            |

### Queued

| Field    | Type    | Required | Notes |
| -------- | ------- | -------- | ----- |
| `queued` | integer | yes      |       |

### Reference

| Field      | Type            | Required | Notes |
| ---------- | --------------- | -------- | ----- |
| `agents`   | array of object | yes      |       |
| `teams`    | array of object | yes      |       |
| `products` | array of object | yes      |       |

### Segment

| Field         | Type                      | Required | Notes |
| ------------- | ------------------------- | -------- | ----- |
| `seq`         | number                    | yes      |       |
| `channel`     | `"agent"` or `"customer"` | yes      |       |
| `startMs`     | number                    | yes      |       |
| `endMs`       | number                    | yes      |       |
| `text`        | string                    | yes      |       |
| `language`    | string or null            | yes      |       |
| `avgLogprob`  | number or null            | yes      |       |
| `words`       | array of object           | yes      |       |
| `translation` | string or null            | yes      |       |

### TranscriptLine

| Field     | Type                      | Required | Notes                 |
| --------- | ------------------------- | -------- | --------------------- |
| `speaker` | `"agent"` or `"customer"` | yes      |                       |
| `text`    | string                    | yes      | up to 5000 characters |
| `startMs` | integer                   | no       | at least 0            |
| `endMs`   | integer                   | no       | at least 0            |

### TranscriptUploadRequest

| Field         | Type            | Required | Notes                |
| ------------- | --------------- | -------- | -------------------- |
| `transcripts` | array of object | yes      | up to 50 items       |
| `batchId`     | string (uuid)   | no       |                      |
| `batchName`   | string          | no       | up to 120 characters |

### UpdateWebhookRequest

| Field         | Type                                                                                                          | Required | Notes                 |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------- | --------------------- |
| `url`         | string                                                                                                        | no       | up to 2000 characters |
| `description` | string                                                                                                        | no       | up to 200 characters  |
| `events`      | array of `"call.scored"` or `"call.failed"` or `"batch.completed"` or `"alert.triggered"` or `"digest.ready"` | no       |                       |
| `enabled`     | boolean                                                                                                       | no       |                       |

### UploadConfirmRequest

| Field       | Type            | Required | Notes                |
| ----------- | --------------- | -------- | -------------------- |
| `files`     | array of object | yes      | up to 50 items       |
| `batchId`   | string (uuid)   | no       |                      |
| `batchName` | string          | no       | up to 120 characters |

### UploadResult

| Field     | Type            | Required | Notes |
| --------- | --------------- | -------- | ----- |
| `batchId` | string          | yes      |       |
| `callIds` | array of string | yes      |       |

### UploadSignRequest

| Field   | Type            | Required | Notes          |
| ------- | --------------- | -------- | -------------- |
| `files` | array of object | yes      | up to 50 items |

### UploadSignResponse

| Field     | Type            | Required | Notes |
| --------- | --------------- | -------- | ----- |
| `uploads` | array of object | yes      |       |

### WebhookDelivery

| Field           | Type                                       | Required | Notes |
| --------------- | ------------------------------------------ | -------- | ----- |
| `id`            | string                                     | yes      |       |
| `eventId`       | string                                     | yes      |       |
| `eventType`     | string                                     | yes      |       |
| `status`        | `"pending"` or `"succeeded"` or `"failed"` | yes      |       |
| `attempts`      | number                                     | yes      |       |
| `lastStatus`    | number or null                             | yes      |       |
| `lastError`     | string or null                             | yes      |       |
| `nextAttemptAt` | string                                     | yes      |       |
| `deliveredAt`   | string or null                             | yes      |       |
| `createdAt`     | string                                     | yes      |       |
| `payload`       | any                                        | yes      |       |

### WebhookDeliveryList

| Field   | Type                                         | Required | Notes |
| ------- | -------------------------------------------- | -------- | ----- |
| `items` | array of [WebhookDelivery](#webhookdelivery) | yes      |       |
| `total` | number                                       | yes      |       |

### WebhookEndpoint

| Field                 | Type                                                                                                          | Required | Notes |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| `id`                  | string                                                                                                        | yes      |       |
| `url`                 | string                                                                                                        | yes      |       |
| `description`         | string                                                                                                        | yes      |       |
| `events`              | array of `"call.scored"` or `"call.failed"` or `"batch.completed"` or `"alert.triggered"` or `"digest.ready"` | yes      |       |
| `createdBy`           | string                                                                                                        | yes      |       |
| `createdAt`           | string                                                                                                        | yes      |       |
| `disabledAt`          | string or null                                                                                                | yes      |       |
| `disabledReason`      | string or null                                                                                                | yes      |       |
| `consecutiveFailures` | number                                                                                                        | yes      |       |
| `deliveries24h`       | number                                                                                                        | yes      |       |
| `failures24h`         | number                                                                                                        | yes      |       |

### WebhookEndpointList

| Field   | Type                                         | Required | Notes |
| ------- | -------------------------------------------- | -------- | ----- |
| `items` | array of [WebhookEndpoint](#webhookendpoint) | yes      |       |
