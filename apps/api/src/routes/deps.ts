import type { Logger } from "pino";

import type { VerifyToken } from "../auth.ts";
import type { Config } from "../config.ts";
import type { Pool } from "../db/pool.ts";
import type { Enqueue } from "../jobs/queue.ts";
import type { Storage } from "../storage.ts";

/** Everything the HTTP app needs; tests pass fakes for storage, the queue and the token check. */
export interface AppDeps {
  config: Pick<
    Config,
    "AUDIO_RETENTION_DAYS" | "SIGNED_URL_SECONDS" | "LLM_BUDGET_USD" | "WEB_ORIGIN"
  >;
  pool: Pool;
  storage: Storage;
  enqueue: Enqueue;
  verify: VerifyToken;
  log: Logger;
}
