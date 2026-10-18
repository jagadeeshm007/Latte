import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/**
 * Mock Service Worker for unit tests. setup.ts starts this server for every
 * test, so a request that no handler answers fails the test instead of
 * reaching the network. A test that needs another answer calls
 * `server.use(http.get(...))`; handlers reset after each test.
 *
 * VITE_API_URL is set to an absolute origin in vitest.config.ts so the
 * request URLs match these patterns.
 */
export const handlers = [
  http.get("*/healthz", () => HttpResponse.json({ status: "ok", version: "msw" })),
  // A call page fetches its recording link as soon as it opens.
  http.post("*/api/calls/:id/audio-url", () =>
    HttpResponse.json({ url: "https://storage.test/a.wav", expiresInSeconds: 600 }),
  ),
  // List pages ask for their saved views, and the shell for the unread count.
  http.get("*/api/saved-views", () => HttpResponse.json({ items: [] })),
  http.get("*/api/notifications/unread-count", () => HttpResponse.json({ unread: 0 })),
  // The app shell shows an open incident from the status page.
  http.get("*/api/status", () =>
    HttpResponse.json({
      overall: "operational",
      checkedAt: "2026-10-18T00:00:00.000Z",
      components: [],
      notices: [],
    }),
  ),
];

export const server = setupServer(...handlers);
