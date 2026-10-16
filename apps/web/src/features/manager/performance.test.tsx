import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { csvCell } from "@/lib/download";
import { server } from "@/test/msw";
import { StatefulPerformancePage } from "@/test/performance-page";
import { renderInRouter } from "@/test/render";

import { rangeOf } from "./date-range";

const row = (i: number) => ({
  id: `a${String(i)}`,
  name: `Agent ${String(i)}`,
  callsScored: 10,
  flagged: 1,
  flagRate: 0.1,
  avgOverall: 90 - i,
  breaches: i === 2 ? 3 : 0,
  items: [{ key: "greeting", passRate: 0.5 }],
});

/** Serves 60 agents, 25 a page (100 for the CSV), and records each request's query. */
function serveBoard() {
  const asked: URLSearchParams[] = [];
  server.use(
    http.get("*/api/dashboard/leaderboard", ({ request }) => {
      const p = new URL(request.url).searchParams;
      asked.push(p);
      const limit = Number(p.get("limit"));
      const start = (Number(p.get("page")) - 1) * limit;
      const all = Array.from({ length: 60 }, (_, i) => row(i + 1));
      return HttpResponse.json({
        groupBy: p.get("groupBy"),
        total: p.get("q") ? 1 : 60,
        items: p.get("q") ? [row(7)] : all.slice(start, start + limit),
      });
    }),
    http.get("*/api/rubrics/active", () =>
      HttpResponse.json({
        id: "r",
        version: 2,
        name: "x",
        items: DEFAULT_RUBRIC,
        isActive: true,
        createdAt: "2026-10-01T00:00:00Z",
      }),
    ),
  );
  return asked;
}

describe("performance leaderboard", () => {
  const createObjectURL = vi.fn(() => "blob:x");
  beforeEach(() => {
    createObjectURL.mockClear();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ranks agents a page at a time, numbering across pages", async () => {
    serveBoard();
    await renderInRouter(<StatefulPerformancePage />);

    const table = within(await screen.findByRole("table", { name: "Agents ranked" }));
    expect(table.getAllByRole("row")).toHaveLength(26);
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));

    expect(await screen.findByRole("cell", { name: "26" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agent 26" })).toHaveAttribute("href", "/agents/a26");
  });

  it("sorts on a column header and flips the direction on a second press", async () => {
    const asked = serveBoard();
    await renderInRouter(<StatefulPerformancePage />);
    await screen.findByRole("table", { name: "Agents ranked" });

    await userEvent.click(screen.getByRole("button", { name: "Breaches" }));
    await waitFor(() => {
      expect(asked.at(-1)?.get("sort")).toBe("breaches");
    });
    expect(asked.at(-1)?.get("dir")).toBe("desc");
    await userEvent.click(screen.getByRole("button", { name: "Breaches" }));

    await waitFor(() => {
      expect(asked.at(-1)?.get("dir")).toBe("asc");
    });
    expect(screen.getByRole("columnheader", { name: "Breaches" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("searches by name and switches what is ranked", async () => {
    const asked = serveBoard();
    await renderInRouter(<StatefulPerformancePage />);
    await screen.findByRole("table", { name: "Agents ranked" });

    await userEvent.type(screen.getByRole("searchbox", { name: "Search agents" }), "seven");
    await waitFor(() => {
      expect(asked.at(-1)?.get("q")).toBe("seven");
    });
    await userEvent.click(screen.getByRole("button", { name: "Teams" }));

    await waitFor(() => {
      expect(asked.at(-1)?.get("groupBy")).toBe("team");
    });
    expect(asked.at(-1)?.get("q")).toBeNull();
  });

  it("names each mandatory item's pass rate for screen readers", async () => {
    serveBoard();
    await renderInRouter(<StatefulPerformancePage />);

    const strip = within(await screen.findByRole("list", { name: "Mandatory items, Agent 1" }));

    expect(strip.getByText("Greeting: 50%")).toBeInTheDocument();
  });

  it("downloads every row as CSV, a hundred per request", async () => {
    const asked = serveBoard();
    await renderInRouter(<StatefulPerformancePage />);
    await screen.findByRole("table", { name: "Agents ranked" });
    const before = asked.length;

    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });
    expect(asked.slice(before).map((p) => p.get("limit"))).toEqual(["100"]);
  });

  it("says when nothing matches the search", async () => {
    server.use(
      http.get("*/api/dashboard/leaderboard", () =>
        HttpResponse.json({ groupBy: "agent", total: 0, items: [] }),
      ),
    );
    await renderInRouter(<StatefulPerformancePage initial={{ q: "zzz" }} />);

    expect(await screen.findByText("Nothing matches")).toBeInTheDocument();
  });
});

describe("dashboard helpers", () => {
  it("counts a range back from today, today included", () => {
    expect(rangeOf("7d", new Date("2026-10-16T10:00:00Z"))).toEqual({
      from: "2026-10-10",
      to: "2026-10-16",
    });
  });

  it("quotes CSV cells and defuses spreadsheet formulas", () => {
    expect([csvCell('say "hi", ok'), csvCell("=SUM(A1)"), csvCell(null), csvCell(0.5)]).toEqual([
      '"say ""hi"", ok"',
      "'=SUM(A1)",
      "",
      "0.5",
    ]);
  });
});
