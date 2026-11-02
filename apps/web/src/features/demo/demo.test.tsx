import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { LandingPage } from "@/features/landing/LandingPage";
import { demoToken } from "@/lib/demo-token";
import { server } from "@/test/msw";
import { createTestQueryClient, renderInRouter } from "@/test/render";

// The public demo (ADR-0033): the button, the demo session and what the
// shell hides from a demo visitor.

const session: {
  state: { status: string; userId?: string; email?: string; demo?: boolean };
  signOut: ReturnType<typeof vi.fn<() => Promise<void>>>;
} = vi.hoisted(() => ({
  state: { status: "signed_out" },
  signOut: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));
vi.mock("@/features/auth/session", () => ({
  useSession: () => session.state,
  signIn: vi.fn(),
  signOut: session.signOut,
  signInWithProvider: vi.fn(),
  signInWithSso: vi.fn(),
}));

const demoMe = {
  id: "v1",
  email: "visitor-v1@demo.invalid",
  displayName: "Demo visitor",
  role: "manager",
  agentId: null,
};

beforeEach(() => {
  session.state = { status: "signed_out" };
  window.sessionStorage.clear();
});

describe("Experience the app", () => {
  it("is not offered while the demo is off or its status cannot be read", async () => {
    await renderInRouter(<LandingPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Experience the app" })).toBeNull();

    server.use(http.get("*/api/demo", () => HttpResponse.json({}, { status: 500 })));
    await renderInRouter(<LandingPage />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Experience the app" })).toBeNull();
    });
  });

  it("starts a demo session with the browser's signals and opens the dashboard", async () => {
    let sent: unknown = null;
    server.use(
      http.get("*/api/demo", () => HttpResponse.json({ enabled: true, uploadsLeftToday: 12 })),
      http.post("*/api/demo/sessions", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          { token: "ldemo_abc", expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          { status: 201 },
        );
      }),
    );
    const { router } = await renderInRouterWithDashboard();

    await userEvent.click(await screen.findByRole("button", { name: "Experience the app" }));

    await waitFor(() => {
      expect(demoToken()).toBe("ldemo_abc");
    });
    const body = sent as { language?: unknown; screen?: unknown };
    expect(typeof body.language).toBe("string");
    expect(body.screen).toMatch(/^\d+x\d+$/);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });

  it("shows the reason when the demo cannot start", async () => {
    server.use(
      http.get("*/api/demo", () => HttpResponse.json({ enabled: true, uploadsLeftToday: 0 })),
      http.post("*/api/demo/sessions", () =>
        HttpResponse.json(
          { error: { code: "rate_limited", message: "too many demo sessions from this network" } },
          { status: 429 },
        ),
      ),
    );
    await renderInRouter(<LandingPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Experience the app" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("too many demo sessions");
    expect(demoToken()).toBeNull();
  });
});

describe("the shell during a demo", () => {
  beforeEach(() => {
    session.state = { status: "signed_in", userId: "demo", email: "", demo: true };
    server.use(
      http.get("*/api/me", () => HttpResponse.json(demoMe)),
      http.get("*/api/reference", () => HttpResponse.json({ agents: [], teams: [], products: [] })),
    );
  });

  it("says it is a demo, offers the way out and hides settings and batches", async () => {
    render(
      <App
        queryClient={createTestQueryClient()}
        history={createMemoryHistory({ initialEntries: ["/upload"] })}
      />,
    );

    expect(await screen.findByText("Demo mode: sample data")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Dashboard");
    for (const hidden of ["Account", "Members", "Billing", "Developers", "Teams", "Batches"]) {
      expect(nav).not.toHaveTextContent(hidden);
    }
    expect(await screen.findByRole("heading", { name: "Upload a transcript" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Recordings" })).toBeNull();

    // One in the banner, one where "Sign out" usually is.
    const exits = screen.getAllByRole("button", { name: "Exit demo" });
    expect(exits).toHaveLength(2);
    await userEvent.click(exits[0]!);
    expect(session.signOut).toHaveBeenCalled();
  });
});

/** The landing page with a dashboard route beside it, so navigation can be observed. */
async function renderInRouterWithDashboard() {
  const { createRootRoute, createRoute, createRouter, RouterProvider, Outlet } =
    await import("@tanstack/react-router");
  const { QueryClientProvider } = await import("@tanstack/react-query");
  const root = createRootRoute({ component: () => <Outlet /> });
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "/", component: LandingPage }),
      createRoute({ getParentRoute: () => root, path: "/dashboard", component: () => <p>dash</p> }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}
