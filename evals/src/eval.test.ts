import { DEFAULT_RUBRIC } from "@scc/shared";
import { describe, expect, it } from "vitest";

import {
  type EvalFinding,
  evaluateCall,
  formatReport,
  scriptTranscript,
  summarise,
} from "./eval.ts";
import { CALLS } from "./scripts.ts";

const call = CALLS.find((c) => c.id === "02-guaranteed-returns-en")!;
const { segments, planted } = scriptTranscript(call);
const plantedSeg = segments.find((s) => s.text === planted[0]!.text)!;

const finding = (
  itemKey: string,
  status: EvalFinding["status"],
  over: Partial<EvalFinding> = {},
): EvalFinding => ({
  itemKey,
  status,
  source: "llm",
  startMs: null,
  endMs: null,
  grounded: true,
  ...over,
});

const labelled = () =>
  Object.entries(call.labels).map(([k, v]) =>
    v === "breach"
      ? finding(k, "breach", { startMs: plantedSeg.startMs, endMs: plantedSeg.endMs })
      : finding(k, v),
  );

describe("the eval set", () => {
  it("holds 20 calls, each with labels for every rubric item", () => {
    expect(CALLS).toHaveLength(20);
    for (const c of CALLS) {
      expect(Object.keys(c.labels).sort()).toEqual(DEFAULT_RUBRIC.map((i) => i.key).sort());
    }
  });

  it("plants every prohibited type at least three times and labels each plant a breach", () => {
    const plants = CALLS.flatMap((c) =>
      c.lines.filter((l) => l.plant).map((l) => ({ call: c, key: l.plant! })),
    );
    for (const key of ["guaranteed_returns", "false_urgency", "misrepresentation"]) {
      expect(plants.filter((p) => p.key === key).length).toBeGreaterThanOrEqual(3);
    }
    for (const p of plants) expect(p.call.labels[p.key]).toBe("breach");
  });

  it("puts planted statements only on agent lines", () => {
    expect(CALLS.flatMap((c) => c.lines).filter((l) => l.plant && l.s !== "A")).toEqual([]);
  });
});

describe("evaluateCall gate", () => {
  it("passes when the judge flags the planted line", () => {
    const outcome = evaluateCall(call, planted, labelled(), false);

    expect(outcome.gateFailures).toEqual([]);
    expect(outcome.items.every((i) => i.actual === i.expected)).toBe(true);
  });

  it("fails when the judge misses a planted prohibited statement", () => {
    const findings = labelled().map((f) =>
      f.status === "breach" ? { ...f, status: "clear" as const } : f,
    );

    const outcome = evaluateCall(call, planted, findings, false);

    expect(outcome.gateFailures).toHaveLength(1);
    expect(outcome.gateFailures[0]).toContain("judge missed planted guaranteed_returns");
  });

  it("fails when the judge points at the wrong line, and a rule hit does not save it", () => {
    const findings = labelled().map((f) =>
      f.status === "breach" ? { ...f, startMs: 0, endMs: 10 } : f,
    );
    const ruleHits = [
      { itemKey: "guaranteed_returns", startMs: plantedSeg.startMs, endMs: plantedSeg.endMs },
    ];

    const outcome = evaluateCall(call, planted, findings, false, ruleHits);

    expect(outcome.gateFailures).toHaveLength(1);
    expect(outcome.ruleCaught).toEqual(["guaranteed_returns"]);
  });

  it("fails when the judge breach is ungrounded", () => {
    const findings = labelled().map((f) => (f.status === "breach" ? { ...f, grounded: false } : f));

    expect(evaluateCall(call, planted, findings, false).gateFailures).toHaveLength(1);
  });
});

describe("summarise and report", () => {
  it("computes agreement, recall and precision per item", () => {
    const good = evaluateCall(call, planted, labelled(), false);
    const bad = evaluateCall(
      call,
      planted,
      labelled().map((f) => (f.itemKey === "disclosure" ? { ...f, status: "met" as const } : f)),
      true,
    );

    const summary = summarise([good, bad], DEFAULT_RUBRIC);
    const disclosure = summary.find((s) => s.key === "disclosure")!;

    expect(disclosure).toMatchObject({
      n: 2,
      agreed: 1,
      agreement: 0.5,
      recall: 0.5,
      precision: 1,
    });
    expect(summary.find((s) => s.key === "greeting")!.recall).toBeNull();
    const report = formatReport(summary, [good, bad]);
    expect(report).toContain("planted prohibited statements: 2, missed by the judge: 0");
    expect(report).toContain("judge failed on: 02-guaranteed-returns-en");
  });
});

describe("wordErrorRate", () => {
  it("is zero for identical text, ignoring case and punctuation", async () => {
    const { wordErrorRate } = await import("./wer.ts");

    expect(wordErrorRate("Hello, Sir!", "hello sir")).toBe(0);
    expect(wordErrorRate("one two three four", "one too three")).toBe(0.5);
    expect(wordErrorRate("", "")).toBe(0);
  });
});
