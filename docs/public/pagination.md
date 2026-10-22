---
title: Pagination
description: limit and page, the calls cursor, and totals.
section: Concepts
order: 14
---

# Pagination

Lists answer `{ "items": [...], "total": <n> }`.

- `limit` is the page size, at most 100. Defaults differ per list: 50 for calls, 20 for batches, 25 for the leaderboard and webhook deliveries.
- `page` is the page number, from 1.

```bash
curl -H "Authorization: Bearer $LATTE_API_KEY" "$LATTE_URL/api/batches?limit=100&page=2"
```

## The calls cursor

`GET /api/calls` also answers `nextCursor`. Pass it back as `cursor` for the next page. A cursor stays stable while new calls arrive, so use it to walk every call once, for example in a nightly sync:

```ts
let cursor: string | undefined;
do {
  const page = await latte.calls.list({ status: "scored", limit: 100, cursor });
  for (const call of page.items) await save(call);
  cursor = page.nextCursor ?? undefined;
} while (cursor);
```

`nextCursor` is `null` on the last page.
