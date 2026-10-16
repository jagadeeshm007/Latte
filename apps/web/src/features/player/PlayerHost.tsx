import { useEffect, useRef } from "react";

import { load, registerAudio, usePlayer } from "./player-store";

/**
 * PlayerHost holds the app's one <audio> element and mirrors what it does into
 * the player store, so the call page, the mini player and every control read
 * the same state. Mounted once in the app shell; it renders nothing visible.
 */
export function PlayerHost() {
  const ref = useRef<HTMLAudioElement>(null);
  const captions = usePlayer((s) => s.now?.captions);

  useEffect(() => {
    registerAudio(ref.current);
    // After a reload the session still names the call that was playing: fetch it again, paused.
    const { now, positionMs } = usePlayer.getState();
    if (now) void load(now, positionMs);
    return () => {
      registerAudio(null);
    };
  }, []);

  return (
    <audio
      ref={ref}
      preload="none"
      aria-label="Call recording"
      className="hidden"
      onLoadedMetadata={(e) => {
        usePlayer.setState({ durationMs: e.currentTarget.duration * 1000 });
      }}
      onCanPlay={() => {
        // Ready once the browser can start; a later buffer wait does not undo it.
        if (usePlayer.getState().status === "loading") usePlayer.setState({ status: "ready" });
      }}
      onTimeUpdate={(e) => {
        usePlayer.setState({ positionMs: e.currentTarget.currentTime * 1000 });
      }}
      onPlay={() => {
        usePlayer.setState({ status: "playing", error: null });
      }}
      onPause={() => {
        if (usePlayer.getState().status === "playing") usePlayer.setState({ status: "paused" });
      }}
      onEnded={() => {
        usePlayer.setState({ status: "paused" });
      }}
      onError={(e) => {
        // A removed src (close) is not an error worth showing.
        if (!e.currentTarget.getAttribute("src")) return;
        usePlayer.setState({
          status: "error",
          error: "The recording could not be loaded; the link may have expired. Press play again.",
        });
      }}
    >
      <track
        kind="captions"
        srcLang="en"
        label="Transcript"
        default
        {...(captions ? { src: captions } : {})}
      />
    </audio>
  );
}
