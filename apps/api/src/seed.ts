// Development seed: teams, products, agents, the default rubric, the private
// recordings bucket and one sign-in per role. Safe to run again: everything
// is upserted. Run: pnpm --filter @scc/api seed
import { randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Role } from "@scc/shared";
import { createClient } from "@supabase/supabase-js";

import { loadConfig } from "./config.ts";
import { createPool, inTransaction } from "./db/pool.ts";
import { PRODUCTS, TEAMS, upsertReference } from "./seed-reference.ts";
import { createStorage } from "./storage.ts";

const USERS: { email: string; name: string; role: Role; agentCode?: string }[] = [
  { email: "qa@salescall.test", name: "Priya Nair (QA)", role: "qa_reviewer" },
  { email: "manager@salescall.test", name: "Arjun Mehta (Manager)", role: "manager" },
  { email: "ravi@salescall.test", name: "Ravi Kumar", role: "agent", agentCode: "AG001" },
  { email: "anita@salescall.test", name: "Anita Sharma", role: "agent", agentCode: "AG002" },
];

const config = loadConfig();
if (config.NODE_ENV === "production") {
  throw new Error("the seed creates demo users with known roles; it never runs in production");
}
const pool = createPool(config);
const out = (line: string) => process.stdout.write(`${line}\n`);

try {
  await createStorage(config).ensureBucket();
  out(`bucket ${config.RECORDINGS_BUCKET}: private`);

  const agentIds = await inTransaction(pool, (db) => upsertReference(db, out));
  out(
    `reference: ${String(TEAMS.length)} teams, ${String(PRODUCTS.length)} products, ${String(agentIds.size)} agents`,
  );

  // Each user gets their own generated password, set when the user is created
  // or when the seed runs with --reset-passwords; nothing comes from a shared
  // or example value (security review).
  const reset = process.argv.includes("--reset-passwords");
  const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (existing.error) throw existing.error;
  const issued: string[] = [];
  for (const u of USERS) {
    const password = `Dev-${randomBytes(18).toString("base64url")}`;
    let id = existing.data.users.find((x) => x.email === u.email)?.id;
    if (id && reset) {
      const updated = await admin.auth.admin.updateUserById(id, { password });
      if (updated.error) throw updated.error;
      issued.push(`${u.role.padEnd(12)} ${u.email}  ${password}`);
    } else if (!id) {
      const created = await admin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
      });
      if (created.error) throw created.error;
      id = created.data.user.id;
      issued.push(`${u.role.padEnd(12)} ${u.email}  ${password}`);
    }
    await pool.query(
      `INSERT INTO profiles (id, email, display_name, role, agent_id) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET email = $2, display_name = $3, role = $4, agent_id = $5, updated_at = now()`,
      [id, u.email, u.name, u.role, u.agentCode ? (agentIds.get(u.agentCode) ?? null) : null],
    );
  }
  if (issued.length > 0) {
    // Credentials go to a git-ignored file readable only by you, never to the terminal.
    const dir = path.resolve(import.meta.dirname, "../../../.scratch");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "seed-users.txt");
    await writeFile(
      file,
      `# role        email  password (generated ${new Date().toISOString()})\n${issued.join("\n")}\n`,
    );
    await chmod(file, 0o600);
  }
  out(
    issued.length > 0
      ? `users: ${String(issued.length)} passwords issued; sign-in details in .scratch/seed-users.txt`
      : `users: ${String(USERS.length)} already exist; passwords unchanged (run with --reset-passwords to issue new ones)`,
  );
} finally {
  await pool.end();
}
