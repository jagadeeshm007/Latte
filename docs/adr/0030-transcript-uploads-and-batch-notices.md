# ADR-0030: Calls uploaded as transcripts, and a notice when a batch finishes

- Status: Accepted
- Date: 2026-10-22
- Task: SCC-1
- Deciders: engineering, with the product owner (chose labelled text plus JSON, and line numbers when there are no times)
- Area: api, data model, pipeline, sdk, web
- Reversibility: moderate: migration 0014 has a down file, which refuses while transcript calls exist

## Context

Many teams already have transcripts from their dialler or CRM and no recording, or a recording they cannot share. They want those calls scored like any other. Separately, people who upload a batch had to keep checking the Batches page to know when it was done.

## Decision

- **Input.** `calls.input` is `audio` or `transcript`. A transcript call has no storage path; the file type and size checks apply to audio only.
- **Accepted formats.** The API takes structured lines: `{ speaker: agent | customer, text, startMs?, endMs? }`, with times on every line or on none, up to 3,000 lines and 1 MB a call, and 50 transcripts a request (`POST /api/uploads/transcripts`, `calls:write`, idempotent). The SDK's `parseTranscript` (also `@latte/sdk/transcript`, used by the web app) reads labelled text (`Agent:`/`Customer:`, optional `[mm:ss]`) and JSON into those lines; the server never parses free text.
- **One pipeline.** Lines are stored as `transcript_segments` at upload, and the call goes through the transcribe job, which skips speech-to-text and translates regional languages before scoring. Scoring, review, exports, webhooks and batches are unchanged. A retry of a transcript call always restarts at that step, so a failed translation is redone rather than skipped.
- **No times.** `calls.timed` is false when no line had a time. Stored times are then only an order, each line lasting in proportion to its words, so the talk ratio becomes each side's share of the words. The call page, findings, the add-finding picker and exports show "Line 14" instead of a time; subtitle formats are not offered.
- **Billing and totals.** "Audio processed" and a batch's audio total count audio calls only.
- **Batch notice.** When the last call in a batch is scored or fails, the person who started it (for an API batch, the key's manager) gets an in-app notification, written in the same transaction as the `batch.completed` webhook. Retrying a batch's failures reopens it, so it notifies again when it finishes.

## Consequences

- The judge sees order-only times on an untimed transcript; a rubric item that depends on timing ("within the first minute") is judged on an estimate.
- Transcript calls have no audio to play or download, and their quotes cannot be checked against a recording.

## Commits us to

The transcript line contract and the `input` and `timed` fields on calls, which API clients read.
