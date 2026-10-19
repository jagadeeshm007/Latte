import type { Logger } from "pino";

import type { AuthAdmin } from "../auth-admin.ts";
import type { CronJobs } from "./cron.ts";
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
  > &
    Partial<Pick<Config, "EXPORT_LINK_SECRET" | "DATA_ENCRYPTION_KEY" | "CRON_SECRET">>;
  pool: Pool;
  storage: Storage;
  enqueue: Enqueue;
  verify: VerifyToken;
  log: Logger;
  /** Supabase Auth's admin side, for invitations; absent where inviting is not set up. */
  authAdmin?: AuthAdmin;
  /** The scheduled tasks behind /api/cron/*; only the Vercel entry point provides them. */
  cron?: CronJobs;
}
