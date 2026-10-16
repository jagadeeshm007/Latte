import type { Segment } from "@scc/shared";
import { describe, expect, it } from "vitest";

import { exportTranscript } from "./transcript-export";

const line = (over: Partial<Segment>): Segment => ({
  seq: 0,
  channel: "agent",
  startMs: 1000,
  endMs: 4250,
  text: "Good morning, this is Ravi.",
  language: "en",
  avgLogprob: null,
  translation: null,
  words: [],
  ...over,
});

const lines = [
  line({}),
  line({
    seq: 1,
    channel: "customer",
    startMs: 3_723_005,
    endMs: 3_725_500,
    text: "हाँ बोलिए.",
    translation: "Yes, go ahead.",
  }),
];

describe("exportTranscript", () => {
  it("writes plain text with times and speakers", () => {
    expect(exportTranscript(lines, "txt").body).toBe(
      "[00:01] Agent: Good morning, this is Ravi.\n[62:03] Customer: हाँ बोलिए.\n",
    );
  });

  it("writes SubRip with numbered cues and comma milliseconds", () => {
    expect(exportTranscript(lines, "srt").body).toBe(
      "1\n00:00:01,000 --> 00:00:04,250\nAgent: Good morning, this is Ravi.\n\n" +
        "2\n01:02:03,005 --> 01:02:05,500\nCustomer: हाँ बोलिए.\n",
    );
  });

  it("writes WebVTT with voice tags", () => {
    expect(exportTranscript(lines, "vtt").body).toBe(
      "WEBVTT\n\n00:00:01.000 --> 00:00:04.250\n<v Agent>Good morning, this is Ravi.\n\n" +
        "01:02:03.005 --> 01:02:05.500\n<v Customer>हाँ बोलिए.\n",
    );
  });

  it("writes LRC lyrics with minute:second.hundredths stamps", () => {
    expect(exportTranscript(lines, "lrc").body).toBe(
      "[00:01.00]Agent: Good morning, this is Ravi.\n[62:03.00]Customer: हाँ बोलिए.\n",
    );
  });

  it("uses the English translation when asked, and the original where there is none", () => {
    expect(exportTranscript(lines, "txt", { english: true }).body).toBe(
      "[00:01] Agent: Good morning, this is Ravi.\n[62:03] Customer: Yes, go ahead.\n",
    );
  });

  it("writes every field as JSON, and names each file with its type", () => {
    const json = exportTranscript(lines, "json");

    expect(JSON.parse(json.body)).toEqual([
      expect.objectContaining({ speaker: "Agent", startMs: 1000, endMs: 4250 }),
      expect.objectContaining({ speaker: "Customer", translation: "Yes, go ahead." }),
    ]);
    expect(json).toMatchObject({ extension: "json", mime: "application/json" });
    expect(exportTranscript(lines, "srt")).toMatchObject({
      extension: "srt",
      mime: "application/x-subrip",
    });
  });
});
