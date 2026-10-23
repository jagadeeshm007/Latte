import path from "node:path";

import { attachDatabasePool } from "@vercel/functions";

import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { openJobSystem } from "./jobs/adapters/index.ts";
import { enqueueVia } from "./jobs/bus.ts";
import { createLogger } from "./logger.ts";
import { createStorage } from "./storage.ts";
import { buildGateway } from "./wiring.ts";

// What every Vercel Function builds once per instance: the API (vercel.ts)
// and the queue consumer (vercel-queues.ts). The job system runs without
// supervision or schedules here (ADR-0032).

/** openServerless reads the config and opens the database, storage, gateway and job bus. */
export async function openServerless() {
  const loaded = loadConfig();
  // The build ships the database CA beside the bundle; a relative path means "next to this file".
  const config = {
    ...loaded,
    DB_SSL_CA: loaded.DB_SSL_CA && path.resolve(import.meta.dirname, loaded.DB_SSL_CA),
  };
  const log = createLogger(config);
  const pool = createPool(config);
  const storage = createStorage(config);
  const { bus } = await openJobSystem(config, { serverless: true });
  // Idle connections are closed before Vercel suspends the instance.
  attachDatabasePool(pool);
  return {
    config,
    log,
    pool,
    storage,
    bus,
    queue: enqueueVia(bus),
    gateway: buildGateway(config, pool),
    webhookDeps: { pool, log, encryptionKey: config.DATA_ENCRYPTION_KEY },
  };
}
