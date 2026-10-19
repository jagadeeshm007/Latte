import type { BeforeSendEvent } from "@vercel/analytics/react";

// Vercel Web Analytics records page views only (docs/analytics/events.md).
// Before anything leaves the browser the URL loses its query string, which can
// hold search text such as a customer's or agent's name, and its record ids,
// so pages group by kind and no id is sent to a third party.

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** pageViewOnly keeps the path of a page view, ids replaced by :id, and drops the rest. */
export function pageViewOnly(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== "pageview") return null;
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname.replace(UUID, ":id")}` };
}
