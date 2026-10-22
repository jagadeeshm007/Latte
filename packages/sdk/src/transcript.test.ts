import { describe, expect, it } from "vitest";

import { parseTranscript, TranscriptParseError } from "./transcript.ts";

// Reading exported transcripts into API lines (ADR-0030).

describe("parseTranscript", () => {
  it("reads labelled text, joining a line without a label to the turn above", () => {
    const lines = parseTranscript(
      "Agent: Good morning, this is Ravi.\n\nCustomer: Hi.\nWho is calling?\nRep: From Suraksha.",
    );

    expect(lines).toEqual([
      { speaker: "agent", text: "Good morning, this is Ravi." },
      { speaker: "customer", text: "Hi. Who is calling?" },
      { speaker: "agent", text: "From Suraksha." },
    ]);
  });

  it("keeps times when every turn has one, ending each where the next begins", () => {
    const lines = parseTranscript(
      "[00:00] Agent: Hello there.\n[00:05] Customer: Hi.\n(1:02:03) Agent: Bye.",
    );

    expect(lines.map((l) => [l.startMs, l.endMs])).toEqual([
      [0, 5000],
      [5000, 3_723_000],
      [3_723_000, 3_723_400],
    ]);
  });

  it("drops all times when a turn has none, rather than mixing real and missing times", () => {
    const lines = parseTranscript("[00:00] Agent: Hello.\nCustomer: Hi.");

    expect(lines.every((l) => l.startMs === undefined && l.endMs === undefined)).toBe(true);
  });

  it("maps names given in options to a side", () => {
    const lines = parseTranscript("Ravi: Hello.\nMr Shah: Hi.", {
      speakers: { Ravi: "agent", "mr shah": "customer" },
    });

    expect(lines.map((l) => l.speaker)).toEqual(["agent", "customer"]);
  });

  it("reads JSON lines, as a list or under lines", () => {
    const list = parseTranscript('[{"speaker":"Agent","text":" Hello ","startMs":0,"endMs":900}]');
    const wrapped = parseTranscript('{"lines":[{"speaker":"customer","text":"Hi"}]}');

    expect(list).toEqual([{ speaker: "agent", text: "Hello", startMs: 0, endMs: 900 }]);
    expect(wrapped).toEqual([{ speaker: "customer", text: "Hi" }]);
  });

  it("names the line it cannot read", () => {
    const unlabelled = () => parseTranscript("Hello, who is this?");
    const unknownLabel = () => parseTranscript("Mr Shah: Hi.");
    const badJson = () => parseTranscript('[{"speaker":"bot","text":"x"}]');

    expect(unlabelled).toThrow(TranscriptParseError);
    expect(unlabelled).toThrow(/line 1: start with a speaker label/);
    expect(unknownLabel).toThrow(/"Mr Shah" is not one/);
    expect(badJson).toThrow(/line 1: speaker must be agent or customer/);
  });

  it("refuses an empty transcript and broken JSON", () => {
    expect(() => parseTranscript("   ")).toThrow(/empty/);
    expect(() => parseTranscript("{ nope")).toThrow(/not valid JSON/);
    expect(() => parseTranscript("[]")).toThrow(/no lines/);
  });
});
