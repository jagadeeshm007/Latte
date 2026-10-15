// The judge eval (REQ-028 to REQ-030). Replays recorded judge responses by
// default, so CI makes no live call; EVAL_MODE=record calls Groq and saves
// the responses. Exits 1 if the judge misses any planted prohibited
// statement, or if a recorded response is missing.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { scoreCall } from "@scc/api/scoring";
import { createGateway, MemoryUsageStore, RateLimitedError } from "@scc/gateway";
import { DEFAULT_RUBRIC } from "@scc/shared";

import {
  type EvalSegment,
  evaluateCall,
  formatReport,
  type Planted,
  scriptTranscript,
  summarise,
} from "./eval.ts";
import { CALLS } from "./scripts.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const mode = process.env.EVAL_MODE === "record" ? "record" : "replay";
const gateway = createGateway(
  {
    mode,
    budgetUsd: Number(process.env.EVAL_BUDGET_USD ?? "1"),
    cassetteDir: path.join(ROOT, "cassettes"),
    apiKeys: process.env.GROQ_API_KEY ? { groq: process.env.GROQ_API_KEY } : {},
    routes: {
      chat: { provider: "groq", model: process.env.LLM_MODEL ?? "openai/gpt-oss-120b" },
      stt: { provider: "groq", model: "whisper-large-v3" },
      tts: { provider: "groq", model: "canopylabs/orpheus-v1-english" },
    },
  },
  new MemoryUsageStore(),
);

/** A transcript from Whisper on the rendered audio when one exists, else the script's own timeline. */
function transcriptFor(id: string): {
  segments: EvalSegment[];
  planted: Planted[];
  source: string;
} {
  const fixture = path.join(ROOT, "fixtures", "transcripts", `${id}.json`);
  if (existsSync(fixture)) {
    return {
      ...(JSON.parse(readFileSync(fixture, "utf8")) as {
        segments: EvalSegment[];
        planted: Planted[];
      }),
      source: "whisper",
    };
  }
  const call = CALLS.find((c) => c.id === id);
  if (!call) throw new Error(`unknown call ${id}`);
  return { ...scriptTranscript(call), source: "script" };
}

const outcomes = [];
let missing = 0;
let tokens = 0;
for (const call of CALLS) {
  const { segments, planted, source } = transcriptFor(call.id);
  for (;;) {
    try {
      const result = await scoreCall({
        rubric: DEFAULT_RUBRIC,
        segments,
        judge: async ({ messages, schema }) => {
          const r = await gateway.callModel(
            {
              kind: "chat",
              messages,
              jsonSchema: { name: "call_judgement", schema },
              temperature: 0,
              reasoningEffort: "low",
            },
            { purpose: "eval" },
          );
          tokens += r.usage.inputTokens + r.usage.outputTokens;
          return r;
        },
      });
      if (result.judgeError?.includes("no recorded response")) missing++;
      const bySeq = new Map(segments.map((seg) => [seg.seq, seg]));
      const ruleHits = result.ruleHits.flatMap((h) => {
        const seg = bySeq.get(h.seq);
        return seg ? [{ itemKey: h.itemKey, startMs: seg.startMs, endMs: seg.endMs }] : [];
      });
      const outcome = evaluateCall(
        call,
        planted,
        result.findings,
        result.judgeStatus === "failed",
        ruleHits,
      );
      outcomes.push(outcome);
      const mark = outcome.gateFailures.length ? "MISS" : "ok  ";
      process.stdout.write(
        `${mark} ${call.id.padEnd(36)} ${source.padEnd(7)} ${result.judgeError ?? ""}\n`,
      );
      break;
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      process.stdout.write(
        `     rate limited, waiting ${String(Math.ceil(error.waitMs / 1000))} s\n`,
      );
      await sleep(error.waitMs + 500);
    }
  }
}

process.stdout.write(`\n${formatReport(summarise(outcomes, DEFAULT_RUBRIC), outcomes)}\n`);
process.stdout.write(`mode: ${mode}, judge tokens: ${String(tokens)}\n`);
const failures = outcomes.flatMap((o) => o.gateFailures);
if (missing > 0) {
  process.stdout.write(
    `eval: FAILED, ${String(missing)} calls have no recorded judge response; run make eval-record\n`,
  );
  process.exit(1);
}
if (failures.length > 0) {
  process.stdout.write(
    `eval: FAILED, the judge missed ${String(failures.length)} planted prohibited statements:\n${failures.join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `eval: passed, ${String(outcomes.length)} calls, 0 planted prohibited statements missed\n`,
);
