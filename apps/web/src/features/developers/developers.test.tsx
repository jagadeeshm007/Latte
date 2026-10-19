import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { ApiKeyPage } from "./ApiKeyPage";
import { DevelopersPage } from "./DevelopersPage";
import { DocsPage } from "./DocsPage";
import { WebhookPage } from "./WebhookPage";

const KEY_ID = "k1111111-1111-4111-8111-111111111111";
const key = (over: Record<string, unknown> = {}) => ({
  id: KEY_ID,
  name: "CRM sync",
  prefix: "ab12cd34",
  scopes: ["calls:read", "exports:read"],
  limits: { read: 600, single: 60, batch: 20, bulk: 10 },
  createdBy: "u1",
  createdByName: "Mira",
  createdAt: "2026-10-01T10:00:00.000Z",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  requests24h: 42,
  ...over,
});
const metrics = {
  days: [
    { day: "2026-10-15", ok: 90, clientErrors: 3, serverErrors: 1, rateLimited: 6, p95Ms: 210 },
  ],
  totals: { requests: 100, errorRate: 0.1, p50Ms: 40, p95Ms: 210 },
  buckets: [
    { bucket: "read", requests: 95, limit: 600, windowSeconds: 60, used: 540 },
    { bucket: "single", requests: 5, limit: 60, windowSeconds: 60, used: 0 },
    { bucket: "batch", requests: 0, limit: 20, windowSeconds: 60, used: 0 },
    { bucket: "bulk", requests: 0, limit: 10, windowSeconds: 3600, used: 0 },
  ],
  routes: [{ method: "GET", route: "/calls/:id", requests: 80, errors: 2, p95Ms: 190 }],
  usage: { callsUploaded: 12, callsScored: 10, costUsd: 0.0456 },
};
const log = (over: Record<string, unknown> = {}) => ({
  id: 1,
  method: "GET",
  route: "/calls/:id",
  bucket: "read",
  status: 200,
  durationMs: 35,
  requestId: "req-abc",
  createdAt: "2026-10-15T09:00:00.000Z",
  ...over,
});

describe("developers: API keys", () => {
  it("lists keys masked, with their scopes and status", async () => {
    server.use(
      http.get("*/api/api-keys", () =>
        HttpResponse.json({
          items: [
            key(),
            key({ id: "k2", name: "Old dialler", revokedAt: "2026-10-10T00:00:00.000Z" }),
            key({ id: "k3", name: "Pilot", expiresAt: "2026-01-01T00:00:00.000Z" }),
          ],
        }),
      ),
    );
    await renderInRouter(<DevelopersPage />);

    const table = within(await screen.findByRole("table", { name: "API keys" }));
    expect(table.getAllByText("latte_ab12cd34_••••")).toHaveLength(3);
    expect(table.getAllByText("Export")).toHaveLength(3);
    expect(table.getByText("Revoked")).toBeInTheDocument();
    expect(table.getByText("Expired")).toBeInTheDocument();
    expect(table.getByRole("link", { name: "CRM sync" })).toHaveAttribute(
      "href",
      `/developers/${KEY_ID}`,
    );
  });

  it("creates a key with the chosen scopes and limits, and shows the secret once to copy", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get("*/api/api-keys", () => HttpResponse.json({ items: [] })),
      http.post("*/api/api-keys", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ key: key(), secret: "latte_ab12cd34_SECRET" }, { status: 201 });
      }),
    );
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await renderInRouter(<DevelopersPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Create API key" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "CRM sync");
    await userEvent.click(dialog.getByRole("checkbox", { name: /Upload calls/ }));
    await userEvent.type(dialog.getByRole("spinbutton", { name: /Reads, per minute/ }), "1200");
    await userEvent.click(dialog.getByRole("button", { name: "Create key" }));

    const secret = await screen.findByRole("textbox", { name: "New API key" });
    expect(secret).toHaveValue("latte_ab12cd34_SECRET");
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("latte_ab12cd34_SECRET");
    expect(bodies).toEqual([
      {
        name: "CRM sync",
        scopes: ["calls:read", "calls:write"],
        expiresInDays: null,
        limits: { read: 1200 },
      },
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: "New API key" })).not.toBeInTheDocument();
    });
  });

  it("ticks off quick setup steps from what it can see", async () => {
    server.use(
      http.get("*/api/api-keys", () =>
        HttpResponse.json({ items: [key({ lastUsedAt: "2026-10-15T09:00:00.000Z" })] }),
      ),
      http.get("*/api/webhooks", () => HttpResponse.json({ items: [] })),
    );
    await renderInRouter(<DevelopersPage />);

    await userEvent.click(await screen.findByRole("tab", { name: "Quick setup" }));
    const setup = within(await screen.findByRole("region", { name: "Quick setup" }));

    expect(await setup.findByText("2 of 4 done.", { exact: false })).toBeInTheDocument();
    expect(setup.getByText(/Create an API key/)).toHaveTextContent("(done)");
    expect(setup.getByText(/Add a webhook endpoint/)).toHaveTextContent("(to do)");
  });

  it("revokes every key only once the phrase is typed", async () => {
    const revokeAll = vi.fn(() => HttpResponse.json({ revoked: 3 }));
    server.use(
      http.get("*/api/api-keys", () => HttpResponse.json({ items: [key()] })),
      http.post("*/api/api-keys/revoke-all", revokeAll),
    );
    await renderInRouter(<DevelopersPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Revoke all keys" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    const confirm = dialog.getByRole("button", { name: "Revoke all keys" });
    expect(confirm).toBeDisabled();
    await userEvent.type(dialog.getByRole("textbox"), "REVOKE ALL");
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(revokeAll).toHaveBeenCalledTimes(1);
    });
  });
});

describe("developers: webhooks", () => {
  const hook = (over: Record<string, unknown> = {}) => ({
    id: "w1111111-1111-4111-8111-111111111111",
    url: "https://hooks.example.com/latte",
    description: "CRM",
    events: ["call.scored", "batch.completed"],
    createdBy: "u1",
    createdAt: "2026-10-01T10:00:00.000Z",
    disabledAt: null,
    disabledReason: null,
    consecutiveFailures: 0,
    deliveries24h: 12,
    failures24h: 2,
    ...over,
  });

  it("lists endpoints and adds one, showing its signing secret once", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get("*/api/api-keys", () => HttpResponse.json({ items: [] })),
      http.get("*/api/webhooks", () => HttpResponse.json({ items: [hook()] })),
      http.post("*/api/webhooks", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ endpoint: hook(), secret: "whsec_SECRET" }, { status: 201 });
      }),
    );
    await renderInRouter(<DevelopersPage />);

    await userEvent.click(await screen.findByRole("tab", { name: "Webhooks" }));
    const table = within(await screen.findByRole("table", { name: "Webhook endpoints" }));
    expect(table.getByText("2 failed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(
      dialog.getByRole("textbox", { name: "Endpoint URL" }),
      "https://x.example.com/h",
    );
    await userEvent.click(dialog.getByRole("checkbox", { name: /Batch completed/ }));
    await userEvent.click(dialog.getByRole("button", { name: "Add endpoint" }));

    expect(await screen.findByRole("textbox", { name: "Signing secret" })).toHaveValue(
      "whsec_SECRET",
    );
    expect(bodies).toEqual([
      {
        url: "https://x.example.com/h",
        description: "",
        events: ["call.scored", "batch.completed"],
      },
    ]);
  });

  it("sends a test event, turns the endpoint off and redelivers a failure", async () => {
    const calls: string[] = [];
    const record = (name: string) => {
      calls.push(name);
      return HttpResponse.json({ queued: 1 }, { status: 202 });
    };
    server.use(
      http.get(`*/api/webhooks/${hook().id}`, () => HttpResponse.json(hook())),
      http.get(`*/api/webhooks/${hook().id}/deliveries`, () =>
        HttpResponse.json({
          total: 1,
          items: [
            {
              id: "d1",
              eventId: "e1",
              eventType: "call.scored",
              status: "failed",
              attempts: 9,
              lastStatus: 500,
              lastError: "HTTP 500",
              nextAttemptAt: "2026-10-15T09:00:00.000Z",
              deliveredAt: null,
              createdAt: "2026-10-15T08:00:00.000Z",
              payload: { id: "e1", type: "call.scored", data: { callId: "c1" } },
            },
          ],
        }),
      ),
      http.post(`*/api/webhooks/${hook().id}/test`, () => record("test")),
      http.patch(`*/api/webhooks/${hook().id}`, async ({ request }) => {
        calls.push(`patch ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(hook({ disabledAt: "2026-10-16T00:00:00.000Z" }));
      }),
      http.post(`*/api/webhooks/${hook().id}/deliveries/d1/redeliver`, () => record("redeliver")),
    );
    await renderInRouter(<WebhookPage webhookId={hook().id} />);

    await userEvent.click(await screen.findByRole("button", { name: "Send test event" }));
    await userEvent.click(screen.getByRole("switch", { name: "Endpoint on" }));
    const table = within(await screen.findByRole("table", { name: "Deliveries" }));
    expect(table.getByText("HTTP 500")).toBeInTheDocument();
    await userEvent.click(table.getByRole("button", { name: "Send call.scored again" }));

    await waitFor(() => {
      expect(calls).toEqual(["test", 'patch {"enabled":false}', "redeliver"]);
    });
  });
});

describe("developers: webhook states", () => {
  const ID = "w2222222-2222-4222-8222-222222222222";
  const endpoint = {
    id: ID,
    url: "https://hooks.example.com/off",
    description: "",
    events: ["call.failed"],
    createdBy: "u1",
    createdAt: "2026-10-01T10:00:00.000Z",
    disabledAt: "2026-10-10T00:00:00.000Z",
    disabledReason: "turned off after 50 failed deliveries in a row",
    consecutiveFailures: 50,
    deliveries24h: 0,
    failures24h: 0,
  };
  const delivery = (id: string, status: string, attempts: number) => ({
    id,
    eventId: `e-${id}`,
    eventType: "call.failed",
    status,
    attempts,
    lastStatus: status === "succeeded" ? 200 : null,
    lastError: status === "pending" ? "connect ECONNREFUSED" : null,
    nextAttemptAt: "2026-10-15T09:00:00.000Z",
    deliveredAt: null,
    createdAt: "2026-10-15T08:00:00.000Z",
    payload: {},
  });

  it("shows why an endpoint is off, each delivery's state, and deletes it after asking", async () => {
    const remove = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get(`*/api/webhooks/${ID}`, () => HttpResponse.json(endpoint)),
      http.get(`*/api/webhooks/${ID}/deliveries`, () =>
        HttpResponse.json({
          total: 2,
          items: [delivery("d1", "succeeded", 1), delivery("d2", "pending", 2)],
        }),
      ),
      http.delete(`*/api/webhooks/${ID}`, remove),
      http.get("*/api/api-keys", () => HttpResponse.json({ items: [] })),
    );
    await renderInRouter(<WebhookPage webhookId={ID} />);

    expect(
      await screen.findByText("turned off after 50 failed deliveries in a row"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send test event" })).toBeDisabled();
    const table = within(await screen.findByRole("table", { name: "Deliveries" }));
    expect(table.getByText("Delivered")).toBeInTheDocument();
    expect(table.getByText("connect ECONNREFUSED")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete endpoint" }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });

  it("says how to see a first delivery when there are none", async () => {
    server.use(
      http.get(`*/api/webhooks/${ID}`, () => HttpResponse.json({ ...endpoint, disabledAt: null })),
      http.get(`*/api/webhooks/${ID}/deliveries`, () => HttpResponse.json({ total: 0, items: [] })),
    );
    await renderInRouter(<WebhookPage webhookId={ID} />);

    expect(await screen.findByText(/No deliveries yet/)).toBeInTheDocument();
  });
});

describe("developers: docs", () => {
  it("documents every scope and the webhook signature check", async () => {
    await renderInRouter(<DocsPage />);

    const scopes = within(screen.getByRole("table", { name: "Scopes" }));
    expect(scopes.getAllByRole("row")).toHaveLength(8);
    expect(screen.getByText("Check the signature (Express)")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument();
  });
});

describe("developers: one key", () => {
  function serveKey() {
    const logQueries: URLSearchParams[] = [];
    const revoke = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get(`*/api/api-keys/${KEY_ID}`, () => HttpResponse.json(key())),
      http.get(`*/api/api-keys/${KEY_ID}/metrics`, () => HttpResponse.json(metrics)),
      http.get(`*/api/api-keys/${KEY_ID}/logs`, ({ request }) => {
        logQueries.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [log(), log({ id: 2, status: 429 })], total: 2 });
      }),
      http.post(`*/api/api-keys/${KEY_ID}/revoke`, revoke),
    );
    return { logQueries, revoke };
  }

  it("sums up traffic, shows use against each limit and the busiest routes", async () => {
    serveKey();
    await renderInRouter(<ApiKeyPage keyId={KEY_ID} />);

    const summary = within(await screen.findByLabelText("Traffic summary"));
    expect(summary.getByText("10.0%")).toBeInTheDocument();
    expect(summary.getByText("210 ms")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Reads: 540 of 600 used" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Busiest routes" })).getByText("GET /calls/:id"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Table" }));
    const perDay = within(screen.getByRole("table", { name: "Requests per day" }));
    const cells = within(perDay.getAllByRole("row")[1]!).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["15 Oct 2026", "90", "3", "6", "1", "210 ms"]);
  });

  it("filters the request log by status and bucket", async () => {
    const { logQueries } = serveKey();
    await renderInRouter(<ApiKeyPage keyId={KEY_ID} />);

    const logTable = within(await screen.findByRole("table", { name: "Request log" }));
    expect(logTable.getAllByText("req-abc")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "429" }));

    await waitFor(() => {
      expect(logQueries.at(-1)?.get("status")).toBe("429");
    });
  });

  it("rotates the key and shows the new secret once", async () => {
    serveKey();
    server.use(
      http.post(`*/api/api-keys/${KEY_ID}/rotate`, () =>
        HttpResponse.json({ key: key({ id: "k2" }), secret: "latte_new_SECRET" }, { status: 201 }),
      ),
    );
    await renderInRouter(<ApiKeyPage keyId={KEY_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Rotate" }));
    await userEvent.click(await screen.findByRole("button", { name: "Rotate key" }));

    expect(await screen.findByRole("textbox", { name: "New API key" })).toHaveValue(
      "latte_new_SECRET",
    );
    expect(screen.getByRole("link", { name: "Open the new key" })).toHaveAttribute(
      "href",
      "/developers/k2",
    );
  });

  it("revokes the key after asking", async () => {
    const { revoke } = serveKey();
    await renderInRouter(<ApiKeyPage keyId={KEY_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    await userEvent.click(await screen.findByRole("button", { name: "Revoke key" }));

    await waitFor(() => {
      expect(revoke).toHaveBeenCalledTimes(1);
    });
  });
});
