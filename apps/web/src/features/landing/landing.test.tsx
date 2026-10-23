import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { safeNext } from "@/app/public-paths";
import { DocsPage } from "@/features/docs/DocsPage";
import { server } from "@/test/msw";
import { createTestQueryClient, renderInRouter } from "@/test/render";

import { LandingPage } from "./LandingPage";

// SCC-2-5: the landing page, signing in with a return address, and the legal pages.

const session: { state: { status: string; userId?: string; email?: string } } = vi.hoisted(() => ({
  state: { status: "signed_out" },
}));
vi.mock("@/features/auth/session", () => ({
  useSession: () => session.state,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signInWithProvider: vi.fn(),
  signInWithSso: vi.fn(),
}));

beforeEach(() => {
  session.state = { status: "signed_out" };
});

describe("safeNext", () => {
  it("keeps a path on this site and refuses anything that leaves it or loops", () => {
    expect(safeNext("/calls?flag=flagged")).toBe("/calls?flag=flagged");
    expect(
      [
        undefined,
        "",
        "https://evil.example",
        "//evil.example",
        "/\\evil.example",
        "/sign-in",
        "/sign-in?next=/x",
      ].map(safeNext),
    ).toEqual(["/", "/", "/", "/", "/", "/", "/"]);
  });
});

describe("landing page", () => {
  it("offers sign-in, the docs and the source, and links the privacy pages", async () => {
    await renderInRouter(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every sales call checked");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Read the docs" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "View on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/jagadeeshm007/Latte",
    );
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.getByText(/Hindi, Bengali, Tamil/)).toBeInTheDocument();
    expect(document.title).toBe("Latte · Sales call compliance and coaching");
  });

  it("has every legal page in the footer of a public page", async () => {
    render(
      <App
        queryClient={createTestQueryClient()}
        history={createMemoryHistory({ initialEntries: ["/"] })}
      />,
    );

    const footer = within(await screen.findByRole("navigation", { name: "Footer" }));
    expect(
      ["Terms", "Privacy", "Cookies", "Subprocessors", "Open-source licences"].map((name) =>
        footer.getByRole("link", { name }).getAttribute("href"),
      ),
    ).toEqual([
      "/legal/terms",
      "/legal/privacy",
      "/legal/cookies",
      "/legal/subprocessors",
      "/legal/licenses",
    ]);
    expect(screen.getByText(/© 2026 Jagadeesh Mandala/)).toBeInTheDocument();
  });
});

describe("signing in", () => {
  it("sends a signed-in visitor on to the page they were going to", async () => {
    session.state = { status: "signed_in", userId: "u1", email: "m@test" };
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({
          id: "u1",
          email: "m@test",
          displayName: "M",
          role: "manager",
          agentId: null,
        }),
      ),
    );
    const history = createMemoryHistory({
      initialEntries: ["/sign-in?next=%2Fsettings%3Ftab%3Dsecurity"],
    });

    render(<App queryClient={createTestQueryClient()} history={history} />);

    await waitFor(() => {
      expect(history.location.pathname).toBe("/settings");
    });
    expect(history.location.search).toBe("?tab=security");
  });

  it("goes home instead when the return address points elsewhere", async () => {
    session.state = { status: "signed_in", userId: "u1", email: "m@test" };
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({
          id: "u1",
          email: "m@test",
          displayName: "M",
          role: "qa_reviewer",
          agentId: null,
        }),
      ),
      http.get("*/api/review/queue", () => HttpResponse.json({ items: [] })),
    );
    const history = createMemoryHistory({
      initialEntries: ["/sign-in?next=https%3A%2F%2Fevil.example"],
    });

    render(<App queryClient={createTestQueryClient()} history={history} />);

    await waitFor(() => {
      expect(history.location.pathname).toBe("/queue");
    });
  });
});

describe("legal pages", () => {
  it("shows a legal page with links that stay among the legal pages", async () => {
    server.use(
      http.get("*/legal/pages.json", () =>
        HttpResponse.json([
          { slug: "terms", title: "Terms of use", description: "d", section: "Legal", order: 1 },
          {
            slug: "privacy",
            title: "Privacy policy",
            description: "d",
            section: "Legal",
            order: 2,
          },
        ]),
      ),
      http.get(
        "*/legal/:file",
        () => new HttpResponse("# Terms of use\n\nSee the [Privacy policy](privacy.md).\n"),
      ),
    );

    await renderInRouter(<DocsPage folder="legal" slug="terms" />, "/legal/terms");

    expect(
      await screen.findByRole("heading", { name: "Terms of use", level: 1 }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("article")).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("navigation", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View as Markdown" })).toHaveAttribute(
      "href",
      "/legal/terms.md",
    );
    expect(screen.queryByRole("link", { name: "llms.txt" })).not.toBeInTheDocument();
    expect(document.title).toBe("Terms of use · Latte");
  });
});
