import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { SignInPage } from "@/features/auth/SignInPage";
import { detail, scorecard, summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { createTestQueryClient } from "@/test/render";

// The shell: the sign-in gate, the role-specific menu and home, and routing.

interface MockSession {
  status: string;
  userId?: string;
  email?: string;
}

const session: {
  state: MockSession;
  signIn: ReturnType<typeof vi.fn<(email: string, password: string) => Promise<string | null>>>;
  signOut: ReturnType<typeof vi.fn<() => Promise<void>>>;
} = vi.hoisted(() => ({
  state: { status: "signed_in", userId: "u1", email: "u@test" },
  signIn: vi.fn<(email: string, password: string) => Promise<string | null>>(),
  signOut: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("@/features/auth/session", () => ({
  useSession: () => session.state,
  signIn: session.signIn,
  signOut: session.signOut,
}));

const me = (role: "qa_reviewer" | "agent" | "manager") => ({
  id: "u1",
  email: "u@test",
  displayName: "Test User",
  role,
  agentId: role === "agent" ? "a1" : null,
});

function renderApp(path: string) {
  return render(
    <App
      queryClient={createTestQueryClient()}
      history={createMemoryHistory({ initialEntries: [path] })}
    />,
  );
}

beforeEach(() => {
  session.state = { status: "signed_in", userId: "u1", email: "u@test" };
  server.use(
    http.get("*/api/calls", () => HttpResponse.json({ items: [summary()], nextCursor: null })),
    http.get("*/api/review/queue", () => HttpResponse.json({ items: [summary()] })),
    http.get("*/api/scorecard/:id", () => HttpResponse.json(scorecard())),
    http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
  );
});

describe("sign-in gate (US-00-003)", () => {
  it("shows the sign-in page when signed out", async () => {
    session.state = { status: "signed_out" };

    renderApp("/");

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows any other sign-in error as given, and nothing on success", async () => {
    session.signIn.mockResolvedValueOnce("Email not confirmed").mockResolvedValueOnce(null);
    render(<SignInPage />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email not confirmed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.queryByText("Email not confirmed")).not.toBeInTheDocument();
    });
  });

  it("shows a readable error for wrong credentials", async () => {
    session.signIn.mockResolvedValue("Invalid login credentials");
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Email"), "qa@salescall.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("That email and password do not match.")).toBeInTheDocument();
    expect(session.signIn).toHaveBeenCalledWith("qa@salescall.test", "wrong");
  });

  it("explains an account with no role and offers sign out", async () => {
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json(
          { error: { code: "forbidden", message: "this account has no role yet" } },
          { status: 403 },
        ),
      ),
    );

    renderApp("/");

    expect(await screen.findByText("this account has no role yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(session.signOut).toHaveBeenCalled();
  });
});

describe("role homes and menus", () => {
  it("sends a QA reviewer to the review queue and shows QA links only", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("qa_reviewer"))));

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload calls" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("sends an agent to their scorecard with no upload link", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("agent"))));

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "My scorecard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Upload calls" })).not.toBeInTheDocument();
  });

  it("sends a manager to the dashboard", async () => {
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("manager"))),
      http.get("*/api/dashboard", () => HttpResponse.json({ groupBy: "team", groups: [] })),
      http.get("*/api/agreement", () => HttpResponse.json({ items: [] })),
      http.get("*/api/usage", () =>
        HttpResponse.json({ monthStart: "2026-10-01", budgetUsd: 5, spentUsd: 0, byPurpose: [] }),
      ),
    );

    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("opens a call by URL and another agent's scorecard for a manager", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("manager"))));

    renderApp("/calls/11111111-1111-4111-8111-111111111111");
    expect(await screen.findByRole("heading", { name: "call-01.wav" })).toBeInTheDocument();
  });

  it("shows another agent's scorecard by URL", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("manager"))));

    renderApp("/agents/a1");

    expect(
      await screen.findByRole("heading", { name: "Ravi Kumar's scorecard" }),
    ).toBeInTheDocument();
  });

  it("answers an unknown path with not found", async () => {
    server.use(http.get("*/api/me", () => HttpResponse.json(me("manager"))));

    renderApp("/nowhere");

    await waitFor(() => {
      expect(screen.getByText("Page not found")).toBeInTheDocument();
    });
  });
});
