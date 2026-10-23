---
title: Quickstart
description: Create a key, call the API, upload a transcript and read its score.
section: Get started
order: 2
---

# Quickstart

## 1. Create a key

A manager opens **Developers > API keys** in the app, creates a key and copies the secret. It looks like `latte_<prefix>_<secret>` and is shown once. Give it only the scopes you need; this guide uses `calls:read` and `calls:write`.

```bash
export LATTE_URL=https://your-latte-domain
export LATTE_API_KEY=latte_...
```

## 2. Check the key

```bash
curl -s -H "Authorization: Bearer $LATTE_API_KEY" "$LATTE_URL/api/me"
```

The answer names the manager the key acts as. `GET /api/reference` lists the agents, teams and products you upload against:

```bash
curl -s -H "Authorization: Bearer $LATTE_API_KEY" "$LATTE_URL/api/reference"
```

## 3. Upload a transcript

A transcript needs no audio, so it is the quickest way to see a score. Use ids from step 2:

```bash
curl -s -X POST "$LATTE_URL/api/uploads/transcripts" \
  -H "Authorization: Bearer $LATTE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: quickstart-1" \
  -d '{
    "batchName": "Quickstart",
    "transcripts": [{
      "originalFilename": "call-1.txt",
      "agentId": "AGENT_ID", "teamId": "TEAM_ID", "productId": "PRODUCT_ID",
      "callDate": "2026-10-22", "language": "en-IN",
      "lines": [
        { "speaker": "agent", "text": "Good morning, this is Ravi from Acme Insurance. Am I speaking with Ms Rao?" },
        { "speaker": "customer", "text": "Yes, speaking." },
        { "speaker": "agent", "text": "This plan guarantees you double your money in three years." }
      ]
    }]
  }'
```

The answer is `{ "batchId": "...", "callIds": ["..."] }`. Scoring takes a few seconds to a minute.

## 4. Read the score

```bash
curl -s -H "Authorization: Bearer $LATTE_API_KEY" "$LATTE_URL/api/calls/CALL_ID"
```

When `call.status` is `scored`, `call.overallScore` and `call.flag` are set, and `findings` lists each rubric item's result with the quoted line. The third line above is a guaranteed-returns breach, so this call is flagged.

## The same with the TypeScript SDK

```ts
import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({ apiKey: process.env.LATTE_API_KEY!, baseUrl: process.env.LATTE_URL! });

const { agents, teams, products } = await latte.reference();
const batch = await latte.batches.createFromTranscripts(
  [
    {
      originalFilename: "call-1.txt",
      agentId: agents[0]!.id,
      teamId: teams[0]!.id,
      productId: products[0]!.id,
      callDate: "2026-10-22",
      text: "Agent: Good morning, this is Ravi.\nCustomer: Hi.",
    },
  ],
  { name: "Quickstart" },
);
const done = await latte.batches.wait(batch.batchId!);
console.log(done.state, done.scored, done.flagged);
```

## The same in Python

```python
import os

import latte_sdk

config = latte_sdk.Configuration(host=os.environ["LATTE_URL"], access_token=os.environ["LATTE_API_KEY"])
with latte_sdk.ApiClient(config) as client:
    reference = latte_sdk.AccountApi(client).get_reference()
    print([a.name for a in reference.agents])
```

Go and Java work the same way, one method per endpoint: see [SDKs](sdks.md).

## Next

- Recordings instead of transcripts: [Uploads](uploads.md).
- Get told when calls are scored instead of polling: [Webhooks](webhooks.md).
- Every endpoint: [API reference](api-reference.md).
- Runnable programs (upload a folder, import a dialler export, receive webhooks, sync a CRM): [examples on GitHub](https://github.com/jagadeeshm007/Latte/tree/main/examples).
