import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { captionsUrl } from "@/lib/captions";
import { findingTone, formatClock, formatPercent } from "@/lib/format";
import { detail, scorecard, summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallDetailPage } from "./calls/CallDetailPage";
import { CallsPage, QueuePage } from "./calls/CallsPage";
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
});

describe("calls list and queue", () => {
  it("shows calls with their flags and links to each call", async () => {
    server.use(
      http.get("*/api/calls", () => HttpResponse.json({ items: [summary()], nextCursor: null })),
    );

    await renderInRouter(<CallsPage />);

    const link = await screen.findByRole("link", { name: "call-01.wav" });
    expect(link).toHaveAttribute("href", "/calls/11111111-1111-4111-8111-111111111111");
    expect(screen.getByText("1 breach")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Needs review")).toBeInTheDocument();
  });

  it("says so when there are no calls", async () => {
    server.use(http.get("*/api/calls", () => HttpResponse.json({ items: [], nextCursor: null })));

    await renderInRouter(<CallsPage />);

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
    await renderInRouter(<CallsPage />);
    expect(await screen.findByText("database unavailable")).toBeInTheDocument();
  });
});

describe("call detail and review (US-01-006)", () => {
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
    expect(screen.getByText("Never promise returns.")).toBeInTheDocument();
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
  it("shows results by team, judge agreement and spend", async () => {
    server.use(
      http.get("*/api/dashboard", () =>
        HttpResponse.json({
          groupBy: "team",
          groups: [
            {
              id: "t1",
              name: "Mumbai Inbound",
              callsScored: 10,
              flagged: 4,
              flagRate: 0.4,
              avgOverall: 71.2,
              items: [{ key: "greeting", passRate: 0.9 }],
            },
          ],
        }),
      ),
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

    await renderInRouter(<DashboardPage />);

    expect(await screen.findByText("Mumbai Inbound")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(await screen.findByText("Explicit consent")).toBeInTheDocument();
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
  };

  it("saves the edited rubric as the next version", async () => {
    const save = vi.fn(async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { items: { label: string }[] };
      return HttpResponse.json({ ...rubric, version: 3, items: body.items }, { status: 201 });
    });
    server.use(http.post("*/api/rubrics", save));
    await renderInRouter(<RubricEditor rubric={rubric} />);

    const label = screen.getAllByRole("textbox")[1]!;
    await userEvent.clear(label);
    await userEvent.type(label, "Opening greeting");
    await userEvent.click(screen.getByRole("button", { name: "Save as version 3" }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it("refuses to save without a name", async () => {
    await renderInRouter(<RubricEditor rubric={rubric} />);

    await userEvent.clear(screen.getAllByRole("textbox")[0]!);

    expect(screen.getByText("Give the rubric a name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as version 3" })).toBeDisabled();
  });
});
