import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw";
import { createTestQueryClient } from "@/test/render";

import { App } from "./App";

function renderAt(path: string) {
  return render(
    <App
      queryClient={createTestQueryClient()}
      history={createMemoryHistory({ initialEntries: [path] })}
    />,
  );
}

describe("App", () => {
  it("renders the home route with the health card", async () => {
    server.use(http.get("*/healthz", () => HttpResponse.json({ status: "ok", version: "test" })));

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "API health" })).toBeInTheDocument();
    expect(await screen.findByText("test")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("renders the not-found route for an unknown path", async () => {
    renderAt("/nowhere");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the start" })).toHaveAttribute("href", "/");
  });
});
