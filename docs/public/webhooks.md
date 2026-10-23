---
title: Webhooks
description: Events, payloads, signature checks in TypeScript, Python, Go and Java, retries and redelivery.
section: Guides
order: 24
---

# Webhooks

Latte POSTs a signed JSON event to your HTTPS endpoint when something happens, so you do not have to poll.

## Endpoints

A manager adds endpoints under **Developers > Webhooks**, or a key with `webhooks:write` calls the API:

```bash
curl -X POST "$LATTE_URL/api/webhooks" \
  -H "Authorization: Bearer $LATTE_API_KEY" -H "Content-Type: application/json" \
  -d '{ "url": "https://hooks.example.com/latte", "events": ["call.scored", "batch.completed"], "description": "CRM sync" }'
```

The answer carries the endpoint's signing `secret` (`whsec_...`), **shown once**. Store it with your other secrets.

- The URL must be `https://` on the standard port, with no user name or password. Private, loopback and link-local addresses are refused when Latte delivers, and redirects are not followed.
- `PATCH /api/webhooks/{id}` changes the URL, events or description, or turns the endpoint off and on.
- `POST /api/webhooks/{id}/test` sends a `ping` event.
- `GET /api/webhooks/{id}/deliveries` lists deliveries with their status, attempts and last response; `POST /api/webhooks/{id}/deliveries/{deliveryId}/redeliver` sends one again now.

## Events

| Event | When |
| --- | --- |
| `call.scored` | a call has its score and findings |
| `call.failed` | a call could not be processed |
| `batch.completed` | every call in a batch is scored or failed |
| `alert.triggered` | an alert rule fired for a team, product or agent |
| `digest.ready` | a daily or weekly digest was built |
| `ping` | a test you sent |

Every body is an envelope: `id` (the event id), `type`, `createdAt` and `data`. The `data` of each event is below, and field by field in the [API reference](api-reference.md#webhook-events).

### call.scored

```json
{
  "id": "6f1c1b0e-6a39-4d0c-9a51-1c2f5e2f9b10",
  "type": "call.scored",
  "createdAt": "2026-10-22T10:15:04.000Z",
  "data": {
    "callId": "0b7e4f9e-1c49-4a0f-8f5e-0d6a3c1c2b11",
    "batchId": "a3c2f1e0-5b4d-4c3b-9a8f-7e6d5c4b3a21",
    "agentId": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e51",
    "teamId": "d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f61",
    "productId": "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a71",
    "overallScore": 72,
    "needsReview": true,
    "judgeStatus": "ok",
    "breaches": 1
  }
}
```

`overallScore` is 0 to 100, or null when the judge could not score; `breaches` counts prohibited statements found. Read the call (`GET /api/calls/{callId}`) for its findings.

### call.failed

```json
{
  "id": "7a2d2c1f-7b4a-4e1d-8b62-2d3f6a3fac21",
  "type": "call.failed",
  "createdAt": "2026-10-22T10:16:40.000Z",
  "data": {
    "callId": "1c8f5a0f-2d5a-4b1f-9a6f-1e7b4d2d3c22",
    "reason": "Recording must be stereo: agent left, customer right"
  }
}
```

### batch.completed

```json
{
  "id": "8b3e3d2a-8c5b-4f2e-9c73-3e4a7b4abd31",
  "type": "batch.completed",
  "createdAt": "2026-10-22T10:20:00.000Z",
  "data": {
    "batchId": "a3c2f1e0-5b4d-4c3b-9a8f-7e6d5c4b3a21",
    "name": "Inbound, week 42",
    "total": 120,
    "scored": 118,
    "failed": 2
  }
}
```

### alert.triggered

```json
{
  "id": "9c4f4e3b-9d6c-4a3f-8d84-4f5b8c5bce41",
  "type": "alert.triggered",
  "createdAt": "2026-10-22T06:00:00.000Z",
  "data": {
    "ruleId": "f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b81",
    "ruleName": "Flag rate jump",
    "metric": "flag_rate",
    "scope": "team",
    "itemKey": null,
    "groupId": "d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f61",
    "groupName": "Inbound sales",
    "value": 34.5,
    "baseline": 18.2,
    "calls": 87
  }
}
```

`metric` is `flag_rate`, `avg_score` or `item_fail_rate` (with the rubric item in `itemKey`), as a percentage over the rule's recent window; `baseline` is the same metric over the window before.

### digest.ready

```json
{
  "id": "ad5a5f4c-ae7d-4b4a-9e95-5a6c9d6cdf51",
  "type": "digest.ready",
  "createdAt": "2026-10-22T04:10:00.000Z",
  "data": {
    "frequency": "weekly",
    "from": "2026-10-16",
    "to": "2026-10-22",
    "kpis": {
      "callsScored": { "value": 412, "previous": 380 },
      "avgScore": { "value": 81.4, "previous": 79.9 },
      "flagRate": { "value": 21.6, "previous": 24.1 },
      "breaches": { "value": 19, "previous": 27 },
      "reviewBacklog": 14
    }
  }
}
```

### ping

```json
{
  "id": "be6b6a5d-bf8e-4c5b-8fa6-6b7dae7de061",
  "type": "ping",
  "createdAt": "2026-10-22T09:00:00.000Z",
  "data": { "message": "A test event from Latte" }
}
```

## Headers

- `Latte-Event`: the event type.
- `Latte-Delivery`: the delivery id. It is the same on every retry and redelivery, so keep the ids you have handled and drop repeats.
- `Latte-Signature`: `t=<unix seconds>,v1=<hex HMAC-SHA256>`. The HMAC is keyed with the whole `whsec_...` secret, over the string `<t>.<raw body>`.

## Checking the signature

Check every delivery before trusting it. Use the **raw body bytes** as received: parsing and re-serialising the JSON changes them. Refuse a `t` more than five minutes from now, and compare in constant time.

Every SDK has the check built in, tested against the same signature as the server ([SDKs](sdks.md)):

| SDK | Call |
| --- | --- |
| TypeScript | `await verifyWebhookSignature({ secret, header, body })` from `@latte/sdk` |
| Python | `verify_webhook_signature(secret, header, raw_body)` from `latte_sdk.webhook` |
| Go | `latte.VerifyWebhookSignature(secret, header, body, time.Now())` |
| Java | `Webhook.verifySignature(secret, header, rawBody)` in `io.github.jagadeeshm007.latte` |

Without an SDK, the check is a few lines; the versions below match what the SDKs do.

### TypeScript

```ts
import { verifyWebhookSignature } from "@latte/sdk";
import express from "express";

const app = express();
app.post("/latte", express.text({ type: "application/json" }), async (req, res) => {
  const ok = await verifyWebhookSignature({
    secret: process.env.LATTE_WEBHOOK_SECRET!,
    header: req.header("Latte-Signature"),
    body: req.body,
  });
  if (!ok) return res.status(400).end();
  const event = JSON.parse(req.body);
  res.status(204).end();
  // Handle event.type after answering, or queue it.
});
```

### Python

```python
import hashlib
import hmac
import time


def verify(secret: str, header: str, body: bytes, tolerance: int = 300) -> bool:
    parts = dict(p.strip().split("=", 1) for p in header.split(",") if "=" in p)
    try:
        t = int(parts["t"])
    except (KeyError, ValueError):
        return False
    if abs(time.time() - t) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))
```

### Go

```go
package latte

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// Verify checks a Latte-Signature header against the raw request body.
func Verify(secret, header string, body []byte, now time.Time) bool {
	var t int64
	var v1 string
	for _, part := range strings.Split(header, ",") {
		k, v, _ := strings.Cut(strings.TrimSpace(part), "=")
		switch k {
		case "t":
			t, _ = strconv.ParseInt(v, 10, 64)
		case "v1":
			v1 = v
		}
	}
	if d := now.Unix() - t; t == 0 || d > 300 || d < -300 {
		return false
	}
	given, err := hex.DecodeString(v1)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strconv.FormatInt(t, 10) + "."))
	mac.Write(body)
	return hmac.Equal(mac.Sum(nil), given)
}
```

### Java

```java
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class LatteSignature {
  /** Checks a Latte-Signature header against the raw request body. */
  public static boolean verify(String secret, String header, byte[] body) throws Exception {
    long t = 0;
    String v1 = "";
    for (String part : header.split(",")) {
      String[] kv = part.trim().split("=", 2);
      if (kv.length != 2) continue;
      if (kv[0].equals("t")) {
        try { t = Long.parseLong(kv[1]); } catch (NumberFormatException e) { return false; }
      }
      if (kv[0].equals("v1")) v1 = kv[1];
    }
    if (t == 0 || Math.abs(Instant.now().getEpochSecond() - t) > 300) return false;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    mac.update((t + ".").getBytes(StandardCharsets.UTF_8));
    byte[] expected = HexFormat.of().formatHex(mac.doFinal(body)).getBytes(StandardCharsets.UTF_8);
    return MessageDigest.isEqual(expected, v1.getBytes(StandardCharsets.UTF_8));
  }
}
```

## Answering and retries

- Answer any 2xx within 10 seconds. Do the work after answering, or put the event on a queue.
- Anything else, or no answer in 10 seconds, is retried 8 times over about 23 hours: after 30 s, 2 min, 10 min, 30 min, 1 h, 3 h, 6 h and 12 h. Then the delivery is marked failed.
- After 50 failed deliveries in a row the endpoint is turned off, with the reason on the endpoint. Turn it back on with `PATCH /api/webhooks/{id}` and `{ "enabled": true }`, then redeliver what you missed.
- Events can arrive more than once and out of order. Use `Latte-Delivery` to drop repeats, and read the current state from the API when order matters.
