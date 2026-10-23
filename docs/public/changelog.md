---
title: Changelog
description: Changes to the API, the OpenAPI document and the SDK, newest first.
section: Reference
order: 95
---

# Changelog

The OpenAPI document's `info.version` follows the SDK version.

## 0.3.0

- **Python, Go and Java SDKs.** Generated from the OpenAPI document, each with a webhook signature check; installed from GitHub ([SDKs](sdks.md)). One tag, `sdk-v0.3.0`, releases them with the TypeScript SDK, and `sdk-latest` always points at the newest release.
- **OpenAPI.** Every operation has an `operationId` and a tag, every body and response is a named schema, success statuses are the real ones (201, 202, 204), and webhook payloads are described in the `webhooks` section.
- **Public docs.** These pages, `/llms.txt`, `/llms-full.txt` and `/openapi.json`.

## 0.2.0

- **Transcript uploads.** `POST /api/uploads/transcripts` scores calls from text with no audio; calls answer `input` and `timed`. SDK: `calls.uploadTranscript`, `batches.createFromTranscripts`, `parseTranscript`.

## 0.1.0

- The first release of the API with scoped keys, rate limits, idempotency keys, signed webhooks and the TypeScript SDK.
