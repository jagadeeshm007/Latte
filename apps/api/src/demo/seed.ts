import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { ENGLISH, languageSchema, type TranscriptLine } from "@scc/shared";

import { assertDemoPath } from "../db/migrate.ts";
import { inTransaction, type Pool } from "../db/pool.ts";
import { PRIORITY, QUEUES, type Enqueue } from "../jobs/queue.ts";
import * as batches from "../repo/batches.ts";
import * as calls from "../repo/calls.ts";
import { audit } from "../repo/reference.ts";
import { upsertReference } from "../seed-reference.ts";
import { toSegments } from "../transcripts.ts";

// The demo's sample calls (ADR-0033): every script in evals/calls, owned by
// a fixed "demo team" profile and queued for the real pipeline, so visitors
// see calls that were really scored. A script with rendered audio becomes an
// audio call; the rest are transcripts. It refuses any pool but the demo's.

/** The profile that owns the seeded calls; no visitor is ever this id. */
export const DEMO_OWNER_ID = "de000000-0000-4000-8000-000000000001";
/** Seeded calls keep their audio for good: the audio purge never reaches them. */
const SEEDED_RETENTION_DAYS = 36_500;
/** Seeded call dates spread over this many days before today. */
const SPREAD_DAYS = 30;

interface Script {
  id: string;
  title: string;
  product: string;
  agentCode: string;
  languageCode?: string;
  lines: { s: "A" | "C"; t: string }[];
}

export interface SeedDemoDeps {
  /** Must search the demo schema alone (assertDemoPath). */
  pool: Pool;
  /** Puts an object under the demo's folder; needed only when there is audio to load. */
  putObject?: (path: string, bytes: Uint8Array) => Promise<void>;
  /** Tags each job for the demo (demoEnqueue). */
  enqueue: Enqueue;
}

export interface SeedDemoOptions {
  scripts: string;
  /** Rendered WAVs named <script id>.wav (make render-seed); optional. */
  audio?: string;
  today?: Date;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function audioFiles(dir: string | undefined): Promise<Set<string>> {
  if (!dir) return new Set();
  try {
    return new Set((await readdir(dir)).filter((f) => f.endsWith(".wav")));
  } catch {
    return new Set();
  }
}

/** seedDemo loads the scripts missing from the demo schema; returns how many it added. */
export async function seedDemo(
  deps: SeedDemoDeps,
  options: SeedDemoOptions,
): Promise<{ added: number; existing: number }> {
  await assertDemoPath(deps.pool);
  const today = options.today ?? new Date();
  const files = (await readdir(options.scripts)).filter((f) => f.endsWith(".json")).sort();
  const rendered = await audioFiles(options.audio);
  const agentIds = await inTransaction(deps.pool, async (db) => {
    const ids = await upsertReference(db, () => undefined);
    await db.query(
      `INSERT INTO profiles (id, email, display_name, role) VALUES ($1, 'demo-team@demo.invalid', 'Latte demo team', 'manager')
       ON CONFLICT (id) DO NOTHING`,
      [DEMO_OWNER_ID],
    );
    return ids;
  });

  let added = 0;
  let batchId: string | null = null;
  for (const [index, file] of files.entries()) {
    const script = JSON.parse(await readFile(path.join(options.scripts, file), "utf8")) as Script;
    const wav = rendered.has(`${script.id}.wav`) ? `${script.id}.wav` : null;
    const filename = wav ?? `${script.id}.txt`;
    const known = await deps.pool.query("SELECT 1 FROM calls WHERE original_filename = $1", [
      filename,
    ]);
    if (known.rowCount) continue;
    const agentId = agentIds.get(script.agentCode);
    const ref = await deps.pool.query<{ team_id: string; product_id: string }>(
      "SELECT a.team_id, p.id AS product_id FROM agents a, products p WHERE a.id = $1 AND p.name = $2",
      [agentId, script.product],
    );
    const r = ref.rows[0];
    if (!agentId || !r)
      throw new Error(`${file}: no agent ${script.agentCode} or product ${script.product}`);
    const day = new Date(today);
    day.setUTCDate(
      day.getUTCDate() -
        Math.round((SPREAD_DAYS * (files.length - 1 - index)) / Math.max(1, files.length - 1)),
    );
    const language = languageSchema.parse(script.languageCode ?? ENGLISH);

    let storagePath: string | null = null;
    let bytes: Uint8Array | null = null;
    if (wav && options.audio && deps.putObject) {
      bytes = await readFile(path.join(options.audio, wav));
      storagePath = `${DEMO_OWNER_ID}/${randomUUID()}.wav`;
      await deps.putObject(storagePath, bytes);
    }
    const lines: TranscriptLine[] = script.lines.map((l) => ({
      speaker: l.s === "A" ? "agent" : "customer",
      text: l.t,
    }));

    const callId = await inTransaction(deps.pool, async (db) => {
      batchId ??= await batches.insertBatch(db, {
        name: "Demo calls",
        createdBy: DEMO_OWNER_ID,
        source: "web",
      });
      const shaped = storagePath ? null : toSegments(lines, language);
      const id = await calls.insertCall(db, {
        agentId,
        teamId: r.team_id,
        productId: r.product_id,
        callDate: isoDay(day),
        batchId,
        uploadedBy: DEMO_OWNER_ID,
        originalFilename: storagePath ? filename : `${script.id}.txt`,
        mimeType: storagePath ? "audio/wav" : "text/plain",
        sizeBytes: bytes?.length ?? Buffer.byteLength(JSON.stringify(lines)),
        storagePath,
        retentionDays: SEEDED_RETENTION_DAYS,
        language,
        ...(shaped ? { input: "transcript" as const, timed: shaped.timed } : {}),
      });
      if (shaped) {
        await calls.replaceSegments(db, id, shaped.segments);
        if (shaped.durationMs !== null) await calls.setDuration(db, id, shaped.durationMs);
      }
      // Dashboards read when a call came in; spread it with the call date.
      await db.query("UPDATE calls SET created_at = $2::date + time '10:00' WHERE id = $1", [
        id,
        isoDay(day),
      ]);
      await audit(db, DEMO_OWNER_ID, "call_uploaded", id);
      return id;
    });
    await deps.enqueue(QUEUES.transcribe, { callId }, { priority: PRIORITY.bulk });
    added++;
  }
  return { added, existing: files.length - added };
}
