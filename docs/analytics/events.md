# Analytics events

Owner: engineering. Tool: Vercel Web Analytics (`@vercel/analytics`, mounted in `apps/web/src/app/App.tsx`). It is cookieless and counts visitors by a daily hash, without storing an IP address.

## Events

| Event | When | Properties | Notes |
| --- | --- | --- | --- |
| Page view | Every route change in the web app | the page path only | Query strings are removed, and record ids in the path become `:id` (`/calls/:id`), in `apps/web/src/lib/analytics.ts`. |

No custom events are sent: `pageViewOnly` drops any `track()` call. Adding one means adding a row here first, with properties that carry no personal data.

## Where to look

Vercel > Project `latte` > Analytics. Enable it there once; data appears after the next deployment and a page visit. Content blockers hide some visits.
