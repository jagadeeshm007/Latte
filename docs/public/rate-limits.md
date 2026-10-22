---
title: Rate limits
description: Buckets, default limits, the RateLimit headers and how to back off.
section: Concepts
order: 11
---

# Rate limits

Requests are counted per key and per bucket, in fixed windows.

| Bucket | Default | Window | Used by |
| --- | --- | --- | --- |
| `read` | 600 | 1 minute | every GET except exports |
| `single` | 60 | 1 minute | one-call writes, webhook writes, one-file uploads |
| `batch` | 20 | 1 minute | multi-file uploads, retrying a batch's failures |
| `bulk` | 10 | 1 hour | results CSV and export ZIP |

A manager can raise a key's limits in the app, up to 6000, 600, 200 and 100 respectively. Each endpoint's bucket is in the [API reference](api-reference.md) as `x-rate-limit-bucket` in [openapi.json](/openapi.json).

## Headers

Every response carries:

- `RateLimit-Limit`: the bucket's limit.
- `RateLimit-Remaining`: requests left in this window.
- `RateLimit-Reset`: seconds until the window resets.
- `RateLimit-Policy`: `<limit>;w=<window seconds>`.

Over the limit, the API answers `429 rate_limited` with `Retry-After` in seconds:

```json
{
  "error": {
    "code": "rate_limited",
    "message": "this API key is over its read limit of 600 requests; retry in 12 s",
    "details": { "bucket": "read", "limit": 600, "retryAfterSeconds": 12 },
    "requestId": "..."
  }
}
```

## Backing off

- Wait `Retry-After` seconds, then retry. The TypeScript SDK does this for you, three times by default (`maxRetries`).
- Refused requests count too, so a client looping on a 403 runs into its limit.
- Use [webhooks](webhooks.md) rather than polling a batch every second.
