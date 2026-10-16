import { QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/ThemeToggle";
import { MiniPlayer } from "@/features/player/MiniPlayer";
import { usePlayer } from "@/features/player/player-store";
import { PlayerHost } from "@/features/player/PlayerHost";
import { detail } from "@/test/fixtures";
import { server } from "@/test/msw";
import { createTestQueryClient, renderInRouter, renderWithProviders } from "@/test/render";

import { CallDetailPage } from "./CallDetailPage";
import { decodePeaks } from "./waveform-bars";

const CALL_ID = "11111111-1111-4111-8111-111111111111";
const AUDIO = "https://storage.test/a.wav";

// jsdom has no media pipeline: play and pause only fire the events a browser would.
function stubMedia() {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    this.dispatchEvent(new Event("pause"));
  });
}

/** openCall opens the call page and lets the recording report it can play. */
async function openCall() {
  await renderInRouter(<CallDetailPage callId={CALL_ID} />);
  const audio = screen.getByLabelText<HTMLAudioElement>("Call recording");
  await waitFor(() => {
    expect(audio.getAttribute("src")).toBe(AUDIO);
  });
  fireEvent(audio, new Event("canplay"));
  await screen.findByRole("button", { name: "Play" });
  return audio;
}

const lyrics = () => within(screen.getByRole("list", { name: "Transcript, following the audio" }));

beforeEach(() => {
  stubMedia();
  server.use(
    http.get("*/api/me", () =>
      HttpResponse.json({
        id: "u1",
        email: "u@test",
        displayName: "Test User",
        role: "qa_reviewer",
        agentId: null,
      }),
    ),
    http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("call player", () => {
  it("loads the recording as the call opens, with Play disabled until it can play", async () => {
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    const waiting = await screen.findByRole("button", { name: "Loading audio" });
    expect(waiting).toBeDisabled();
    const audio = screen.getByLabelText<HTMLAudioElement>("Call recording");
    await waitFor(() => {
      expect(audio.getAttribute("src")).toBe(AUDIO);
    });
    expect(audio.preload).toBe("auto");
    fireEvent(audio, new Event("canplay"));

    expect(await screen.findByRole("button", { name: "Play" })).toBeEnabled();
  });

  it("plays, pauses and resumes without asking for a second link", async () => {
    const audioUrl = vi.fn(() => HttpResponse.json({ url: AUDIO, expiresInSeconds: 600 }));
    server.use(http.post("*/api/calls/:id/audio-url", audioUrl));
    await openCall();

    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    await userEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await userEvent.click(await screen.findByRole("button", { name: "Play" }));

    expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(audioUrl).toHaveBeenCalledTimes(1);
  });

  it("skips ten seconds forward and back, and shows the position", async () => {
    const audio = await openCall();

    await userEvent.click(screen.getByRole("button", { name: "Forward 10 seconds" }));

    expect(audio.currentTime).toBe(10);
    expect(screen.getByText(/^00:10 \//)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back 10 seconds" }));
    expect(audio.currentTime).toBe(0);
  });

  it("changes the playback speed", async () => {
    const audio = await openCall();

    await userEvent.click(screen.getByRole("button", { name: "1.5×" }));

    expect(audio.playbackRate).toBe(1.5);
  });

  it("follows the audio's clock, and the lyrics mark the line being spoken", async () => {
    const audio = await openCall();
    Object.defineProperty(audio, "duration", { value: 90, configurable: true });
    fireEvent(audio, new Event("loadedmetadata"));

    audio.currentTime = 66;
    fireEvent(audio, new Event("timeupdate"));

    expect(await screen.findByText("01:06 / 01:30")).toBeInTheDocument();
    const current = lyrics().getByText("This plan gives guaranteed returns.").closest("li");
    expect(current).toHaveAttribute("aria-current", "true");
  });

  it("keeps the lyrics panel from scrolling by hand", async () => {
    await openCall();

    expect(screen.getByRole("list", { name: "Transcript, following the audio" })).toHaveClass(
      "overflow-hidden",
    );
  });

  it("reads the line being spoken word by word", async () => {
    const audio = await openCall();

    audio.currentTime = 1.6;
    fireEvent(audio, new Event("timeupdate"));

    await waitFor(() => {
      expect(lyrics().getByRole("button", { name: "morning," })).toHaveAttribute(
        "data-active",
        "true",
      );
    });
    expect(lyrics().getByRole("button", { name: "Good" })).toHaveAttribute("data-heard", "true");
  });

  it("plays from a lyric line when it is pressed", async () => {
    const audio = await openCall();

    await userEvent.click(lyrics().getByText("This plan gives guaranteed returns."));

    expect(audio.currentTime).toBe(65);
    expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("opens the complete transcript to scroll through and play from any line", async () => {
    const audio = await openCall();

    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: /^Play agent line at 01:05/ }));

    expect(audio.currentTime).toBe(65);
  });

  it("searches the complete transcript, marks the words found and filters by speaker", async () => {
    await openCall();
    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));
    const lines = () =>
      within(dialog.getByRole("list", { name: "Complete transcript" })).getAllByRole("listitem");
    expect(lines()).toHaveLength(2);

    await userEvent.type(
      dialog.getByRole("searchbox", { name: "Search the transcript" }),
      "guaranteed",
    );

    expect(lines()).toHaveLength(1);
    expect(dialog.getByText("guaranteed", { selector: "mark" })).toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("1 line found");
    await userEvent.click(dialog.getByRole("button", { name: "Customer" }));
    expect(dialog.getByRole("status")).toHaveTextContent("No line has these words.");
  });

  it("marks the line being played in the complete transcript and can jump back to it", async () => {
    const audio = await openCall();
    audio.currentTime = 66;
    fireEvent(audio, new Event("timeupdate"));

    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));

    const current = dialog.getByText("Now").closest("li");
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveTextContent("This plan gives guaranteed returns.");
    await userEvent.click(dialog.getByRole("button", { name: "Jump to now" }));
  });

  it("dims the lines already heard in the complete transcript", async () => {
    const audio = await openCall();
    audio.currentTime = 66;
    fireEvent(audio, new Event("timeupdate"));

    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));

    const [first, second] = within(
      dialog.getByRole("list", { name: "Complete transcript" }),
    ).getAllByRole("listitem");
    expect(first).toHaveAttribute("data-heard", "true");
    expect(second).not.toHaveAttribute("data-heard");
  });

  it("hides Jump to now while the line being played is filtered out", async () => {
    const audio = await openCall();
    audio.currentTime = 66;
    fireEvent(audio, new Event("timeupdate"));
    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));

    await userEvent.click(dialog.getByRole("button", { name: "Customer" }));

    expect(dialog.queryByRole("button", { name: "Jump to now" })).not.toBeInTheDocument();
    expect(dialog.getByRole("status")).toHaveTextContent("The customer says nothing in this call.");
  });

  it("clears the search with Escape or the clear button, keeping the dialog open", async () => {
    await openCall();
    await userEvent.click(screen.getByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));
    const search = dialog.getByRole("searchbox", { name: "Search the transcript" });

    await userEvent.type(search, "guaranteed{Escape}");

    expect(search).toHaveValue("");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.type(search, "plan");
    await userEvent.click(dialog.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });

  it("says when the link has expired and fetches a fresh one on Play", async () => {
    const audioUrl = vi.fn(() => HttpResponse.json({ url: AUDIO, expiresInSeconds: 600 }));
    server.use(http.post("*/api/calls/:id/audio-url", audioUrl));
    const audio = await openCall();

    fireEvent(audio, new Event("error"));

    expect(await screen.findByText(/the link may have expired/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => {
      expect(audioUrl).toHaveBeenCalledTimes(2);
    });
  });

  it("shows why the recording could not be fetched", async () => {
    server.use(
      http.post("*/api/calls/:id/audio-url", () =>
        HttpResponse.json(
          { error: { code: "audio_purged", message: "the audio for this call has been deleted" } },
          { status: 410 },
        ),
      ),
    );

    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    expect(await screen.findByText("the audio for this call has been deleted")).toBeInTheDocument();
  });
});

describe("downloads", () => {
  it("saves the transcript in the format chosen, and the recording under its own name", async () => {
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download);
    });
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }),
    );
    const asked: unknown[] = [];
    server.use(
      http.post("*/api/calls/:id/audio-url", async ({ request }) => {
        asked.push(await request.json().catch(() => null));
        return HttpResponse.json({ url: AUDIO, expiresInSeconds: 600 });
      }),
    );
    await openCall();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "SubRip subtitles (.srt)" }));
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Recording/ }));

    await waitFor(() => {
      expect(saved).toEqual(["call-01.srt", "call-01.wav"]);
    });
    expect(asked).toContainEqual({ download: true });
  });
});

describe("findings and failures", () => {
  it("filters findings to those needing attention, or those that passed", async () => {
    await openCall();
    const findings = within(screen.getByRole("region", { name: "Findings" }));
    expect(findings.getByText(/need attention/).closest("p")).toHaveTextContent(
      "1 need attention · 1 passed · 2 in all",
    );

    await userEvent.click(findings.getByRole("button", { name: "Needs attention" }));
    expect(findings.getByText("Guaranteed returns claim")).toBeInTheDocument();
    expect(findings.queryByText("Greeting")).not.toBeInTheDocument();
    await userEvent.click(findings.getByRole("button", { name: "Passed" }));

    expect(findings.getByText("Greeting")).toBeInTheDocument();
    expect(findings.queryByText("Guaranteed returns claim")).not.toBeInTheDocument();
  });

  it("shows why playback did not start", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("Autoplay blocked"));
    await openCall();

    await userEvent.click(screen.getByRole("button", { name: "Play" }));

    expect(await screen.findByText("Autoplay blocked")).toBeInTheDocument();
  });

  it("downloads the English translation of a regional call, and saves nothing when the recording link fails", async () => {
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download);
    });
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }),
    );
    const call = detail();
    server.use(
      http.get("*/api/calls/:id", () =>
        HttpResponse.json({
          ...call,
          segments: call.segments.map((x) => ({ ...x, translation: "In English." })),
        }),
      ),
    );
    await openCall();
    const failing = vi.fn(() =>
      HttpResponse.json({ error: { code: "x", message: "storage unavailable" } }, { status: 503 }),
    );
    server.use(http.post("*/api/calls/:id/audio-url", failing));

    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "LRC lyrics in English (.lrc)" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Recording/ }));

    await waitFor(() => {
      expect(failing).toHaveBeenCalledTimes(1);
    });
    // The failed recording link saves nothing; only the transcript was kept.
    expect(saved).toEqual(["call-01.en.lrc"]);
  });
});

describe("mini player", () => {
  beforeEach(() => {
    // jsdom has no pointer capture; a browser routes the drag to the card with it.
    Element.prototype.setPointerCapture = vi.fn();
  });

  function renderApp(path: string) {
    const root = createRootRoute({
      component: () => (
        <>
          <PlayerHost />
          <MiniPlayer />
          <Outlet />
        </>
      ),
    });
    const routeTree = root.addChildren([
      createRoute({ getParentRoute: () => root, path: "/", component: () => <p>Calls list</p> }),
      createRoute({
        getParentRoute: () => root,
        path: "/calls/$callId",
        component: () => <p>Call page</p>,
      }),
    ]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    return router;
  }
  const playing = { callId: CALL_ID, title: "call-01.wav", subtitle: "Ravi Kumar · ULIP" };

  it("shows what is playing on other pages, and opens the call when pressed", async () => {
    usePlayer.setState({ now: playing });
    const router = renderApp("/");

    const card = await screen.findByRole("region", { name: "Now playing" });
    expect(within(card).getByText("call-01.wav")).toBeInTheDocument();
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(await screen.findByText("Call page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/calls/${CALL_ID}`);
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
  });

  it("can be dragged and moved with the keyboard, and remembers where", async () => {
    usePlayer.setState({ now: playing });
    renderApp("/");
    const card = await screen.findByRole("region", { name: "Now playing" });

    fireEvent.pointerDown(card, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 150, clientY: 120 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 150, clientY: 120 });
    const dragged = usePlayer.getState().dock;
    screen.getByRole("button", { name: "Move the player (arrow keys)" }).focus();
    await userEvent.keyboard("{ArrowUp}");

    expect(dragged).not.toBeNull();
    expect(usePlayer.getState().dock).not.toBeNull();
    expect(screen.getByText("Calls list")).toBeInTheDocument();
  });

  // SCC-1: a fast drag (no render between pointer events) was taken for a click and opened the call.
  it("treats a fast drag as a drag, never as a click on the card", async () => {
    usePlayer.setState({ now: playing });
    const router = renderApp("/");
    const card = await screen.findByRole("region", { name: "Now playing" });
    const ev = (type: string, x: number, y: number) =>
      new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y });

    act(() => {
      card.dispatchEvent(ev("pointerdown", 50, 50));
      card.dispatchEvent(ev("pointermove", 250, 250));
      card.dispatchEvent(ev("pointerup", 250, 250));
    });

    expect(router.state.location.pathname).toBe("/");
    expect(usePlayer.getState().dock).not.toBeNull();
  });

  it("closes with ×, which stops and clears the player", async () => {
    usePlayer.setState({ now: playing });
    renderApp("/");

    await userEvent.click(await screen.findByRole("button", { name: "Close player" }));

    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    expect(usePlayer.getState().now).toBeNull();
  });
});

describe("regional transcript", () => {
  const tamil = () =>
    detail({
      segments: [
        {
          seq: 0,
          channel: "agent",
          startMs: 1000,
          endMs: 4000,
          text: "இந்த திட்டம் உறுதியான வருமானம் தரும்.",
          language: "ta-IN",
          avgLogprob: null,
          translation: "This plan gives guaranteed returns.",
          words: [],
        },
      ],
    });

  it("switches the lyrics between the original and the English translation", async () => {
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(tamil())));
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    await screen.findByRole("list", { name: "Transcript, following the audio" });
    expect(lyrics().getByText("இந்த திட்டம் உறுதியான வருமானம் தரும்.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(lyrics().getByText("This plan gives guaranteed returns.")).toBeInTheDocument();
  });

  // SCC-1: an English search hid the line while marking its translation.
  it("finds a regional line in the complete transcript by its English translation", async () => {
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(tamil())));
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);
    await userEvent.click(await screen.findByRole("button", { name: "View complete transcript" }));
    const dialog = within(await screen.findByRole("dialog"));

    await userEvent.type(
      dialog.getByRole("searchbox", { name: "Search the transcript" }),
      "guaranteed",
    );

    expect(dialog.getByRole("status")).toHaveTextContent("1 line found");
    expect(dialog.getByText("guaranteed", { selector: "mark" })).toBeInTheDocument();
  });

  it("offers no language switch on an English call", async () => {
    await renderInRouter(<CallDetailPage callId={CALL_ID} />);

    await screen.findByRole("heading", { name: "Transcript" });

    expect(screen.queryByRole("group", { name: "Transcript language" })).not.toBeInTheDocument();
  });
});

describe("decodePeaks", () => {
  it("returns null without an audio decoder, so the drawn envelope stays", async () => {
    vi.stubGlobal("AudioContext", undefined);

    expect(await decodePeaks(AUDIO)).toBeNull();
  });

  it("measures the decoded recording", async () => {
    server.use(http.get(AUDIO, () => HttpResponse.arrayBuffer(new ArrayBuffer(8))));
    const samples = new Float32Array(4096).fill(0.25);
    vi.stubGlobal(
      "AudioContext",
      class {
        decodeAudioData = () =>
          Promise.resolve({ numberOfChannels: 1, getChannelData: () => samples });
        close = () => Promise.resolve();
      },
    );

    const peaks = await decodePeaks(AUDIO);

    // Normalised: the loudest slice reaches full height.
    expect(peaks?.max).toHaveLength(2048);
    expect(peaks?.max[0]).toBe(1);
  });

  it("returns null when the recording cannot be fetched", async () => {
    server.use(http.get(AUDIO, () => new HttpResponse(null, { status: 403 })));
    vi.stubGlobal("AudioContext", vi.fn());

    expect(await decodePeaks(AUDIO)).toBeNull();
  });
});

describe("ThemeToggle", () => {
  it("switches to dark and back", async () => {
    renderWithProviders(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");

    await userEvent.click(screen.getByRole("button", { name: "Light theme" }));

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
