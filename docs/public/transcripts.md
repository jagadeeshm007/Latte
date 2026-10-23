---
title: Uploading transcripts
description: Score calls you already have as text, with or without timestamps.
section: Guides
order: 21
---

# Uploading transcripts

When your dialler or CRM already has the transcript, upload it as text. There is no audio to store or transcribe, so it scores faster.

`POST /api/uploads/transcripts` takes up to 50 transcripts per request, into a new batch or an existing one (`batchId`).

```json
{
  "batchName": "Dialler export",
  "transcripts": [
    {
      "originalFilename": "call-0042.txt",
      "agentId": "...",
      "teamId": "...",
      "productId": "...",
      "callDate": "2026-10-22",
      "language": "en-IN",
      "lines": [
        { "speaker": "agent", "text": "Good morning, this is Ravi.", "startMs": 0, "endMs": 2800 },
        { "speaker": "customer", "text": "Hi.", "startMs": 3000, "endMs": 3400 }
      ]
    }
  ]
}
```

## Rules

- `speaker` is `agent` or `customer`.
- Give `startMs` and `endMs` on every line or on none. Without times, the call page and exports show line numbers instead, and the call answers `timed: false`.
- Name the language (default `en-IN`); it cannot be detected without audio. Regional transcripts are translated before scoring.
- Up to 3000 lines per transcript, and the whole request body up to 256 KB. Split large exports into several requests with the same `batchId`.
- Send an `Idempotency-Key` so a retried request cannot create the calls twice.

The answer is `201` with `{ "batchId": "...", "callIds": [...] }`. These calls have `input: "transcript"` and no recording. Scoring, findings, webhooks and exports work as for audio.

## Labelled text with the SDK

The TypeScript SDK reads labelled text into lines. The Python, Go and Java SDKs send lines as given (`UploadsApi.upload_transcripts` and its equivalents), so split your text into `{ speaker, text }` lines first:

```ts
import { parseTranscript } from "@latte/sdk";

await latte.calls.uploadTranscript({
  originalFilename: "call-0042.txt",
  agentId,
  teamId,
  productId,
  callDate: "2026-10-22",
  text: "[00:00] Agent: Good morning, this is Ravi.\n[00:03] Customer: Hi.",
});

parseTranscript("Agent: Hello.\nCustomer: Hi.");
```

- One turn per line: `Agent:` or `Customer:` (also Rep, Advisor, Client, Caller), with an optional time like `[00:41]`.
- A line without a label continues the turn above.
- JSON input takes a list of lines, or `{ "lines": [...] }`.
- `parseTranscript` throws `TranscriptParseError` naming the line it could not read.

`latte.batches.createFromTranscripts(list, { name })` sends many in chunks of 50 as one batch.
