import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { AlertsPage } from "@/features/alerts/AlertsPage";
import { server } from "@/test/msw";
import { StatefulPerformancePage } from "@/test/performance-page";
import { renderInRouter } from "@/test/render";

import { NotificationBell } from "./NotificationBell";
import { NotificationsPage } from "./NotificationsPage";

const note = (over: Record<string, unknown> = {}) => ({
  id: "n1111111-1111-4111-8111-111111111111",
  kind: "alert",
  title: "Flag rate jump: Mumbai Inbound",
  body: "Mumbai Inbound's flag rate is 40% over the last 7 days, against 12% before (25 calls).",
  link: "/performance?by=team",
  data: {},
  readAt: null,
  createdAt: "2026-10-16T09:00:00.000Z",
  ...over,
});

describe("inbox", () => {
  it("shows the unread count on the bell", async () => {
    server.use(
      http.get("*/api/notifications/unread-count", () => HttpResponse.json({ unread: 3 })),
    );
    await renderInRouter(<NotificationBell />);

    expect(await screen.findByRole("link", { name: "Notifications, 3 unread" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("lists a finished batch, with its outcome (ADR-0030)", async () => {
    server.use(
      http.get("*/api/notifications", () =>
        HttpResponse.json({
          items: [
            note({
              kind: "batch",
              title: 'Batch "Week 42" finished',
              body: "2 of 3 calls scored; 1 failed and can be retried.",
              link: "/batches/b1",
            }),
          ],
          total: 1,
          unread: 1,
        }),
      ),
      http.get("*/api/digest", () => HttpResponse.json({ frequency: "off" })),
    );

    await renderInRouter(<NotificationsPage />);

    const list = within(await screen.findByRole("list", { name: "Notifications" }));
    expect(list.getByRole("button", { name: /Batch "Week 42" finished/ })).toHaveTextContent(
      "1 failed and can be retried",
    );
  });

  it("marks a notification read when opened, marks all read, and points to the digest setting", async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 204 }));
    const readAll = vi.fn(() => HttpResponse.json({ read: 1 }));
    server.use(
      http.get("*/api/notifications", () =>
        HttpResponse.json({
          items: [
            note(),
            note({
              id: "n2",
              kind: "digest",
              title: "Your weekly digest",
              readAt: "2026-10-16T10:00:00.000Z",
            }),
          ],
          total: 2,
          unread: 1,
        }),
      ),
      http.post("*/api/notifications/:id/read", read),
      http.post("*/api/notifications/read-all", readAll),
    );
    await renderInRouter(<NotificationsPage />);

    const list = within(await screen.findByRole("list", { name: "Notifications" }));
    expect(list.getByText(/Flag rate jump/)).toHaveTextContent("(unread)");
    await userEvent.click(list.getByRole("button", { name: /Flag rate jump/ }));
    await userEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() => {
      expect(readAll).toHaveBeenCalledTimes(1);
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings?tab=notifications",
    );
    expect(readAll).toHaveBeenCalledTimes(1);
  });

  it("says when there is nothing unread", async () => {
    server.use(
      http.get("*/api/notifications", () => HttpResponse.json({ items: [], total: 0, unread: 0 })),
    );
    await renderInRouter(<NotificationsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Unread" }));

    expect(await screen.findByText("All caught up")).toBeInTheDocument();
  });
});

describe("saved views", () => {
  it("saves the current filters under a name and applies a shared view", async () => {
    const saved: unknown[] = [];
    const asked: URLSearchParams[] = [];
    server.use(
      http.get("*/api/dashboard/leaderboard", ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return HttpResponse.json({ groupBy: "agent", total: 0, items: [] });
      }),
      http.get("*/api/rubrics/active", () =>
        HttpResponse.json({
          id: "r",
          version: 1,
          name: "x",
          items: DEFAULT_RUBRIC,
          isActive: true,
          createdAt: "2026-10-01T00:00:00Z",
        }),
      ),
      http.get("*/api/saved-views", () =>
        HttpResponse.json({
          items: [
            {
              id: "v1",
              page: "performance",
              name: "Teams by flag rate",
              search: { by: "team", sort: "flagRate", dir: "desc", bogus: "x" },
              shared: true,
              ownerId: "u2",
              ownerName: "Mira",
              mine: false,
              updatedAt: "2026-10-01T00:00:00.000Z",
            },
          ],
        }),
      ),
      http.post("*/api/saved-views", async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await renderInRouter(<StatefulPerformancePage initial={{ by: "product", range: "90d" }} />);

    await userEvent.click(await screen.findByRole("button", { name: "Views" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Teams by flag rate/ }));
    await waitFor(() => {
      expect(asked.at(-1)?.get("groupBy")).toBe("team");
    });
    expect(asked.at(-1)?.get("sort")).toBe("flagRate");
    await userEvent.click(screen.getByRole("button", { name: "Views" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Save current view" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Mine");
    await userEvent.click(dialog.getByRole("switch", { name: "Share with the team" }));
    await userEvent.click(dialog.getByRole("button", { name: "Save view" }));

    await waitFor(() => {
      expect(saved).toEqual([
        {
          page: "performance",
          name: "Mine",
          search: { by: "team", sort: "flagRate", dir: "desc" },
          shared: true,
        },
      ]);
    });
  });
});

describe("alerts page", () => {
  it("creates a rule, pauses one and shows recent firings", async () => {
    const created: unknown[] = [];
    const updated: unknown[] = [];
    const rule = {
      id: "a1111111-1111-4111-8111-111111111111",
      name: "Flag rate jump",
      metric: "flag_rate",
      scope: "team",
      itemKey: null,
      thresholdPoints: 15,
      windowDays: 7,
      baselineDays: 28,
      minCalls: 5,
      cooldownHours: 24,
      enabled: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      lastEvaluatedAt: null,
      firings30d: 2,
    };
    server.use(
      http.get("*/api/alert-rules", () => HttpResponse.json({ items: [rule] })),
      http.get("*/api/alert-firings", () =>
        HttpResponse.json({
          items: [
            {
              id: "f1",
              ruleId: rule.id,
              ruleName: "Flag rate jump",
              groupId: "t1",
              groupName: "Mumbai Inbound",
              value: 40,
              baseline: 12,
              calls: 25,
              firedAt: "2026-10-16T09:00:00.000Z",
            },
          ],
        }),
      ),
      http.get("*/api/rubrics/active", () =>
        HttpResponse.json({
          id: "r",
          version: 1,
          name: "x",
          items: DEFAULT_RUBRIC,
          isActive: true,
          createdAt: "2026-10-01T00:00:00Z",
        }),
      ),
      http.post("*/api/alert-rules", async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json(rule, { status: 201 });
      }),
      http.put(`*/api/alert-rules/${rule.id}`, async ({ request }) => {
        updated.push(await request.json());
        return HttpResponse.json(rule);
      }),
    );
    await renderInRouter(<AlertsPage />);

    expect(await screen.findByText("Mumbai Inbound")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: "Flag rate jump on" }));
    await userEvent.click(screen.getByRole("button", { name: "New rule" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Score drop");
    await userEvent.click(dialog.getByRole("combobox", { name: "Metric" }));
    await userEvent.click(await screen.findByRole("option", { name: "Average score falls" }));
    await userEvent.click(dialog.getByRole("button", { name: "Create rule" }));

    await waitFor(() => {
      expect(created).toEqual([
        expect.objectContaining({ name: "Score drop", metric: "avg_score", itemKey: null }),
      ]);
    });
    expect(updated).toEqual([expect.objectContaining({ enabled: false })]);
  });
});

describe("alerts page states", () => {
  const rubric = () =>
    HttpResponse.json({
      id: "r",
      version: 1,
      name: "x",
      items: DEFAULT_RUBRIC,
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
    });

  it("suggests a first rule when there are none", async () => {
    server.use(
      http.get("*/api/alert-rules", () => HttpResponse.json({ items: [] })),
      http.get("*/api/alert-firings", () => HttpResponse.json({ items: [] })),
    );
    await renderInRouter(<AlertsPage />);

    expect(await screen.findByText("No alert rules yet")).toBeInTheDocument();
    expect(screen.getByText("No rule has fired yet.")).toBeInTheDocument();
  });

  it("edits a rule into an item fail rate, and deletes one", async () => {
    const id = "a2222222-2222-4222-8222-222222222222";
    const saved: unknown[] = [];
    const remove = vi.fn(() => new HttpResponse(null, { status: 204 }));
    const rule = {
      id,
      name: "Score drop",
      metric: "avg_score",
      scope: "agent",
      itemKey: null,
      thresholdPoints: 10,
      windowDays: 7,
      baselineDays: 28,
      minCalls: 5,
      cooldownHours: 24,
      enabled: false,
      createdAt: "2026-10-01T00:00:00.000Z",
      lastEvaluatedAt: null,
      firings30d: 0,
    };
    server.use(
      http.get("*/api/alert-rules", () => HttpResponse.json({ items: [rule] })),
      http.get("*/api/alert-firings", () => HttpResponse.json({ items: [] })),
      http.get("*/api/rubrics/active", rubric),
      http.put(`*/api/alert-rules/${id}`, async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json(rule);
      }),
      http.delete(`*/api/alert-rules/${id}`, remove),
    );
    await renderInRouter(<AlertsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit Score drop" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("combobox", { name: "Metric" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Rubric item fail rate rises" }),
    );
    expect(dialog.getByRole("combobox", { name: "Rubric item" })).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Save rule" }));
    await waitFor(() => {
      expect(saved).toEqual([
        expect.objectContaining({
          metric: "item_fail_rate",
          itemKey: DEFAULT_RUBRIC[0]!.key,
          scope: "agent",
        }),
      ]);
    });
    await userEvent.click(screen.getByRole("button", { name: "Delete Score drop" }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
