import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { ApiKeyPage } from "./ApiKeyPage";
import { DevelopersPage } from "./DevelopersPage";

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

  it("points to the OpenAPI reference from the quick start", async () => {
    server.use(http.get("*/api/api-keys", () => HttpResponse.json({ items: [] })));
    await renderInRouter(<DevelopersPage />);

    await userEvent.click(await screen.findByRole("tab", { name: "Quick start" }));

    expect(await screen.findByRole("link", { name: /OpenAPI reference/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/api\/openapi\.json$/),
    );
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
