import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { captionsUrl } from "@/lib/captions";
import { callsQuery } from "@/lib/endpoints";
import { detail, summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallsTable } from "./calls/CallsTable";
import { DashboardPage } from "./manager/DashboardPage";

// Remaining states: every call status in the table, filters in the URL,
// captions edge cases, the session store and the product view.

describe("CallsTable states", () => {
  it("renders failed, unscored, reviewed and in-progress calls without an agent column", async () => {
    await renderInRouter(
      <CallsTable
        showAgent={false}
        calls={[
          summary({
            id: "1",
            status: "failed",
            error: "Recording must be stereo",
            overallScore: null,
            judgeStatus: null,
            reviewStatus: null,
            breaches: 0,
            missed: 0,
            durationMs: null,
          }),
          summary({ id: "2", overallScore: null, judgeStatus: "failed", breaches: 2, missed: 0 }),
          summary({ id: "3", reviewStatus: "done", overallScore: 80, breaches: 0, missed: 2 }),
          summary({
            id: "4",
            status: "transcribing",
            overallScore: null,
            judgeStatus: null,
            reviewStatus: null,
            breaches: 0,
            missed: 0,
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Agent" })).not.toBeInTheDocument();
    expect(screen.getByText("Recording must be stereo")).toBeInTheDocument();
    expect(screen.getByText("Unscored")).toBeInTheDocument();
    expect(screen.getByText("2 breaches")).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Transcribing")).toBeInTheDocument();
  });
});

describe("endpoints", () => {
  it("puts every filter in the query string and the key", async () => {
    const seen: string[] = [];
    server.use(
      http.get("*/api/calls", ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );
    const options = callsQuery({ status: "failed", needsReview: true, agentId: "a1" });

    await options.queryFn!({ signal: new AbortController().signal } as never);

    expect(options.queryKey).toEqual([
      "calls",
      "list",
      { status: "failed", needsReview: true, agentId: "a1" },
    ]);
    expect(seen).toEqual(["?status=failed&needsReview=true&agentId=a1"]);
  });
});

describe("captions", () => {
  it("gives a cue at least half a second long, labels the customer and escapes arrows", () => {
    const [segment] = detail().segments;
    const vtt = decodeURIComponent(
      captionsUrl([
        { ...segment!, channel: "customer", startMs: 3_600_000, endMs: 3_600_000, text: "a --> b" },
      ]).split(",")[1]!,
    );

    expect(vtt).toContain("01:00:00.000 --> 01:00:00.500\nCustomer: a -> b");
  });
});

describe("dashboard by product", () => {
  it("switches the grouping and asks the API for products", async () => {
    const asked: string[] = [];
    server.use(
      http.get("*/api/dashboard", ({ request }) => {
        const groupBy = new URL(request.url).searchParams.get("groupBy") ?? "";
        asked.push(groupBy);
        return HttpResponse.json({
          groupBy,
          groups: [
            {
              id: "p",
              name: groupBy === "product" ? "Term Shield" : "Team",
              callsScored: 0,
              flagged: 0,
              flagRate: null,
              avgOverall: null,
              items: [],
            },
          ],
        });
      }),
      http.get("*/api/agreement", () => HttpResponse.json({ items: [] })),
      http.get("*/api/usage", () =>
        HttpResponse.json({ monthStart: "2026-10-01", budgetUsd: 5, spentUsd: 0, byPurpose: [] }),
      ),
      http.get("*/api/rubrics/active", () =>
        HttpResponse.json({ error: { code: "x", message: "no rubric" } }, { status: 503 }),
      ),
    );
    await renderInRouter(<DashboardPage />);

    await userEvent.click(await screen.findByRole("button", { name: "By product" }));

    expect(await screen.findByText("Term Shield")).toBeInTheDocument();
    expect(asked).toContain("product");
  });
});

describe("session store", () => {
  it("follows Supabase auth state and clears the cache on sign out", async () => {
    vi.resetModules();
    let emit: (event: string, session: unknown) => void = () => undefined;
    const signInWithPassword = vi.fn(() =>
      Promise.resolve({ error: { message: "Invalid login credentials" } }),
    );
    const signOut = vi.fn(() => Promise.resolve({ error: null }));
    vi.doMock("@/lib/supabase", () => ({
      supabase: {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: (cb: typeof emit) => {
            emit = cb;
          },
          signInWithPassword,
          signOut,
        },
      },
      accessToken: () => Promise.resolve(null),
    }));
    const { useSession, signIn, signOut: doSignOut } = await import("@/features/auth/session");
    const { queryClient } = await import("@/lib/query-client");
    const clear = vi.spyOn(queryClient, "clear");
    function Probe() {
      const s = useSession();
      return <p>{s.status === "signed_in" ? s.email : s.status}</p>;
    }
    render(<Probe />);

    expect(await screen.findByText("signed_out")).toBeInTheDocument();
    emit("SIGNED_IN", { user: { id: "u1", email: "qa@test" } });
    expect(await screen.findByText("qa@test")).toBeInTheDocument();
    emit("SIGNED_OUT", null);
    await waitFor(() => {
      expect(clear).toHaveBeenCalled();
    });
    expect(await signIn(" qa@test ", "pw")).toBe("Invalid login credentials");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "qa@test", password: "pw" });
    await doSignOut();
    expect(signOut).toHaveBeenCalled();
    vi.doUnmock("@/lib/supabase");
  });
});

describe("more page states", () => {
  it("shows an agent their own calls without the upload action, and polls while a call is processing", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/me", () =>
        HttpResponse.json({
          id: "u",
          email: "a@t",
          displayName: "A",
          role: "agent",
          agentId: "a1",
        }),
      ),
      http.get("*/api/calls", () => {
        calls++;
        return HttpResponse.json({
          items: [summary({ status: calls > 1 ? "scored" : "scoring" })],
          nextCursor: null,
        });
      }),
    );
    const { CallsPage } = await import("./calls/CallsPage");

    await renderInRouter(<CallsPage />);

    expect(await screen.findByText("Your scored calls.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Upload calls" })).not.toBeInTheDocument();
    await waitFor(
      () => {
        expect(calls).toBeGreaterThan(1);
      },
      { timeout: 6000 },
    );
  });

  it("shows a fallback message for an unknown error and a header without a description", async () => {
    const { ErrorState, PageHeader } = await import("@/components/states");

    render(
      <>
        <PageHeader title="Plain" />
        <ErrorState error="boom" />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Plain" })).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });
});
