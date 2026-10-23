// Loads the rendered seed calls (evals/audio/calls/*.wav) into the app as if
// the seeded QA reviewer had uploaded them: object into the private bucket,
// call row, transcribe job. The worker then runs the real pipeline.
// Development only. Run: pnpm --filter @scc/api load-seed
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { ENGLISH, languageSchema } from "@scc/shared";
import { createClient } from "@supabase/supabase-js";

import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { openJobSystem } from "./jobs/adapters/index.ts";
import { enqueueVia } from "./jobs/bus.ts";
import { QUEUES } from "./jobs/queue.ts";
import * as batches from "./repo/batches.ts";
import * as calls from "./repo/calls.ts";
import { audit } from "./repo/reference.ts";

const ROOT = path.resolve(import.meta.dirname, "../../../evals");
const config = loadConfig();
if (config.NODE_ENV === "production") {
  throw new Error("load-seed loads synthetic calls; it never runs in production");
}
const pool = createPool(config);
const { bus } = await openJobSystem(config);
const enqueue = enqueueVia(bus);
const storage = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from(config.RECORDINGS_BUCKET);
const out = (line: string) => process.stdout.write(`${line}\n`);

try {
  const qa = await pool.query<{ id: string }>(
    "SELECT id FROM profiles WHERE email = 'qa@salescall.test'",
  );
  const uploader = qa.rows[0]?.id;
  if (!uploader) throw new Error("run the seed first: no qa@salescall.test profile");
  const files = (await readdir(path.join(ROOT, "audio", "calls")))
    .filter((f) => f.endsWith(".wav"))
    .sort();
  let loaded = 0;
  // One batch for the whole load, created with its first call.
  let batchId: string | null = null;
  for (const file of files) {
    const id = file.replace(/\.wav$/, "");
    const exists = await pool.query("SELECT 1 FROM calls WHERE original_filename = $1", [file]);
    if (exists.rowCount) continue;
    const script = JSON.parse(await readFile(path.join(ROOT, "calls", `${id}.json`), "utf8")) as {
      agentCode: string;
      product: string;
      languageCode?: string;
    };
    const ref = await pool.query<{ agent_id: string; team_id: string; product_id: string }>(
      `SELECT a.id AS agent_id, a.team_id, p.id AS product_id
         FROM agents a, products p WHERE a.external_code = $1 AND p.name = $2`,
      [script.agentCode, script.product],
    );
    const r = ref.rows[0];
    if (!r)
      throw new Error(`no agent ${script.agentCode} or product ${script.product}; run the seed`);
    const bytes = await readFile(path.join(ROOT, "audio", "calls", file));
    const objectPath = `${uploader}/${randomUUID()}.wav`;
    const { error } = await storage.upload(objectPath, bytes, { contentType: "audio/wav" });
    if (error) throw new Error(`upload ${file}: ${error.message}`);
    batchId ??= await batches.insertBatch(pool, {
      name: `Seed calls ${new Date().toISOString().slice(0, 10)}`,
      createdBy: uploader,
      source: "web",
    });
    const callId = await calls.insertCall(pool, {
      agentId: r.agent_id,
      teamId: r.team_id,
      productId: r.product_id,
      callDate: new Date().toISOString().slice(0, 10),
      batchId,
      uploadedBy: uploader,
      originalFilename: file,
      mimeType: "audio/wav",
      sizeBytes: bytes.length,
      storagePath: objectPath,
      retentionDays: config.AUDIO_RETENTION_DAYS,
      // English and Hinglish scripts go to Whisper; the code-mixed Hindi and Telugu
      // ones (evals/src/regional.ts) carry their language and go to Sarvam.
      language: languageSchema.parse(script.languageCode ?? ENGLISH),
    });
    await audit(pool, uploader, "call_uploaded", callId);
    await enqueue(QUEUES.transcribe, { callId });
    loaded++;
    out(`queued ${file}`);
  }
  out(`load-seed: ${String(loaded)} calls queued, ${String(files.length - loaded)} already loaded`);
} finally {
  await bus.stop();
  await pool.end();
}
