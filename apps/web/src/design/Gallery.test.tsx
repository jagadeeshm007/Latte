import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "@/app/App";
import { createTestQueryClient } from "@/test/render";

import { allScreens, parseGallerySearch } from "./registry";

function renderRoute(path: string) {
  return render(
    <App
      queryClient={createTestQueryClient()}
      history={createMemoryHistory({ initialEntries: [path] })}
    />,
  );
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.variant;
});

// The gallery finds every *.screen.tsx and renders any screen in any state
// inside the real layout; screen-design and design-critique read it.
describe("design gallery", () => {
  it("finds the screen files, sorted by id", () => {
    const ids = allScreens().map((s) => s.id);
    expect(ids).toContain("S-01");
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  });

  it("lists every screen with its states", async () => {
    renderRoute("/__design");
    expect(await screen.findByRole("heading", { name: "Design gallery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "S-01 API health" })).toBeInTheDocument();
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders the chosen state with the state switcher", async () => {
    renderRoute("/__design/S-01?state=error");
    expect(await screen.findByText("GET /healthz: 503")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "S-01 states" })).toBeInTheDocument();
  });

  it("hides the switcher for screenshots and applies the dark theme", async () => {
    renderRoute("/__design/S-01?state=success&chrome=0&theme=dark");
    expect(await screen.findByText("1.2.3")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("applies a design direction as data-variant for its token overrides", async () => {
    renderRoute("/__design/S-01?state=success&variant=2-ledger");
    expect(await screen.findByText("1.2.3")).toBeInTheDocument();
    expect(document.documentElement.dataset.variant).toBe("2-ledger");
  });

  it("says so when the screen is unknown", async () => {
    renderRoute("/__design/S-99");
    expect(await screen.findByRole("alert")).toHaveTextContent("No screen S-99");
  });

  it("keeps only the search keys it knows", () => {
    expect(
      parseGallerySearch({ state: "error", theme: "dark", chrome: "0", variant: "1-quiet", x: 1 }),
    ).toEqual({ state: "error", theme: "dark", chrome: "0", variant: "1-quiet" });
    expect(parseGallerySearch({ theme: "blue", chrome: 1, variant: "../evil" })).toEqual({
      state: undefined,
      theme: undefined,
      chrome: undefined,
      variant: undefined,
    });
  });
});
