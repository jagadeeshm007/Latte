import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { RouteError } from "./RouteError";

// A tiny router whose index loader fails once and succeeds on retry, so the
// test covers the real errorComponent wiring (loader error, reset,
// invalidate), not a stub. A loader failure is the common case: a route's
// ensureQueryData rejected.
function renderFailingOnce(error: unknown) {
  let attempts = 0;
  const rootRoute = createRootRoute({ errorComponent: RouteError });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    loader: () => {
      attempts += 1;
      if (attempts === 1) {
        throw error;
      }
    },
    component: () => <p>recovered</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

describe("RouteError", () => {
  it("names an ApiError, keeps the home link, and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderFailingOnce(new ApiError("http", 503, "GET /things: 503"));

    expect(await screen.findByRole("alert")).toHaveTextContent("GET /things: 503");
    expect(screen.getByRole("link", { name: "Back to the start" })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("recovered")).toBeInTheDocument();
  });

  it("falls back to a generic message for a non-Error throw", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderFailingOnce({ odd: true });

    expect(await screen.findByRole("alert")).toHaveTextContent("Unexpected error");
  });
});
