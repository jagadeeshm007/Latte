import { buildApp } from "./app.ts";
import { createAuthAdmin } from "./auth-admin.ts";
import { createVerifier, remoteKeys } from "./auth.ts";
import { jwksUrl, loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { openJobSystem } from "./jobs/adapters/index.ts";
import { enqueueVia } from "./jobs/bus.ts";
import { createLogger } from "./logger.ts";
import { createStorage } from "./storage.ts";

// Wiring only: config, pool, queue, app, listen, signals.
const config = loadConfig();
const log = createLogger(config);
const pool = createPool(config);
const storage = createStorage(config);
const { bus } = await openJobSystem(config);
await storage.ensureBucket();

const app = buildApp({
  config,
  pool,
  storage,
  enqueue: enqueueVia(bus),
  verify: createVerifier(remoteKeys(jwksUrl(config)), config.SUPABASE_URL),
  log,
  authAdmin: createAuthAdmin(config),
});

const server = app.listen(config.PORT, config.HOST, () => {
  log.info({ port: config.PORT, env: config.NODE_ENV }, "api started");
});

let closing = false;
async function shutdown(reason: string): Promise<void> {
  if (closing) return;
  closing = true;
  log.info({ reason }, "shutting down");
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close();
  await bus.stop().catch(() => undefined);
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
