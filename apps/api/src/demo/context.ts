import type { Config } from "../config.ts";
import { type DemoKeys, demoKeys } from "./keys.ts";
import { createPool, DEMO_SEARCH_PATH, type Pool } from "../db/pool.ts";

// What demo mode needs beyond the app's own dependencies (ADR-0033). Absent
// when DEMO_MODE is off: then nothing of the demo is reachable.

export interface DemoContext {
  /** Connections on DEMO_SEARCH_PATH: the demo schema, never public. */
  pool: Pool;
  keys: DemoKeys;
  /** Demo uploads scored per UTC day, across every visitor. */
  dailyUploads: number;
}

/** openDemo builds the demo context when DEMO_MODE is on, with a one-connection pool. */
export function openDemo(
  config: Pick<
    Config,
    | "DEMO_MODE"
    | "DEMO_SECRET"
    | "DEMO_DAILY_UPLOADS"
    | "DATABASE_URL"
    | "DB_SSL"
    | "DB_SSL_CA"
    | "SUPABASE_POOLER_HOST"
  >,
): DemoContext | undefined {
  if (!config.DEMO_MODE || !config.DEMO_SECRET) return undefined;
  return {
    pool: createPool({ ...config, DB_POOL_MAX: 1, searchPath: DEMO_SEARCH_PATH }),
    keys: demoKeys(config.DEMO_SECRET),
    dailyUploads: config.DEMO_DAILY_UPLOADS,
  };
}
