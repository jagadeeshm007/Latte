---
title: Overview
description: What the Latte API does, how the docs are organised, and where to start.
section: Get started
order: 1
---

# Latte API

Latte checks recorded sales and service calls against a compliance and quality rubric. The API lets your systems do what the app does: upload calls or transcripts, read scores and findings, export results, and get a webhook when something happens.

## Start here

1. [Quickstart](quickstart.md): a key, a first request and a first upload in five minutes.
2. [Use cases](use-cases.md): CRM sync, dialler push, warehouse export, alerts in chat, QA automation.
3. [API reference](api-reference.md): every endpoint, schema and webhook event.

## How the API works

- **REST and JSON** over HTTPS. Every path starts with `/api`.
- **API keys** belong to a manager and carry scopes ([Authentication](authentication.md)).
- **Limits** are per key and bucket ([Rate limits](rate-limits.md)).
- **Errors** have one shape with a request id ([Errors](errors.md)).
- **Retries are safe** with an `Idempotency-Key` ([Idempotency](idempotency.md)).
- **Lists page** with `limit` and `page` or `cursor` ([Pagination](pagination.md)).
- **Webhooks** are signed and retried ([Webhooks](webhooks.md)).

## The flow of a call

```
upload ──► transcribe each speaker ──► score against the rubric ──► flag for QA ──► results
```

1. You upload a recording ([Uploads](uploads.md)) or a transcript ([Transcripts](transcripts.md)). Several calls form a batch.
2. Latte transcribes audio per speaker (agent on the left channel, customer on the right), translating regional languages to English.
3. One judge call scores every rubric item and cites transcript lines; calls with a breach or a missed mandatory item are flagged.
4. `call.scored` and `batch.completed` webhooks fire, and results are ready to read or export ([Batches and exports](batches-and-exports.md), [Analytics](analytics.md)).

## SDKs

Clients for TypeScript (`@latte/sdk`), Python (`latte_sdk`), Go and Java wrap every endpoint and include the webhook signature check; all four share one version ([SDKs](sdks.md)). Runnable examples are in [examples/](https://github.com/jagadeeshm007/Latte/tree/main/examples). For any other language, generate a client from [openapi.json](/openapi.json).

## For LLMs and tools

Every page is plain Markdown at `/docs/<page>.md`. [`/llms.txt`](/llms.txt) lists them all, and [`/llms-full.txt`](/llms-full.txt) is every page in one file. The OpenAPI 3.1 document is at [`/openapi.json`](/openapi.json) and `GET /api/openapi.json`.
