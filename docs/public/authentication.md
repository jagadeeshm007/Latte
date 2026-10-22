---
title: Authentication and scopes
description: API keys, the bearer header, scopes, expiry, rotation and what keys cannot do.
section: Concepts
order: 10
---

# Authentication and scopes

## API keys

A manager creates keys under **Developers > API keys** in the app. The secret looks like `latte_<prefix>_<secret>` and is shown once; Latte stores only a hash. Send it as a bearer token on every request:

```bash
curl -H "Authorization: Bearer $LATTE_API_KEY" "$LATTE_URL/api/me"
```

- A key acts as the manager who created it, and sees what that manager sees.
- A key stops working when it is revoked, when it expires, or when its creator stops being a manager.
- **Rotating** a key makes a successor with the same name, scopes and limits. The old key keeps working for 24 hours so deployments can switch over.
- The request log under each key shows the route, status, duration and request id of every call, never the body.

Keep keys in a secret manager or environment variable, never in source code or a browser.

## Scopes

Give each key only the scopes its integration needs.

| Scope | Allows |
| --- | --- |
| `calls:read` | list and read calls, the reference data, signed audio links |
| `calls:write` | upload calls and transcripts, retry, archive and unarchive |
| `batches:read` | list and read batches |
| `batches:write` | rename and archive batches, retry a batch's failed calls |
| `exports:read` | a batch's results CSV and export ZIP |
| `analytics:read` | the dashboard, highlights and leaderboard |
| `webhooks:write` | manage webhook endpoints and their deliveries |

`GET /api/me` needs no scope. Each endpoint's scope is listed in the [API reference](api-reference.md).

## What keys cannot do

Reviews, rubrics, spend, members, billing and key management are for people signed in to the app. Those routes answer `403 not_for_api_keys` to a key. A route the key's scopes do not cover answers `403 insufficient_scope`. Both count against the key's [rate limit](rate-limits.md).

## Personal data

Keys never receive unmasked personal data. Transcripts, finding quotes, exports and webhook payloads mask card numbers (Luhn checked), Indian mobile numbers, Aadhaar (Verhoeff checked), PAN, IFSC, account-like digit runs and email addresses, for example `[card ••••1234]`. A call's `redactions` says how many spans were masked.
