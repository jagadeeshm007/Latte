import type { Word } from "@scc/shared";

import { Transcription, TranscriptionSegment } from "@/components/ai-elements/transcription";
import { cn } from "@/lib/utils";

const toSeconds = (w: Word) => ({
  text: w.text,
  startSecond: w.startMs / 1000,
  endSecond: w.endMs / 1000,
});

/**
 * ReadAlong: one transcript line, word by word, on AI Elements' Transcription.
 * The word being spoken is highlighted, the words already spoken read as
 * plain text and the rest of the line is muted until it is reached, so the
 * sentence completes as the audio plays. Clicking a word plays from it; words
 * are not tab stops (the line's timestamp button is the keyboard path).
 */
export function ReadAlong({
  words,
  nowMs,
  onPlay,
  lowConfidence,
}: {
  words: Word[];
  nowMs: number;
  onPlay: ((ms: number) => void) | undefined;
  lowConfidence: boolean;
}) {
  return (
    <Transcription
      segments={words.map(toSeconds)}
      currentTime={nowMs / 1000}
      onSeek={
        onPlay
          ? (second) => {
              onPlay(second * 1000);
            }
          : undefined
      }
      className={cn("gap-x-1 gap-y-0.5", lowConfidence && "opacity-70")}
    >
      {(segment, index) => {
        const heard = nowMs >= segment.endSecond * 1000;
        return (
          <TranscriptionSegment
            key={index}
            segment={segment}
            index={index}
            tabIndex={-1}
            data-heard={heard}
            className={cn(
              "-mx-0.5 rounded-sm px-0.5 transition-colors duration-100",
              // The component dims heard words; a read-along keeps them solid instead.
              heard ? "text-foreground" : "text-muted-foreground",
              "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
            )}
          />
        );
      }}
    </Transcription>
  );
}
