import { z } from "zod";

// Process configuration from the environment. Construction fails fast and
// names every invalid variable at once. Secrets have no defaults. Nothing
// else in the service reads process.env.

const optional = (schema: z.ZodType<string>) => schema.optional();
const boolString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  LOG_PRETTY: boolString,
  WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  DATABASE_URL: z
    .string()
    .refine((u) => /^postgres(ql)?:\/\//.test(u), "must be a postgres:// URL"),
  // The direct db.<ref>.supabase.co host is IPv6 only; when it is set, the
  // connection is rewritten to this session pooler host (HLD section 6).
  SUPABASE_POOLER_HOST: z.string().default("aws-0-ap-south-1.pooler.supabase.com"),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(3),
  DB_SSL: boolString,
  // Path to the Supabase root CA (Dashboard > Database > SSL). When set, the server certificate is verified.
  DB_SSL_CA: z.string().min(1).optional(),

  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(10),
  SUPABASE_JWKS_URL: optional(z.url()),
  RECORDINGS_BUCKET: z.string().default("recordings"),
  AUDIO_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
  SIGNED_URL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  /**
   * Signs short-lived batch export links (ADR-0017). Set it when more than one
   * API process serves traffic; unset, each process makes its own at start.
   */
  EXPORT_LINK_SECRET: optional(z.string().min(32)),
  /** 32 bytes as 64 hex characters; encrypts webhook signing secrets at rest (ADR-0021). */
  DATA_ENCRYPTION_KEY: optional(z.string().regex(/^[0-9a-fA-F]{64}$/, "64 hex characters")),
  /** Vercel Cron sends it as a bearer token; the cron routes refuse anything else (ADR-0020). */
  CRON_SECRET: optional(z.string().min(32)),

  GROQ_API_KEY: optional(z.string().min(10)),
  OPENROUTER_API_KEY: optional(z.string().min(10)),
  GEMINI_API_KEY: optional(z.string().min(10)),
  /** Sarvam AI, for Indian-language calls (ADR-0014); without it those calls fail with a clear error. */
  SARVAM_API_KEY: optional(z.string().min(10)),
  LLM_PROVIDER: z.enum(["groq", "openrouter", "gemini"]).default("groq"),
  LLM_MODEL: z.string().default("openai/gpt-oss-120b"),
  STT_MODEL: z.string().default("whisper-large-v3"),
  TTS_MODEL: z.string().default("canopylabs/orpheus-v1-english"),
  STT_REGIONAL_MODEL: z.string().default("saaras:v4"),
  TRANSLATE_MODEL: z.string().default("sarvam-translate:v1"),
  LLM_BUDGET_USD: z.coerce.number().positive().default(5),
  MODEL_MODE: z.enum(["live", "replay", "record"]).default("live"),
  CASSETTE_DIR: z.string().default("../../evals/cassettes"),
  LIMIT_LLM_RPM: z.coerce.number().int().positive().default(30),
  LIMIT_LLM_TPM: z.coerce.number().int().positive().default(8000),
  LIMIT_STT_RPM: z.coerce.number().int().positive().default(20),
  LIMIT_STT_AUDIO_SECONDS_PER_HOUR: z.coerce.number().int().positive().default(7200),
  /** Sarvam publishes no tier limits; start low and raise once the account's limit is known. */
  LIMIT_SARVAM_RPM: z.coerce.number().int().positive().default(20),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  /** The queue system behind the job port (ADR-0032); each value is an adapter in src/jobs/adapters. */
  JOB_QUEUE: z.enum(["pgboss", "vercel"]).default("pgboss"),
});

export type Config = z.infer<typeof envSchema>;

/** ConfigError lists every invalid variable, one per line. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * loadConfig parses the environment. An empty string counts as unset, so
 * `GEMINI_API_KEY=` in .env means "not configured", not "too short".
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const present = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    throw new ConfigError(`invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/**
 * databaseUrl returns the URL the pool connects to: a direct Supabase host
 * becomes the session pooler (user postgres.<ref>), anything else is kept.
 */
export function databaseUrl(config: Pick<Config, "DATABASE_URL" | "SUPABASE_POOLER_HOST">): string {
  const url = new URL(config.DATABASE_URL);
  const match = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
  if (match) {
    const ref = match[1] ?? "";
    url.hostname = config.SUPABASE_POOLER_HOST;
    if (!url.username.includes(".")) {
      url.username = `${url.username}.${ref}`;
    }
  }
  return url.toString();
}

/** usesTls says whether the database needs TLS: every Supabase host does. */
export function usesTls(
  config: Pick<Config, "DATABASE_URL" | "DB_SSL" | "SUPABASE_POOLER_HOST">,
): boolean {
  return config.DB_SSL || new URL(databaseUrl(config)).hostname.endsWith("supabase.com");
}

/** jwksUrl is the Supabase Auth JWKS endpoint for this project. */
export function jwksUrl(config: Pick<Config, "SUPABASE_URL" | "SUPABASE_JWKS_URL">): string {
  return (
    config.SUPABASE_JWKS_URL ??
    `${config.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/.well-known/jwks.json`
  );
}

/** sslOptions verifies the server with the given CA when one is configured (security review). */
export function sslOptions(
  config: Pick<Config, "DATABASE_URL" | "DB_SSL" | "DB_SSL_CA" | "SUPABASE_POOLER_HOST">,
  readCa: (path: string) => string,
): { ca: string; rejectUnauthorized: true } | { rejectUnauthorized: false } | undefined {
  if (!usesTls(config)) return undefined;
  return config.DB_SSL_CA
    ? { ca: readCa(config.DB_SSL_CA), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}
