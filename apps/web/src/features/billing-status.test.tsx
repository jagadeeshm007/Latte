import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { BillingPage } from "./billing/BillingPage";
import { StatusBanner } from "./status/StatusBanner";
import { StatusPage } from "./status/StatusPage";

// Phase F in the app: usage statements and the status page (ADR-0026).

const prices = { currency: "INR", usdRate: 88, perCall: 5, perAudioMinute: 1, modelMarkupPct: 20 };
const statement = {
  month: "2026-10",
  from: "2026-10-01",
  to: "2026-10-31",
  prices,
  lines: [
    { label: "Calls scored", quantity: 2, unit: "call", unitPrice: 5, amount: 10 },
    { label: "Audio processed", quantity: 3, unit: "minute", unitPrice: 1, amount: 3 },
    {
      label: "Model usage, at cost plus 20%",
      quantity: 0.5,
      unit: "USD",
      unitPrice: 105.6,
      amount: 52.8,
    },
  ],
  total: 65.8,
  byTeam: [{ name: "Mumbai Inbound", calls: 2, audioMinutes: 3, modelCostUsd: 0.5 }],
  byProduct: [],
  byApiKey: [{ name: "In the app", calls: 2, audioMinutes: 3, modelCostUsd: 0.5 }],
};
const day = (uptime: number | null, i: number) => ({
  day: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
  uptime,
});
const status = (over: Record<string, unknown> = {}) => ({
  overall: "degraded",
  checkedAt: "2026-10-18T09:00:00.000Z",
  components: [
    {
      component: "database",
      ok: true,
      latencyMs: 3,
      detail: null,
      history: [day(1, 0), day(null, 1)],
    },
    {
      component: "processing",
      ok: false,
      latencyMs: 5,
      detail: "the oldest queued call has waited 45 minutes",
      history: [day(0.8, 0)],
    },
  ],
  notices: [
    {
      id: "n1111111-1111-4111-8111-111111111111",
      title: "Transcription delayed",
      body: "Calls take longer than usual.",
      severity: "degraded",
      startedAt: "2026-10-18T08:00:00.000Z",
      resolvedAt: null,
    },
  ],
  ...over,
});

describe("billing", () => {
  it("shows the month's statement with its lines and total", async () => {
    server.use(
      http.get("*/api/billing/statement", () => HttpResponse.json(statement)),
      http.get("*/api/billing/prices", () => HttpResponse.json(prices)),
    );
    await renderInRouter(<BillingPage />);

    const lines = within(await screen.findByRole("table", { name: "Statement lines" }));
    expect(lines.getByText("Model usage, at cost plus 20%")).toBeInTheDocument();
    expect(lines.getAllByText("₹65.80")).toHaveLength(1);
    expect(screen.getByRole("table", { name: "Usage by team" })).toHaveTextContent(
      "Mumbai Inbound",
    );
  });

  it("saves a new price list", async () => {
    const saved: unknown[] = [];
    server.use(
      http.get("*/api/billing/statement", () => HttpResponse.json(statement)),
      http.get("*/api/billing/prices", () => HttpResponse.json(prices)),
      http.put("*/api/billing/prices", async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json(prices);
      }),
    );
    await renderInRouter(<BillingPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Prices" }));
    const dialog = within(await screen.findByRole("dialog"));
    const perCall = dialog.getByRole("spinbutton", { name: "Per scored call" });
    await waitFor(() => {
      expect(perCall).toHaveValue(5);
    });
    await userEvent.clear(perCall);
    await userEvent.type(perCall, "7");
    await userEvent.click(dialog.getByRole("button", { name: "Save prices" }));

    await waitFor(() => {
      expect(saved).toEqual([{ ...prices, perCall: 7 }]);
    });
  });

  it("downloads the statement as CSV, and says when a breakdown is empty", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    server.use(
      http.get("*/api/billing/statement", () => HttpResponse.json(statement)),
      http.get("*/api/billing/prices", () => HttpResponse.json(prices)),
    );
    await renderInRouter(<BillingPage />);

    await screen.findByRole("table", { name: "Statement lines" });
    await userEvent.click(screen.getByRole("button", { name: "CSV" }));
    await userEvent.click(screen.getByRole("tab", { name: "By product" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("No calls scored this month.")).toBeInTheDocument();
  });

  it("prints the statement", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    server.use(
      http.get("*/api/billing/statement", () => HttpResponse.json(statement)),
      http.get("*/api/billing/prices", () => HttpResponse.json(prices)),
    );
    await renderInRouter(<BillingPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Print" }));

    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("status page", () => {
  it("shows the overall state, each component and the open incident", async () => {
    server.use(http.get("*/api/status", () => HttpResponse.json(status())));
    await renderInRouter(<StatusPage />);

    expect(await screen.findByText("Some systems are degraded")).toBeInTheDocument();
    expect(screen.getByText("Transcription delayed")).toBeInTheDocument();
    expect(screen.getByText("the oldest queued call has waited 45 minutes")).toBeInTheDocument();
    expect(screen.getByText("100.00% uptime")).toBeInTheDocument();
  });

  it("puts an open incident across the top of the app", async () => {
    server.use(http.get("*/api/status", () => HttpResponse.json(status())));
    await renderInRouter(<StatusBanner />);

    expect(await screen.findByText("Transcription delayed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Status page" })).toHaveAttribute("href", "/status");
  });
});
