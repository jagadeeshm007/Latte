import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { BatchDetailPage } from "./BatchDetailPage";
import { BatchesPage } from "./BatchesPage";

const BATCH_ID = "b1111111-1111-4111-8111-111111111111";
const batch = (over: Record<string, unknown> = {}) => ({
  id: BATCH_ID,
  name: "October leads",
  source: "web",
  createdBy: "u1",
  createdByName: "Priya",
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedAt: null,
  total: 10,
  queued: 2,
  processing: 1,
  scored: 5,
  failed: 2,
  flagged: 3,
  avgScore: 81.25,
  state: "processing",
  ...over,
});
const detail = (over: Record<string, unknown> = {}) => ({
  ...batch(over),
  breaches: 4,
  audioMs: 610_000,
  costUsd: 0.0123,
  lastActivityAt: "2026-10-01T11:00:00.000Z",
});
const me = { id: "u1", email: "u@test", displayName: "Priya", role: "qa_reviewer", agentId: null };

describe("batch list", () => {
  it("lists batches with their progress and filters by state and archive", async () => {
    const asked: URLSearchParams[] = [];
    server.use(
      http.get("*/api/batches", ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [batch({ source: "api" })], total: 1 });
      }),
    );
    await renderInRouter(<BatchesPage />);

    const table = within(await screen.findByRole("table", { name: "Batches" }));
    expect(table.getByRole("link", { name: "October leads" })).toHaveAttribute(
      "href",
      `/batches/${BATCH_ID}`,
    );
    expect(table.getByText("API")).toBeInTheDocument();
    expect(table.getByRole("progressbar", { name: "October leads: 70% done" })).toBeInTheDocument();
    expect(table.getByText("70% · 5 scored, 2 failed, 1 processing, 2 queued")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Has failures" }));
    await userEvent.click(screen.getByRole("button", { name: "Show archived batches" }));

    await waitFor(() => {
      expect(asked.at(-1)?.get("archived")).toBe("true");
    });
    expect(asked.at(-1)?.get("state")).toBe("has_failures");
  });

  it("invites an upload when there are no batches yet", async () => {
    server.use(http.get("*/api/batches", () => HttpResponse.json({ items: [], total: 0 })));
    await renderInRouter(<BatchesPage />);

    expect(await screen.findByText("No batches yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload a batch" })).toHaveAttribute("href", "/upload");
  });
});

describe("batch detail", () => {
  let clicked: string[] = [];
  beforeEach(() => {
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.href);
    });
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me)),
      http.get(`*/api/batches/${BATCH_ID}`, () => HttpResponse.json(detail())),
      http.get("*/api/calls", ({ request }) =>
        HttpResponse.json({
          items: [
            summary({
              originalFilename: `in-${new URL(request.url).searchParams.get("batchId") ?? ""}.wav`,
            }),
          ],
          nextCursor: null,
          total: 1,
        }),
      ),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sums up the batch and lists its calls", async () => {
    await renderInRouter(<BatchDetailPage batchId={BATCH_ID} />);

    const summaryList = within(await screen.findByLabelText("Batch summary"));
    expect(summaryList.getByText("81.3%")).toBeInTheDocument();
    expect(summaryList.getByText("10:10")).toBeInTheDocument();
    expect(summaryList.getByText("$0.0123")).toBeInTheDocument();
    expect(await screen.findByText(`in-${BATCH_ID}.wav`)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in Calls, to filter and group" }),
    ).toHaveAttribute("href", `/calls?batchId=${BATCH_ID}`);
  });

  it("retries the failed calls and renames the batch", async () => {
    const retry = vi.fn(() => HttpResponse.json({ queued: 2 }, { status: 202 }));
    const patches: unknown[] = [];
    server.use(
      http.post(`*/api/batches/${BATCH_ID}/retry-failed`, retry),
      http.patch(`*/api/batches/${BATCH_ID}`, async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(detail({ name: "Renamed" }));
      }),
    );
    await renderInRouter(<BatchDetailPage batchId={BATCH_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Actions for October leads" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Retry failed calls" }));
    await waitFor(() => {
      expect(retry).toHaveBeenCalledTimes(1);
    });
    await userEvent.click(screen.getByRole("button", { name: "Actions for October leads" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const name = await screen.findByRole("textbox", { name: "Batch name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Renamed{Enter}");

    await waitFor(() => {
      expect(patches).toEqual([{ name: "Renamed" }]);
    });
  });

  it("downloads through a short-lived link the API signs", async () => {
    const links: unknown[] = [];
    server.use(
      http.post(`*/api/batches/${BATCH_ID}/export-link`, async ({ request }) => {
        links.push(await request.json());
        return HttpResponse.json({ url: "/api/exports?token=abc", expiresInSeconds: 300 });
      }),
    );
    await renderInRouter(<BatchDetailPage batchId={BATCH_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Download" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Everything, with recordings" }),
    );

    await waitFor(() => {
      expect(clicked).toHaveLength(1);
    });
    expect(clicked[0]).toMatch(/\/api\/exports\?token=abc$/);
    expect(links).toEqual([{ format: "zip", include: ["transcripts", "audio"] }]);
  });

  it("offers only the CSV for a batch too big to zip", async () => {
    server.use(
      http.get(`*/api/batches/${BATCH_ID}`, () => HttpResponse.json(detail({ total: 201 }))),
    );
    await renderInRouter(<BatchDetailPage batchId={BATCH_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Download" }));

    expect(
      await screen.findByRole("menuitem", { name: "Results and transcripts" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("ZIP: up to 200 calls")).toBeInTheDocument();
  });
});
