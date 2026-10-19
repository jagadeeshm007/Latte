// Writes .env.docker for the local stack (docker-compose.yml, ADR-0028): a
// database password, the Auth signing keys (ES256 for user sessions, HS256 for
// the anon and service keys), the app's own secrets, and the model keys. It
// never overwrites a value already in the file, so running it again keeps the
// same keys and data working. Model keys come from the environment
// (GROQ_API_KEY=gsk_... make up), or else from the model-key lines of an
// existing .env; nothing else is read from it.
// Plain Node, no dependencies; `make up` runs it in a node container when the
// host has no Node.
import { Buffer } from "node:buffer";
import { createHmac, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/** LATTE_ENV_FILE writes elsewhere, for checking the generator without touching real keys. */
const file = path.resolve(
  process.env.LATTE_ENV_FILE ?? path.join(import.meta.dirname, "../.env.docker"),
);
const MODEL_KEYS = ["GROQ_API_KEY", "SARVAM_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"];

/** The values already in the file, unquoted. */
function readExisting() {
  if (!existsSync(file)) return new Map();
  const entries = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1).replace(/^'(.*)'$/, "$1")];
    });
  return new Map(entries);
}

const b64url = (data) => Buffer.from(data).toString("base64url");

/** An HS256 JWT for the anon or service role, as Supabase issues them. */
function roleKey(role, secret) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ role, iss: "supabase", iat: now, exp: now + 10 * 365 * 24 * 3600 }),
  );
  const signature = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${signature}`;
}

/** Auth signs sessions with the EC key; the oct key keeps HS256 role keys valid. */
function signingKeys(secret) {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = privateKey.export({ format: "jwk" });
  const kid = randomUUID();
  const ec = {
    kty: "EC",
    kid,
    use: "sig",
    alg: "ES256",
    ext: true,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
  };
  const oct = { kty: "oct", k: b64url(secret), alg: "HS256" };
  return {
    JWT_KEYS: JSON.stringify([{ ...ec, key_ops: ["sign", "verify"], d: jwk.d }, oct]),
    JWT_JWKS: JSON.stringify({ keys: [{ ...ec, key_ops: ["verify"] }, oct] }),
  };
}

const values = readExisting();
const set = (name, make) => {
  if (!values.get(name)) values.set(name, make());
};

set("POSTGRES_PASSWORD", () => randomBytes(24).toString("hex"));
set("JWT_SECRET", () => randomBytes(32).toString("hex"));
const secret = values.get("JWT_SECRET");
if (!values.get("JWT_KEYS") || !values.get("JWT_JWKS")) {
  const keys = signingKeys(secret);
  values.set("JWT_KEYS", keys.JWT_KEYS);
  values.set("JWT_JWKS", keys.JWT_JWKS);
}
set("ANON_KEY", () => roleKey("anon", secret));
set("SERVICE_ROLE_KEY", () => roleKey("service_role", secret));
set("EXPORT_LINK_SECRET", () => randomBytes(32).toString("hex"));
set("DATA_ENCRYPTION_KEY", () => randomBytes(32).toString("hex"));
/** Only the model keys from a developer's .env, so the hosted settings stay out. */
function modelKeysFromDotenv() {
  const dotenv = path.resolve(import.meta.dirname, "../.env");
  if (!existsSync(dotenv)) return new Map();
  const found = readFileSync(dotenv, "utf8")
    .split("\n")
    .map((line) => /^([A-Z_]+)=(.*)$/.exec(line.trim()))
    .filter((m) => m && MODEL_KEYS.includes(m[1]) && m[2] && !m[2].includes("REPLACE_ME"))
    .map((m) => [m[1], m[2].replace(/^["'](.*)["']$/, "$1")]);
  return new Map(found);
}
const fromDotenv = modelKeysFromDotenv();
for (const name of MODEL_KEYS) {
  const given = process.env[name] || (values.get(name) ? "" : fromDotenv.get(name));
  if (given) values.set(name, given);
  else if (!values.has(name)) values.set(name, "");
}

const lines = [
  "# Local stack secrets, written by scripts/docker-env.js. Never commit this file.",
  "# Add a model key below (GROQ_API_KEY at least), then run `make up` again.",
  ...[...values].map(([k, v]) => `${k}='${v}'`),
  "",
];
writeFileSync(file, lines.join("\n"), { mode: 0o600 });

const missing = !values.get("GROQ_API_KEY");
process.stdout.write(
  `docker-env: .env.docker ready${missing ? "; GROQ_API_KEY is empty, so calls will not be scored" : ""}\n`,
);
