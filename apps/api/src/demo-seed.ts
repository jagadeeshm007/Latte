// Loads the demo's sample calls into the demo schema (ADR-0033) and queues
// them for the pipeline. Unlike seed and load-seed it may run against
// production: it only ever connects on the demo search path, and seedDemo
// refuses to start otherwise. Run: pnpm --filter @scc/api demo-seed
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { loadConfig } from "./config.ts";
import { createPool, DEMO_SEARCH_PATH } from "./db/pool.ts";
import { DEMO_FOLDER, demoEnqueue } from "./demo/scoped.ts";
import { seedDemo } from "./demo/seed.ts";
import { openJobSystem } from "./jobs/adapters/index.ts";
import { enqueueVia } from "./jobs/bus.ts";

const ROOT = path.resolve(import.meta.dirname, "../../../evals");
const config = loadConfig();
const pool = createPool({ ...config, DB_POOL_MAX: 1, searchPath: DEMO_SEARCH_PATH });
const { bus } = await openJobSystem(config);
const bucket = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from(config.RECORDINGS_BUCKET);
const out = (line: string) => process.stdout.write(`${line}\n`);
const publish = demoEnqueue(enqueueVia(bus));

try {
  const result = await seedDemo(
    {
      pool,
      putObject: async (objectPath, bytes) => {
        const { error } = await bucket.upload(`${DEMO_FOLDER}/${objectPath}`, bytes, {
          contentType: "audio/wav",
        });
        if (error) throw new Error(`upload ${objectPath}: ${error.message}`);
      },
      // A publish that fails here is not lost: the minute sweep republishes waiting calls.
      enqueue: async (queue, data, options) => {
        try {
          await publish(queue, data, options);
        } catch (error) {
          out(`could not queue ${data.callId ?? "a call"} (${String(error)}); the sweep will`);
        }
      },
    },
    { scripts: path.join(ROOT, "calls"), audio: path.join(ROOT, "audio", "calls") },
  );
  out(`demo-seed: ${String(result.added)} calls queued, ${String(result.existing)} already loaded`);
} finally {
  await bus.stop();
  await pool.end();
}
