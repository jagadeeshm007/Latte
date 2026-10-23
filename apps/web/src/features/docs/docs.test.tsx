import { createMemoryHistory } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { isPublicPath } from "@/app/public-paths";
import { server } from "@/test/msw";
import { createTestQueryClient, renderInRouter } from "@/test/render";

import { DocsPage } from "./DocsPage";
import { headingId } from "./heading-id";
import { Markdown } from "./Markdown";

// The public docs (SCC-2-2): static Markdown pages, readable signed out.

const session: { state: { status: string } } = vi.hoisted(() => ({
  state: { status: "signed_out" },
}));
vi.mock("@/features/auth/session", () => ({
  useSession: () => session.state,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const PAGES = [
  { slug: "index", title: "Overview", description: "d", section: "Get started", order: 1 },
  { slug: "webhooks", title: "Webhooks", description: "d", section: "Guides", order: 24 },
];

function serveDocs(pageFetches: string[] = []) {
  server.use(
    http.get("*/docs/pages.json", () => HttpResponse.json(PAGES)),
    http.get("*/docs/:file", ({ params }) => {
      pageFetches.push(String(params.file));
      return new HttpResponse(
        `# ${String(params.file)} page\n\nSee [Webhooks](webhooks.md#headers).\n`,
      );
    }),
  );
}

beforeEach(() => {
  session.state = { status: "signed_out" };
});

describe("Markdown", () => {
  it("renders headings with anchors, tables, lists and code", async () => {
    await renderInRouter(
      <Markdown
        source={
          "# Rate limits\n\n## The calls cursor\n\n- one\n- **two**\n\n| Bucket | Limit |\n| --- | --- |\n| `read` | 600 |\n\n```bash\ncurl /api/me\n```\n"
        }
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Rate limits" })).toHaveAttribute(
      "id",
      "rate-limits",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("id", "the-calls-cursor");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(within(screen.getByRole("table")).getByText("read")).toBeInTheDocument();
    expect(screen.getByText("curl /api/me")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy: bash" })).toBeInTheDocument();
  });

  it("links pages inside the app, opens other sites apart, and follows no unsafe link", async () => {
    await renderInRouter(
      <Markdown
        source={
          "[Hooks](webhooks.md#headers) [Site](https://example.com) [Spec](/openapi.json) [Bad](javascript:alert(1))"
        }
      />,
    );

    expect(screen.getByRole("link", { name: "Hooks" })).toHaveAttribute(
      "href",
      "/docs/webhooks#headers",
    );
    expect(screen.getByRole("link", { name: "Site" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Spec" })).toHaveAttribute("href", "/openapi.json");
    expect(screen.queryByRole("link", { name: "Bad" })).not.toBeInTheDocument();
    expect(screen.getByText("Bad")).toBeInTheDocument();
  });

  it("renders the rest of Markdown: smaller headings, marks, quotes, rules and numbered lists", async () => {
    await renderInRouter(
      <Markdown
        source={
          "### Three\n\n#### Four\n\n*em* ~~gone~~ line  \nbreak [Top](#three) ![Logo](https://example.com/l.png)\n\n> quoted\n\n---\n\n3. third\n4. fourth\n\n- loose\n\n- list\n\n```\nplain\n```\n"
        }
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Three" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Four" })).toBeInTheDocument();
    expect(screen.getByText("em").tagName).toBe("EM");
    expect(screen.getByText("gone").tagName).toBe("DEL");
    expect(document.querySelector("br")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Top" })).toHaveAttribute("href", "#three");
    expect(screen.getByRole("link", { name: "Logo" })).toHaveAttribute("target", "_blank");
    expect(screen.getByText("quoted").closest("blockquote")).not.toBeNull();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(document.querySelector("ol")).toHaveAttribute("start", "3");
    expect(screen.getByRole("button", { name: "Copy: text" })).toBeInTheDocument();
  });

  it("shows raw HTML as text instead of running it", async () => {
    await renderInRouter(<Markdown source={'Hi <img src=x onerror="alert(1)"> there'} />);

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/onerror/)).toBeInTheDocument();
  });

  it("makes the anchors that page links use", () => {
    expect(headingId("Checking the signature")).toBe("checking-the-signature");
    expect(headingId("call.scored")).toBe("call-scored");
  });
});

describe("DocsPage", () => {
  it("shows the sidebar by section, the page and its Markdown source", async () => {
    serveDocs();

    await renderInRouter(<DocsPage slug="webhooks" />, "/docs/webhooks");

    expect(await screen.findByRole("heading", { name: "webhooks.md page" })).toBeInTheDocument();
    const nav = within(screen.getByRole("navigation", { name: "Docs" }));
    expect(nav.getByText("Guides")).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Webhooks" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "View as Markdown" })).toHaveAttribute(
      "href",
      "/docs/webhooks.md",
    );
    expect(document.title).toBe("Webhooks · Latte docs");
  });

  it("answers an unknown page as not found without fetching it", async () => {
    const fetched: string[] = [];
    serveDocs(fetched);

    await renderInRouter(<DocsPage slug="nope" />, "/docs/nope");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(fetched).toEqual([]);
  });

  it("says so when the docs cannot be loaded", async () => {
    server.use(http.get("*/docs/pages.json", () => new HttpResponse(null, { status: 500 })));

    await renderInRouter(<DocsPage slug="index" />);

    expect(await screen.findByText("The docs could not be loaded")).toBeInTheDocument();
  });
});

describe("public pages", () => {
  it("knows which paths need no sign-in", () => {
    expect(["/docs", "/docs/webhooks", "/status", "/developers/docs"].map(isPublicPath)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(["/calls", "/docsx", "/developers"].map(isPublicPath)).toEqual([false, false, false]);
  });

  it("opens the docs signed out, in the public frame", async () => {
    serveDocs();

    render(
      <App
        queryClient={createTestQueryClient()}
        history={createMemoryHistory({ initialEntries: ["/docs"] })}
      />,
    );

    expect(await screen.findByRole("heading", { name: "index.md page" })).toBeInTheDocument();
    const site = within(screen.getByRole("navigation", { name: "Site" }));
    expect(site.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("sends the old in-app docs address to /docs", async () => {
    serveDocs();
    const history = createMemoryHistory({ initialEntries: ["/developers/docs"] });

    render(<App queryClient={createTestQueryClient()} history={history} />);

    expect(await screen.findByRole("heading", { name: "index.md page" })).toBeInTheDocument();
    expect(history.location.pathname).toBe("/docs");
  });
});
