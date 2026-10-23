---
title: Uploading recordings
description: Sign, PUT and confirm stereo WAV or MP3 recordings, alone or as a batch.
section: Guides
order: 20
---

# Uploading recordings

Recordings go straight to private storage through signed URLs, so large files never pass through the API. Three steps, up to 50 files per request and 500 per batch.

## Requirements

- WAV (`audio/wav`) or MP3 (`audio/mpeg`), up to 50 MB each.
- Stereo, with the agent on the left channel and the customer on the right. A mono recording cannot be split by speaker, so the call fails with a reason saying so.
- Up to 2 hours long.
- An agent, team and product for each call (ids from `GET /api/reference`), the call date, and the language (`en-IN` by default; `auto` detects it).

Supported languages: English, Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Odia and Punjabi (`en-IN`, `hi-IN`, `bn-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `gu-IN`, `od-IN`, `pa-IN`). Regional calls are translated to English before scoring.

## 1. Sign

```bash
curl -X POST "$LATTE_URL/api/uploads/sign" \
  -H "Authorization: Bearer $LATTE_API_KEY" -H "Content-Type: application/json" \
  -d '{ "files": [{ "name": "call-0042.wav", "type": "audio/wav", "size": 1843200 }] }'
```

```json
{ "uploads": [{ "path": "...", "signedUrl": "https://...", "token": "..." }] }
```

## 2. PUT each file

```bash
curl -X PUT "$SIGNED_URL" -H "Content-Type: audio/wav" --data-binary @call-0042.wav
```

The signed URL is the permission; do not send your API key to it.

## 3. Confirm

```bash
curl -X POST "$LATTE_URL/api/uploads/confirm" \
  -H "Authorization: Bearer $LATTE_API_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: call-0042" \
  -d '{
    "batchName": "Inbound, week 42",
    "files": [{
      "path": "PATH_FROM_SIGN", "originalFilename": "call-0042.wav",
      "mimeType": "audio/wav", "sizeBytes": 1843200,
      "agentId": "...", "teamId": "...", "productId": "...",
      "callDate": "2026-10-22", "language": "hi-IN"
    }]
  }'
```

The answer is `201` with `{ "batchId": "...", "callIds": ["..."] }`. Processing starts at once.

## Large batches

To upload more than 50 files as one batch, confirm the first 50 without a `batchId`, then send the rest in chunks of 50 with the `batchId` from the first answer. A path can be confirmed once, so a retried chunk cannot create doubles.

The TypeScript SDK does this in one call; failed files come back in `failed` and the rest carry on. The Python, Go and Java SDKs have one method per endpoint (`sign_uploads`, `confirm_uploads` and so on), so a loop over chunks of 50 does the same:

```ts
const result = await latte.batches.create(
  files.map((f) => ({ filename: f.name, data: f.bytes, agentId, teamId, productId, callDate: "2026-10-22" })),
  { name: "Inbound, week 42", onProgress: (done, total) => console.log(done, total) },
);
```

## After upload

- Follow progress with `GET /api/batches/{id}` or the `call.scored` and `batch.completed` [webhooks](webhooks.md).
- A failed call carries the reason in `error`; `POST /api/calls/{id}/retry` queues it again, and `POST /api/batches/{id}/retry-failed` retries every failed call in a batch.
- `POST /api/calls/{id}/audio-url` returns a short-lived link to play or download the recording, unless the team's retention has deleted it (`410 audio_purged`).
