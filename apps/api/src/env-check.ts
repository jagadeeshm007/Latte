// Prints which configuration variables are set, never their values, and
// whether the configuration parses. Run: pnpm --filter @scc/api env:check
import { ConfigError, databaseUrl, loadConfig } from "./config.ts";

const NAMES = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_JWKS_URL",
  "GROQ_API_KEY",
  "LLM_BUDGET_USD",
  "MODEL_MODE",
];

for (const name of NAMES) {
  const value = process.env[name];
  process.stdout.write(`${name.padEnd(26)} ${value ? "set" : "missing"}\n`);
}

try {
  const config = loadConfig();
  const url = new URL(databaseUrl(config));
  process.stdout.write(`database host              ${url.hostname}:${url.port}\n`);
  process.stdout.write("config                      ok\n");
} catch (error) {
  if (error instanceof ConfigError) {
    process.stdout.write(`${error.message.replace(/received .*$/gm, "")}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
