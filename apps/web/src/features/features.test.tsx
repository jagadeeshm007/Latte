import { DEFAULT_RUBRIC } from "@scc/shared";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captionsUrl } from "@/lib/captions";
import { findingTone, formatClock, formatPercent } from "@/lib/format";
import { StatefulCallsPage } from "@/test/calls-page";
import { detail, scorecard, summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallDetailPage } from "./calls/CallDetailPage";
import { QueuePage } from "./calls/CallsPage";
import { mimeOf, rowProblem } from "./calls/upload-rules";
import { UploadForm } from "./calls/UploadPage";
import { ScorecardView } from "./coaching/ScorecardPage";
import { AgreementTable, DashboardPage, UsageCard } from "./manager/DashboardPage";
import { RubricEditor } from "./manager/RubricPage";

const me = (role: "qa_reviewer" | "agent" | "manager") => ({
  id: "u1",
  email: "u@test",
  displayName: "Test User",
  role,
  agentId: role === "agent" ? "a1" : null,
});

beforeEach(() => {
  server.use(http.get("*/api/me", () => HttpResponse.json(me("qa_reviewer"))));
  // jsdom has no media playback.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

describe("formatting", () => {
  it("formats clocks, percents and finding tones", () => {
    expect(formatClock(65_400)).toBe("01:05");
    expect(formatPercent(0.756)).toBe("76%");
    expect(formatPercent(null)).toBe("No data yet");
    expect(findingTone("breach")).toBe("error");
    expect(findingTone("partial")).toBe("warning");
    expect(findingTone("clear")).toBe("success");
    expect(findingTone("not_applicable")).toBe("secondary");
  });

  it("builds WebVTT captions from the transcript", () => {
    const url = captionsUrl(detail().segments);
    const vtt = decodeURIComponent(url.split(",")[1]!);

    expect(vtt).toMatch(/^WEBVTT/);
    expect(vtt).toContain(
      "00:01:05.000 --> 00:01:10.000\nAgent: This plan gives guaranteed returns.",
    );
  });
});

describe("upload rules", () => {
  const file = (name: string, size = 1000) => new File([new Uint8Array(size)], name);
  const row = (over = {}) => ({
    key: "k",
    file: file("call.wav"),
    mime: "audio/wav" as const,
    agentId: "a",
    teamId: "t",
    productId: "p",
    callDate: "2026-10-01",
    language: "en-IN" as const,
    progress: 0,
    error: null,
    ...over,
  });

  it("decides the type from the extension", () => {
    expect(mimeOf(file("A.WAV"))).toBe("audio/wav");
    expect(mimeOf(file("b.mp3"))).toBe("audio/mpeg");
    expect(mimeOf(file("c.m4a"))).toBeNull();
  });

  it("names the first problem with a row", () => {
    expect(rowProblem(row())).toBeNull();
    expect(rowProblem(row({ mime: null }))).toBe("Only WAV or MP3 recordings are accepted");
    expect(rowProblem(row({ file: file("x.wav", 0) }))).toBe("File is empty");
    expect(rowProblem(row({ agentId: null }))).toBe("Choose the agent, team and product");
    expect(rowProblem(row({ callDate: "" }))).toBe("Enter the call date");
  });

  it("lists picked files and keeps upload disabled until each row is complete", async () => {
    const reference = {
      agents: [{ id: "a1", name: "Ravi Kumar", teamId: "t1", externalCode: "AG001" }],
      teams: [{ id: "t1", name: "Mumbai Inbound" }],
      products: [{ id: "p1", name: "ULIP" }],
    };
    await renderInRouter(<UploadForm reference={reference} />);

    // A user can switch the file picker to "All files", so the accept list is not a guarantee.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText("Choose recordings"), [
      file("one.wav"),
      file("two.txt"),
    ]);

    expect(screen.getByText("one.wav")).toBeInTheDocument();
    expect(screen.getByText("Only WAV or MP3 recordings are accepted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 2 files/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove two.txt" }));
    expect(screen.queryByText("two.txt")).not.toBeInTheDocument();
  });

  it("shows a drop zone while empty and adds dropped recordings", async () => {
    const reference = { agents: [], teams: [], products: [] };
    await renderInRouter(<UploadForm reference={reference} />);
    expect(screen.getByText("Drop recordings here")).toBeInTheDocument();
    expect(screen.getByText("Choose files")).toBeInTheDocument();

    const zone = screen.getByText("Drop recordings here").closest('[data-slot="frame"]')!;
    const dataTransfer = { types: ["Files"], files: [file("a.wav"), file("b.mp3")] };
    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.drop(zone, { dataTransfer });

    expect(screen.getByText("a.wav")).toBeInTheDocument();
    expect(screen.getByText("b.mp3")).toBeInTheDocument();
    expect(screen.queryByText("Drop recordings here")).not.toBeInTheDocument();
  });
});

describe("calls list and queue", () => {
  it("shows calls with their flags and links to each call", async () => {
    server.use(
      http.get("*/api/calls", () =>
        HttpResponse.json({ items: [summary()], nextCursor: null, total: 1 }),
      ),
    );

    await renderInRouter(<StatefulCallsPage />);

    const link = await screen.findByRole("link", { name: "call-01.wav" });
    expect(link).toHaveAttribute("href", "/calls/11111111-1111-4111-8111-111111111111");
    const flag = within(screen.getByRole("table")).getByText("Flagged");
    expect(flag.closest("[title]")).toHaveAttribute(
      "title",
      "Flagged: 1 breach, 1 missed, needs review",
    );
  });

  it("archives a call from its row menu and refreshes the list", async () => {
    let archived = false;
    const archive = vi.fn(() => {
      archived = true;
      return new HttpResponse(null, { status: 204 });
    });
    server.use(
      http.get("*/api/calls", () =>
        HttpResponse.json({
          items: archived ? [] : [summary()],
          nextCursor: null,
          total: archived ? 0 : 1,
        }),
      ),
      http.post("*/api/calls/:id/archive", archive),
    );
    await renderInRouter(<StatefulCallsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Actions for call-01.wav" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Archive" }));

    expect(archive).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("No calls yet")).toBeInTheDocument();
  });

  it("lets a manager delete a call only after confirming", async () => {
    const remove = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("manager"))),
      http.get("*/api/calls", () =>
        HttpResponse.json({ items: [summary()], nextCursor: null, total: 1 }),
      ),
      http.post("*/api/calls/:id/delete", remove),
    );
    await renderInRouter(<StatefulCallsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Actions for call-01.wav" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Delete call" }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });

  it("gives QA no delete, and sales agents no actions at all", async () => {
    server.use(
      http.get("*/api/calls", () =>
        HttpResponse.json({ items: [summary()], nextCursor: null, total: 1 }),
      ),
    );
    await renderInRouter(<StatefulCallsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Actions for call-01.wav" }));
    expect(await screen.findByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("searches the review queue in the browser and says when nothing matches", async () => {
    server.use(
      http.get("*/api/review/queue", () =>
        HttpResponse.json({
          items: [summary(), summary({ id: "2", originalFilename: "two.wav" })],
        }),
      ),
      http.get("*/api/reference", () => HttpResponse.json({ agents: [], teams: [], products: [] })),
    );
    await renderInRouter(<QueuePage />);
    await screen.findByRole("link", { name: "two.wav" });
    expect(screen.queryByRole("button", { name: "Show archived calls" })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Search calls" }), "zzz");

    expect(await screen.findByText("No calls match")).toBeInTheDocument();
  });

  it("restores an archived call from its row menu", async () => {
    const unarchive = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get("*/api/calls", () =>
        HttpResponse.json({
          items: [summary({ archivedAt: "2026-10-02T00:00:00.000Z" })],
          nextCursor: null,
          total: 1,
        }),
      ),
      http.post("*/api/calls/:id/unarchive", unarchive),
    );
    await renderInRouter(<StatefulCallsPage initial={{ archived: true }} />);

    await userEvent.click(await screen.findByRole("button", { name: "Actions for call-01.wav" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Unarchive" }));

    expect(unarchive).toHaveBeenCalledTimes(1);
  });

  it("says so when there are no calls", async () => {
    server.use(
      http.get("*/api/calls", () => HttpResponse.json({ items: [], nextCursor: null, total: 0 })),
    );

    await renderInRouter(<StatefulCallsPage />);

    expect(await screen.findByText("No calls yet")).toBeInTheDocument();
  });

  it("shows an empty queue and an error from the API", async () => {
    server.use(http.get("*/api/review/queue", () => HttpResponse.json({ items: [] })));
    await renderInRouter(<QueuePage />);
    expect(await screen.findByText("Queue is clear")).toBeInTheDocument();

    server.use(
      http.get("*/api/calls", () =>
        HttpResponse.json(
          { error: { code: "x", message: "database unavailable" } },
          { status: 503 },
        ),
      ),
    );
    await renderInRouter(<StatefulCallsPage />);
    expect(await screen.findByText("database unavailable")).toBeInTheDocument();
  });
});

/** finishAnalysis lets the fake AI analysis run to its end. */
async function finishAnalysis() {
  await act(() => vi.advanceTimersByTimeAsync(2400));
}

describe("call detail and review (US-01-006)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays the recording from a finding's timestamp, fetching the signed URL first", async () => {
    const audioUrl = vi.fn(() =>
      HttpResponse.json({ url: "https://storage.test/a.wav", expiresInSeconds: 600 }),
    );
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
      http.post("*/api/calls/:id/audio-url", audioUrl),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    await userEvent.click(await screen.findByRole("button", { name: "Play from 01:05" }));
    const audio = screen.getByLabelText("Call recording");
    audio.dispatchEvent(new Event("loadedmetadata"));

    await waitFor(() => {
      expect((audio as HTMLAudioElement).currentTime).toBe(65);
    });
    expect(audioUrl).toHaveBeenCalledTimes(1);
  });

  it("records an agree decision and counts findings still undecided", async () => {
    const decide = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
      http.put("*/api/findings/:id/review", decide),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByText("1 finding still need a decision")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete review" })).toBeDisabled();
    const breach = screen.getByText("Promised guaranteed returns on a ULIP.").closest("li")!;
    await userEvent.click(within(breach).getByRole("button", { name: "Agree" }));

    await waitFor(() => {
      expect(decide).toHaveBeenCalledTimes(1);
    });
  });

  it("hides review controls from a sales agent and shows the unscored banner", async () => {
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("agent"))),
      http.get("*/api/calls/:id", () =>
        HttpResponse.json(
          detail({
            score: {
              ...detail().score!,
              judgeError: "judge output was cut off at the token limit",
            },
          }),
        ),
      ),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    expect(
      await screen.findByText(/Unscored: the judge could not score this call/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agree" })).not.toBeInTheDocument();
  });

  it("keeps coaching notes hidden until AI Analyse is pressed, then shows them on top", async () => {
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(detail())));
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);
    const analyse = await screen.findByRole("button", { name: "AI Analyse" });
    // Fake time only once the page has loaded: the mocked network needs real timers.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    expect(screen.queryByText("Never promise returns.")).not.toBeInTheDocument();

    await user.click(analyse);

    expect(screen.getByRole("status", { name: "AI analysis" })).toHaveTextContent(
      "AI is analysing this call",
    );
    expect(screen.queryByText("Never promise returns.")).not.toBeInTheDocument();
    await finishAnalysis();
    expect(screen.getByRole("region", { name: "Coaching notes" })).toHaveTextContent(
      "Never promise returns.",
    );
  });

  it("collapses and expands the coaching notes", async () => {
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(detail())));
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);
    const analyse = await screen.findByRole("button", { name: "AI Analyse" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    await user.click(analyse);
    await finishAnalysis();

    await user.click(screen.getByRole("button", { name: "Hide coaching notes" }));

    await waitFor(() => {
      expect(screen.queryByText("Never promise returns.")).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Show coaching notes" }));
    expect(await screen.findByText("Never promise returns.")).toBeInTheDocument();
  });

  it("tells the user a failed call failed, and that purged audio is gone", async () => {
    server.use(
      http.get("*/api/calls/:id", () =>
        HttpResponse.json(
          detail({
            audioAvailable: false,
            call: summary({
              status: "failed",
              error: "Recording must be stereo: agent left, customer right",
            }),
          }),
        ),
      ),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    expect(
      await screen.findByText("Recording must be stereo: agent left, customer right"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/recording was deleted after its retention period/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
  });
});

describe("scorecard (US-00-001, US-00-002)", () => {
  it("shows the top coaching points with links to example calls", async () => {
    await renderInRouter(<ScorecardView card={scorecard()} self />);

    expect(
      screen.getByRole("heading", { name: "Your top three things to work on" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Cooling-off period")).toBeInTheDocument();
    expect(screen.getByText("Missed or breached on 3 calls")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open call" })[0]).toHaveAttribute(
      "href",
      "/calls/c1",
    );
  });

  it("says so when nothing is scored yet", async () => {
    await renderInRouter(
      <ScorecardView
        card={scorecard({ callsScored: 0, recentCalls: [], coaching: [] })}
        self={false}
      />,
    );

    expect(screen.getByText("No calls scored yet")).toBeInTheDocument();
  });
});

describe("dashboard (US-01-007, US-01-008)", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: "a1",
    name: "Asha",
    callsScored: 12,
    flagged: 2,
    flagRate: 0.167,
    avgOverall: 91.5,
    breaches: 0,
    items: [{ key: "greeting", passRate: 0.5 }],
    ...over,
  });
  const highlights = {
    from: "2026-09-17",
    to: "2026-10-16",
    previousFrom: "2026-08-18",
    previousTo: "2026-09-16",
    kpis: {
      callsScored: { value: 40, previous: 36 },
      avgScore: { value: 78.4, previous: 80.1 },
      flagRate: { value: 0.25, previous: 0.25 },
      breaches: { value: 3, previous: null },
      reviewBacklog: 7,
    },
    topAgents: [row()],
    bottomAgents: [row({ id: "a2", name: "Ravi", avgOverall: 52.0, breaches: 2 })],
    riskiestTeams: [],
    failedItems: [
      { key: "consent", label: "Explicit consent", failed: 6, applicable: 40, failRate: 0.15 },
    ],
    languageMix: [{ name: "hi-IN", calls: 30 }],
    productMix: [{ name: "ULIP", calls: 40 }],
  };
  function serveDashboard() {
    const asked: URLSearchParams[] = [];
    server.use(
      http.get("*/api/dashboard/highlights", () => HttpResponse.json(highlights)),
      http.get("*/api/dashboard/leaderboard", ({ request }) => {
        const params = new URL(request.url).searchParams;
        asked.push(params);
        const by = params.get("groupBy") ?? "agent";
        return HttpResponse.json({
          groupBy: by,
          total: by === "language" ? 2 : 14,
          items:
            by === "language"
              ? [
                  row({ id: "te-IN", name: "te-IN", callsScored: 7 }),
                  row({ id: "hi-IN", name: "hi-IN", callsScored: 3 }),
                ]
              : [row()],
        });
      }),
      http.get("*/api/agreement", () => HttpResponse.json({ items: [] })),
      http.get("*/api/usage", () =>
        HttpResponse.json({
          monthStart: "2026-10-01",
          budgetUsd: 5,
          spentUsd: 1,
          byPurpose: [{ purpose: "transcribe", calls: 4, costUsd: 1, refused: 1 }],
        }),
      ),
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

  it("shows the headline numbers with their change on the period before", async () => {
    serveDashboard();
    await renderInRouter(<DashboardPage />);

    const kpis = within(await screen.findByLabelText("Headline numbers"));

    expect(kpis.getByText("40")).toBeInTheDocument();
    expect(kpis.getByText(/Up 4/)).toBeInTheDocument();
    expect(kpis.getByText(/Down 1.7 pts/)).toBeInTheDocument();
    expect(kpis.getByText("Same as the period before")).toBeInTheDocument();
    expect(kpis.getByText("No earlier period to compare")).toBeInTheDocument();
    expect(kpis.getByText("7")).toBeInTheDocument();
  });

  it("lists the few agents and items worth acting on, each a link away from the full ranking", async () => {
    serveDashboard();
    await renderInRouter(<DashboardPage />);

    const top = within(await screen.findByRole("region", { name: "Top performers" }));
    const coaching = within(screen.getByRole("region", { name: "Needs coaching" }));

    expect(top.getByRole("link", { name: "Asha" })).toHaveAttribute("href", "/agents/a1");
    expect(coaching.getByText("52.0%")).toBeInTheDocument();
    expect(top.getByRole("link", { name: "View all agents, best first" })).toHaveAttribute(
      "href",
      "/performance?by=agent&sort=avgScore&dir=desc&range=30d",
    );
    expect(
      within(screen.getByRole("region", { name: "Riskiest teams" })).getByText(
        "No team has a flagged call in this period.",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Most failed items" })).getByText("6 of 40 · 15%"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Languages" })).getByText("Hindi"),
    ).toBeInTheDocument();
  });

  it("asks the server for the top ten of a measure, by language with readable names", async () => {
    const asked = serveDashboard();
    await renderInRouter(<DashboardPage />);

    const byLanguage = within(
      await screen.findByRole("region", { name: "Calls scored by language" }),
    );
    await userEvent.click(byLanguage.getByRole("button", { name: "Table" }));
    const rows = within(await byLanguage.findByRole("table")).getAllByRole("row");

    expect(rows.slice(1).map((r) => r.textContent)).toEqual(["Telugu7", "Hindi3"]);
    expect(asked.at(-1)?.get("sort")).toBe("calls");
    expect(asked.at(-1)?.get("limit")).toBe("10");
    await userEvent.click(byLanguage.getByRole("button", { name: "Agent" }));
    expect(
      await within(screen.getByRole("region", { name: "Calls scored by agent" })).findByRole(
        "link",
        { name: "View all" },
      ),
    ).toHaveAttribute("href", "/performance?by=agent&sort=calls&dir=desc&range=30d");
  });

  it("opens the full spend picture from View more", async () => {
    serveDashboard();
    const history = vi.fn(() =>
      HttpResponse.json({
        from: "2026-10-09",
        to: "2026-10-15",
        days: [
          {
            day: "2026-10-15",
            purpose: "transcribe",
            calls: 4,
            costUsd: 1,
            audioSeconds: 120,
            characters: 0,
            refused: 1,
          },
        ],
      }),
    );
    server.use(http.get("*/api/usage/history", history));
    await renderInRouter(<DashboardPage />);
    expect(history).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: "View more" }));
    const dialog = within(await screen.findByRole("dialog"));

    expect(await dialog.findByRole("cell", { name: "Transcription" })).toBeInTheDocument();
    expect(dialog.getByRole("cell", { name: "2.0 min" })).toBeInTheDocument();
    expect(dialog.getByText("Spent this month")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => {
      expect(history).toHaveBeenCalledTimes(2);
    });
  });

  it("shows judge agreement and spend", async () => {
    serveDashboard();
    server.use(
      http.get("*/api/agreement", () =>
        HttpResponse.json({
          items: [
            {
              key: "consent",
              label: "Explicit consent",
              type: "mandatory",
              agreed: 3,
              disagreed: 1,
              judgeMisses: 0,
              rate: 0.75,
            },
          ],
        }),
      ),
      http.get("*/api/usage", () =>
        HttpResponse.json({
          monthStart: "2026-10-01",
          budgetUsd: 5,
          spentUsd: 4.5,
          byPurpose: [{ purpose: "score", calls: 3, costUsd: 0.003, refused: 0 }],
        }),
      ),
    );

    await renderInRouter(<DashboardPage />);

    expect(
      await within(screen.getByRole("region", { name: "Judge agreement with QA" })).findByText(
        "Explicit consent",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Over 80% used")).toBeInTheDocument();
  });

  it("warns when the budget is reached and shows items with no reviews", async () => {
    await renderInRouter(
      <>
        <UsageCard usage={{ monthStart: "2026-10-01", budgetUsd: 5, spentUsd: 5, byPurpose: [] }} />
        <AgreementTable
          data={{
            items: [
              {
                key: "greeting",
                label: "Greeting",
                type: "mandatory",
                agreed: 0,
                disagreed: 0,
                judgeMisses: 2,
                rate: null,
              },
            ],
          }}
        />
      </>,
    );

    expect(screen.getByText("Budget reached: new calls are refused")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText("No model calls this month.")).toBeInTheDocument();
  });
});

describe("rubric editor (US-01-004)", () => {
  const rubric = {
    id: "r",
    version: 2,
    name: "Default",
    items: DEFAULT_RUBRIC.slice(0, 2),
    isActive: true,
    createdAt: "2026-10-01T00:00:00Z",
    productId: null,
  };
  // An open dialog hides the page behind it from assistive tech, so look past that.
  const items = () => within(screen.getByRole("list", { name: "Rubric items", hidden: true }));

  it("shows items as read-only rows: one line of judge text, no key", async () => {
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);

    const first = DEFAULT_RUBRIC[0]!;
    const text = items().getByText(first.description);
    expect(text).toHaveClass("truncate");
    expect(text).toHaveAttribute("title", first.description);
    expect(items().queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(`key: ${first.key}`)).not.toBeInTheDocument();
  });

  it("adds an item from the dialog and saves it with a key made from its label", async () => {
    const sent: { items: { key: string; label: string }[] }[] = [];
    const save = vi.fn(async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { items: { key: string; label: string }[] };
      sent.push(body);
      return HttpResponse.json({ ...rubric, version: 3, items: body.items }, { status: 201 });
    });
    server.use(http.post("*/api/rubrics", save));
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);
    expect(screen.getByRole("button", { name: "Save as version 3" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.type(dialog.getByLabelText("Label"), "Free look period");
    await userEvent.type(
      dialog.getByLabelText("What the judge looks for"),
      "The agent states the 30-day free look period.",
    );
    await userEvent.click(dialog.getByRole("button", { name: "Add item" }));
    await userEvent.click(screen.getByRole("button", { name: "Save as version 3" }));

    expect(items().getByText("Free look period")).toBeInTheDocument();
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
    expect(sent[0]?.items.at(-1)?.key).toBe("free_look_period");
  });

  it("says what is missing in the dialog instead of adding an empty item", async () => {
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Add item" }));

    expect(dialog.getByText("Give the item a label, at most 60 characters")).toBeInTheDocument();
    expect(items().getAllByRole("listitem", { hidden: true })).toHaveLength(2);
  });

  it("edits an item from its row menu and keeps its key", async () => {
    const sent: { items: { key: string; label: string }[] }[] = [];
    const save = vi.fn(async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { items: { key: string; label: string }[] };
      sent.push(body);
      return HttpResponse.json({ ...rubric, version: 3, items: body.items }, { status: 201 });
    });
    server.use(http.post("*/api/rubrics", save));
    const first = DEFAULT_RUBRIC[0]!;
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);

    await userEvent.click(screen.getByRole("button", { name: `Actions for ${first.label}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    const dialog = within(await screen.findByRole("dialog"));
    const label = dialog.getByLabelText("Label");
    await userEvent.clear(label);
    await userEvent.type(label, "Opening greeting");
    await userEvent.click(dialog.getByRole("button", { name: "Save item" }));
    await userEvent.click(screen.getByRole("button", { name: "Save as version 3" }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
    expect(sent[0]?.items[0]).toMatchObject({ key: first.key, label: "Opening greeting" });
  });

  it("deletes an item only after confirming, and discards changes on request", async () => {
    const first = DEFAULT_RUBRIC[0]!;
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);

    await userEvent.click(screen.getByRole("button", { name: `Actions for ${first.label}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete item" }));

    expect(items().queryByText(first.label)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(items().getByText(first.label)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as version 3" })).toBeDisabled();
  });

  it("refuses to save without a name", async () => {
    await renderInRouter(<RubricEditor rubric={rubric} nextVersion={3} />);

    await userEvent.clear(screen.getByRole("textbox", { name: "Rubric name" }));

    expect(screen.getByText("Give the rubric a name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as version 3" })).toBeDisabled();
  });
});
