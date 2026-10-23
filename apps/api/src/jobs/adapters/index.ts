import { readFileSync } from "node:fs";

import { type Config, databaseUrl, sslOptions } from "../../config.ts";
import type { JobBus, Scheduler } from "../bus.ts";
import { pgBossBus, pgBossScheduler, startBoss } from "./pgboss.ts";

// The one place that maps JOB_QUEUE to an adapter (ADR-0032). Adding a queue
// system (Kafka, SQS, RabbitMQ) is a new entry in OPENERS, a new value for
// JOB_QUEUE in config.ts, and an adapter that passes bus.contract.ts.

export interface JobSystem {
  bus: JobBus;
  /** Cron for purge, alerts, digests and status; null where something outside runs them (pg_cron on Vercel). */
  scheduler: Scheduler | null;
}

type JobConfig = Pick<
  Config,
  "JOB_QUEUE" | "DATABASE_URL" | "SUPABASE_POOLER_HOST" | "DB_SSL" | "DB_SSL_CA"
>;

type Opener = (config: JobConfig, serverless: boolean) => Promise<JobSystem>;

/** One opener per JOB_QUEUE value: the Record type makes a value without an adapter a type error. */
const OPENERS: Record<JobConfig["JOB_QUEUE"], Opener> = {
  pgboss: async (config, serverless) => {
    const boss = await startBoss(
      databaseUrl(config),
      sslOptions(config, (p) => readFileSync(p, "utf8")),
      serverless ? { maintenance: false, max: 1 } : {},
    );
    return { bus: pgBossBus(boss), scheduler: serverless ? null : pgBossScheduler(boss) };
  },
};

/** openJobSystem connects the configured queue system; serverless instances neither supervise nor schedule. */
export function openJobSystem(
  config: JobConfig,
  options: { serverless?: boolean } = {},
): Promise<JobSystem> {
  return OPENERS[config.JOB_QUEUE](config, options.serverless ?? false);
}
