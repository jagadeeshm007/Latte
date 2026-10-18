import { createHash } from "node:crypto";

import { BudgetExceededError, type Gateway, RateLimitedError } from "@scc/gateway";
import { ENGLISH, isRegional } from "@scc/shared";
import type { Logger } from "pino";

import { announceScored, failCall } from "./events.ts";
import { type Enqueue, QUEUES, RETRY_LIMIT } from "./queue.ts";
import { AudioError } from "../audio/decode.ts";
import { type SttChunkResult, transcribeRecording } from "../audio/transcribe.ts";
import { translateLines } from "../audio/translate.ts";
import { inTransaction, type Pool } from "../db/pool.ts";
import { purgeApiTraffic } from "../repo/api-keys.ts";
import * as calls from "../repo/calls.ts";
import { audit, rubricFor } from "../repo/reference.ts";
import { replaceScore } from "../repo/scores.ts";
import { purgeDeliveries } from "../repo/webhooks.ts";
import { scoreCall } from "../scoring/score.ts";
import type { Storage } from "../storage.ts";

// The worker's three jobs. Each claims its call with one conditional update
// (no check-then-act), re-reads every row it needs (tenet 6), reschedules on
// a rate limit instead of sleeping past its expiry, and records a reason a
// person can read when it gives up.

export interface JobDeps {
  pool: Pool;
  storage: Storage;
  gateway: Gateway;
  enqueue: Enqueue;
  log: Logger;
}

export interface JobInfo {
  callId: string;
  retryCount: number;
  /** How many times a rate limit has already pushed this call back. */
  reschedules?: number;
}

const BUDGET_MESSAGE = "Model budget exhausted for this month; raise LLM_BUDGET_USD, then retry";
/** A job left in flight this long has crashed or expired; its call may be claimed again. */
export const STALE_SECONDS = 20 * 60;
/** After this many rate-limit reschedules the call fails with a reason instead of waiting forever. */
export const MAX_RESCHEDULES = 12;
/** Sarvam's real-time speech-to-text takes about 30 s of audio per request (ADR-0014). */
export const REGIONAL_CHUNK_MS = 28_000;

// Chunks already transcribed in this process, so a rate limit part way through
// a recording does not pay for the earlier chunks again on the next attempt.
const chunkCache = new Map<string, SttChunkResult>();
const CHUNK_CACHE_MAX = 500;
function remember(key: string, value: SttChunkResult): void {
  if (chunkCache.size >= CHUNK_CACHE_MAX) {
    const oldest = chunkCache.keys().next().value;
    if (oldest !== undefined) chunkCache.delete(oldest);
  }
  chunkCache.set(key, value);
}

/**
 * sourceLanguage is the language Sarvam heard: the chosen language, or for
 * "auto" the one it detected most often across the call's chunks.
 */
function sourceLanguage(
  chosen: string,
  transcript: { segments: { language: string | null }[] },
): string {
  if (chosen !== "auto") return chosen;
  const counts = new Map<string, number>();
  for (const seg of transcript.segments) {
    if (seg.language && seg.language !== "unknown") {
      counts.set(seg.language, (counts.get(seg.language) ?? 0) + 1);
    }
  }
  const detected = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!detected) {
    throw new AudioError("Sarvam could not detect the call's language; upload it with a language");
  }
  return detected;
}

export async function handleTranscribe(deps: JobDeps, job: JobInfo): Promise<void> {
  const { pool, log } = deps;
  const call = await calls.claimCall(pool, job.callId, "uploaded", "transcribing", STALE_SECONDS);
  if (!call) {
    log.info({ callId: job.callId }, "transcribe: call not in a transcribable state, skipped");
    return;
  }
  if (!call.storage_path) {
    await failCall(pool, call.id, "Recording audio is no longer stored");
    return;
  }
  try {
    const bytes = await deps.storage.download(call.storage_path);
    const regional = isRegional(call.language);
    const product = regional ? await calls.productNameOf(pool, call.id) : null;
    const transcript = await transcribeRecording(
      bytes,
      call.mime_type,
      async (wav, durationSeconds, label) => {
        const key = `${call.id}:${call.language}:${createHash("sha256").update(wav).digest("hex")}`;
        const cached = chunkCache.get(key);
        if (cached) return cached;
        const result = await deps.gateway.callModel(
          {
            kind: "stt",
            audio: wav,
            filename: `${call.id}-${label}.wav`,
            durationSeconds,
            ...(regional
              ? {
                  regional: true,
                  language: call.language === "auto" ? "unknown" : call.language,
                  ...(product ? { keyterms: [product] } : {}),
                }
              : {}),
          },
          { purpose: "transcribe", callId: call.id },
        );
        const chunk = { language: result.language, segments: result.segments, words: result.words };
        remember(key, chunk);
        return chunk;
      },
      regional ? { maxChunkMs: REGIONAL_CHUNK_MS, onePerUtterance: true } : {},
    );
    // The judge reads English: translate regional lines before anything is written,
    // so a call is never scored on a half-translated transcript.
    const translations = regional
      ? await translateLines(
          transcript.segments.map((seg) => seg.text),
          async (text) =>
            (
              await deps.gateway.callModel(
                {
                  kind: "translate",
                  text,
                  source: sourceLanguage(call.language, transcript),
                  target: ENGLISH,
                },
                { purpose: "translate", callId: call.id },
              )
            ).text,
        )
      : [];
    await inTransaction(pool, async (client) => {
      await calls.replaceSegments(client, call.id, transcript.segments);
      await calls.setTranslations(
        client,
        call.id,
        translations.map((textEn, i) => ({ seq: transcript.segments[i]?.seq ?? i, textEn })),
      );
      await calls.setDuration(client, call.id, transcript.durationMs);
      await calls.setStatus(client, call.id, "transcribed");
    });
    await deps.enqueue(QUEUES.score, { callId: call.id });
    log.info({ callId: call.id, segments: transcript.segments.length }, "transcribed");
  } catch (error) {
    await handleFailure(deps, job, error, QUEUES.transcribe, "uploaded");
  }
}

export async function handleScore(deps: JobDeps, job: JobInfo): Promise<void> {
  const { pool, log } = deps;
  const call = await calls.claimCall(pool, job.callId, "transcribed", "scoring", STALE_SECONDS);
  if (!call) {
    log.info({ callId: job.callId }, "score: call not in a scorable state, skipped");
    return;
  }
  try {
    // A product with its own rubric is scored by it; the rest by the default.
    const rubric = await rubricFor(pool, call.product_id);
    if (!rubric) {
      throw new Error("no active rubric; run the seed");
    }
    const segments = (await calls.listSegments(pool, call.id)).map((s) => ({
      seq: s.seq,
      channel: s.channel,
      startMs: s.start_ms,
      endMs: s.end_ms,
      text: s.text,
      textEn: s.text_en,
    }));
    const result = await scoreCall({
      rubric: rubric.items,
      segments,
      judge: ({ messages, schema }) =>
        deps.gateway.callModel(
          {
            kind: "chat",
            messages,
            jsonSchema: { name: "call_judgement", schema },
            temperature: 0,
            reasoningEffort: "low",
          },
          { purpose: "score", callId: call.id },
        ),
    });
    await inTransaction(pool, async (client) => {
      await replaceScore(
        client,
        {
          callId: call.id,
          rubricId: rubric.id,
          modelCallId: result.modelCallId,
          overallScore: result.overallScore,
          judgeStatus: result.judgeStatus,
          judgeError: result.judgeError,
          talkRatio: result.talkRatio,
          coachingNotes: result.coachingNotes,
          needsReview: result.needsReview,
        },
        result.findings,
      );
      await calls.setStatus(client, call.id, "scored");
      await announceScored(client, call.id);
    });
    log.info(
      {
        callId: call.id,
        judge: result.judgeStatus,
        needsReview: result.needsReview,
        findings: result.findings.length,
      },
      "scored",
    );
  } catch (error) {
    await handleFailure(deps, job, error, QUEUES.score, "transcribed");
  }
}

async function handleFailure(
  deps: JobDeps,
  job: JobInfo,
  error: unknown,
  queue: "transcribe" | "score",
  /** The state that lets the next attempt claim the call again. */
  ready: "uploaded" | "transcribed",
): Promise<void> {
  const { pool, log } = deps;
  if (error instanceof RateLimitedError) {
    const reschedules = (job.reschedules ?? 0) + 1;
    if (reschedules > MAX_RESCHEDULES) {
      await failCall(
        pool,
        job.callId,
        "The model provider kept rate limiting this call; retry later or raise the plan limits",
      );
      return;
    }
    const seconds = Math.ceil(error.waitMs / 1000) + 1;
    log.warn(
      { callId: job.callId, seconds, model: error.model, reschedules },
      `${queue}: rate limited, rescheduled`,
    );
    await calls.setStatus(pool, job.callId, ready);
    await deps.enqueue(queue, { callId: job.callId, reschedules }, { startAfterSeconds: seconds });
    return;
  }
  if (error instanceof AudioError) {
    await failCall(pool, job.callId, error.message);
    return;
  }
  if (error instanceof BudgetExceededError) {
    await failCall(pool, job.callId, BUDGET_MESSAGE);
    return;
  }
  log.error({ err: error, callId: job.callId, attempt: job.retryCount }, `${queue} failed`);
  if (job.retryCount >= RETRY_LIMIT) {
    await failCall(
      pool,
      job.callId,
      queue === "transcribe"
        ? "Transcription failed after several attempts; retry later"
        : "Scoring failed after several attempts; retry later",
    );
    return;
  }
  // Hand the call back so pg-boss's retry of this job can claim it.
  await calls.setStatus(pool, job.callId, ready);
  throw error;
}

/** handlePurge deletes audio past retention and objects no call references after a day. */
export async function handlePurge(
  deps: JobDeps,
  now = new Date(),
): Promise<{ purged: number; orphans: number }> {
  const { pool, storage, log } = deps;
  let purged = 0;
  for (const call of await calls.callsDueForPurge(pool)) {
    await storage.remove([call.storage_path]);
    await calls.markPurged(pool, call.id);
    await audit(pool, null, "audio_purged", call.id);
    purged++;
  }
  let orphans = 0;
  const dayAgo = now.getTime() - 24 * 3600 * 1000;
  for (const folder of await storage.list("")) {
    const objects = await storage.list(folder.name);
    const paths = objects.map((o) => `${folder.name}/${o.name}`);
    const known = await calls.knownStoragePaths(pool, paths);
    const stale = objects
      .filter((o) => !known.has(`${folder.name}/${o.name}`))
      .filter((o) => o.createdAt !== null && new Date(o.createdAt).getTime() < dayAgo)
      .map((o) => `${folder.name}/${o.name}`);
    await storage.remove(stale);
    orphans += stale.length;
  }
  const stuck = await calls.failStuckCalls(pool, 2 * 3600);
  const apiRequests = await purgeApiTraffic(pool);
  const deliveries = await purgeDeliveries(pool);
  await pool.query("DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours'");
  log.info({ purged, orphans, stuck, apiRequests, deliveries }, "purge done");
  return { purged, orphans };
}
