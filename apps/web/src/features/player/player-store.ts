import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { decodePeaks } from "@/features/calls/waveform-bars";
import { api } from "@/lib/endpoints";
import type { AudioPeaks } from "@/lib/waveform-dsp";

// One player for the whole app: a call keeps playing while the user moves to
// other pages, and the mini player brings them back. This store is client
// state only (what is loaded, where the playhead is); the call itself stays in
// the TanStack Query cache. The single <audio> element lives in PlayerHost.

export interface NowPlaying {
  callId: string;
  title: string;
  subtitle: string;
  /** WebVTT captions of the transcript, so the recording has a text track. */
  captions?: string;
}

export type PlayerStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "error";

interface PlayerState {
  now: NowPlaying | null;
  status: PlayerStatus;
  positionMs: number;
  durationMs: number | null;
  rate: number;
  error: string | null;
  /** Measured waveform per call, kept for the session so returning to a call does not decode again. */
  peaks: Record<string, AudioPeaks>;
  /** Where the mini player was dragged to, in pixels from the top left; null is the default corner. */
  dock: { x: number; y: number } | null;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (): PlayerState => ({
      now: null,
      status: "idle",
      positionMs: 0,
      durationMs: null,
      rate: 1,
      error: null,
      peaks: {},
      dock: null,
    }),
    {
      name: "scc-player",
      storage: createJSONStorage(() => sessionStore()),
      // The signed URL expires, so it is never kept; the call is fetched again on return.
      partialize: (s) => ({ now: s.now, positionMs: s.positionMs, rate: s.rate, dock: s.dock }),
    },
  ),
);

/** sessionStore is sessionStorage, or nothing when the browser blocks it. */
function sessionStore(): StateStorage {
  try {
    sessionStorage.getItem("scc-player");
    return sessionStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
}

// ---- The audio element and the commands that drive it ----

let audio: HTMLAudioElement | null = null;
let expiresAt = 0;
let loadingFor: string | null = null;

/** resetPlayer empties the player and its caches; tests call it between cases. */
export function resetPlayer(): void {
  close();
  expiresAt = 0;
  usePlayer.setState({ rate: 1, peaks: {}, dock: null });
}

/** registerAudio is called by PlayerHost with its element (null on unmount). */
export function registerAudio(el: HTMLAudioElement | null): void {
  audio = el;
}

async function fetchSource(callId: string): Promise<string> {
  const { url, expiresInSeconds } = await api.audioUrl(callId);
  expiresAt = Date.now() + expiresInSeconds * 1000;
  return url;
}

/**
 * load makes a call the one in the player and fetches its recording, without
 * playing it. Loading the call already loaded does nothing, so a page can
 * call it every time it opens.
 */
export async function load(now: NowPlaying, startMs = 0): Promise<void> {
  const state = usePlayer.getState();
  const el = audio;
  if (!el) return;
  const same = state.now?.callId === now.callId;
  if (
    same &&
    ((state.status !== "idle" && state.status !== "error") || loadingFor === now.callId)
  ) {
    return;
  }
  loadingFor = now.callId;
  usePlayer.setState({
    now,
    status: "loading",
    error: null,
    positionMs: same ? state.positionMs : startMs,
    durationMs: null,
  });
  try {
    const url = await fetchSource(now.callId);
    if (usePlayer.getState().now?.callId !== now.callId) return;
    // preload="none" would stop the browser loading after src changes.
    el.preload = "auto";
    el.src = url;
    el.playbackRate = usePlayer.getState().rate;
    el.currentTime = usePlayer.getState().positionMs / 1000;
    if (!usePlayer.getState().peaks[now.callId]) {
      void decodePeaks(url).then((p) => {
        if (p) usePlayer.setState((s) => ({ peaks: { ...s.peaks, [now.callId]: p } }));
      });
    }
  } catch (e) {
    usePlayer.setState({
      status: "error",
      error: e instanceof Error ? e.message : "The recording could not be loaded",
    });
  } finally {
    if (loadingFor === now.callId) loadingFor = null;
  }
}

/** play starts or resumes, fetching a fresh link first when the old one is about to expire. */
export async function play(): Promise<void> {
  const el = audio;
  const { now } = usePlayer.getState();
  if (!el || !now) return;
  try {
    if (Date.now() > expiresAt - 30_000 || usePlayer.getState().status === "error") {
      usePlayer.setState({ status: "loading", error: null });
      const at = el.currentTime;
      el.src = await fetchSource(now.callId);
      el.currentTime = at;
    }
    await el.play();
  } catch (e) {
    usePlayer.setState({
      status: "error",
      error: e instanceof Error ? e.message : "The recording could not be played",
    });
  }
}

export function pause(): void {
  audio?.pause();
}

export function toggle(): void {
  if (usePlayer.getState().status === "playing") pause();
  else void play();
}

/** seek moves the playhead, and plays from there when `andPlay` is set. */
export function seek(ms: number, andPlay = false): void {
  const el = audio;
  const durationMs = usePlayer.getState().durationMs ?? Number.POSITIVE_INFINITY;
  const at = Math.min(Math.max(0, ms), durationMs);
  usePlayer.setState({ positionMs: at });
  if (el) el.currentTime = at / 1000;
  if (andPlay) void play();
}

export function skip(deltaMs: number): void {
  seek(usePlayer.getState().positionMs + deltaMs);
}

export function setRate(rate: number): void {
  usePlayer.setState({ rate });
  if (audio) audio.playbackRate = rate;
}

/** close stops playback and empties the player, which hides the mini player. */
export function close(): void {
  const el = audio;
  if (el) {
    el.pause();
    el.removeAttribute("src");
    el.load();
  }
  loadingFor = null;
  usePlayer.setState({ now: null, status: "idle", positionMs: 0, durationMs: null, error: null });
}

export function setDock(dock: { x: number; y: number } | null): void {
  usePlayer.setState({ dock });
}
