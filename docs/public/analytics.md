---
title: Analytics
description: Scores and flags by team, product, agent or language, highlights and the leaderboard.
section: Guides
order: 23
---

# Analytics

Three endpoints, scope `analytics:read`, give the numbers behind the app's dashboard. Each takes an optional `from` and `to` (`YYYY-MM-DD`, inclusive).

## Dashboard

`GET /api/dashboard?groupBy=team` groups results by `team`, `product`, `agent` or `language`. Each group has `callsScored`, `flagged`, `flagRate`, `avgOverall`, and a `passRate` per rubric item.

## Highlights

`GET /api/dashboard/highlights` answers the period's headline numbers (`callsScored`, `avgScore`, `flagRate`, `breaches`), each with the previous period of the same length for comparison, and the current `reviewBacklog`. It also lists the top and bottom agents, the riskiest teams, the most failed rubric items and the language mix.

## Leaderboard

`GET /api/dashboard/leaderboard` is a sorted, paged ranking of any grouping:

| Parameter | Values | Default |
| --- | --- | --- |
| `groupBy` | `team`, `product`, `agent`, `language` | `agent` |
| `sort` | `name`, `calls`, `avgScore`, `flagRate`, `breaches` | `avgScore` |
| `dir` | `asc`, `desc` | `desc` |
| `minCalls` | groups with fewer scored calls are left out; 0 keeps empty groups | 1 |
| `q` | search by name | |
| `page`, `limit` | paging, `limit` up to 100 | 1, 25 |

```ts
const worst = await latte.analytics.leaderboard({ groupBy: "agent", sort: "flagRate", dir: "desc", limit: 10 });
```

Field-by-field shapes are in the [API reference](api-reference.md#dashboard).
