import { randomUUID } from "node:crypto";

import { inTransaction, type Queryable } from "../db/pool.ts";
import { AppError } from "../errors.ts";
import type { DemoContext } from "./context.ts";

// Demo visitors and the counters that bound them (ADR-0033). Every query
// here runs on the demo pool; these tables exist nowhere else.

/** How long a visitor's session and data last. */
export const VISIT_HOURS = 24;
/** Sessions one IP may start per hour. */
export const SESSIONS_PER_HOUR = 5;

/**
 * startVisit counts the IP's session in this hour, then creates a visitor and
 * its manager profile. Over the limit it throws 429 and counts nothing.
 */
export async function startVisit(
  demo: DemoContext,
  fingerprint: string,
  ipHash: string,
): Promise<{ id: string; expiresAt: Date }> {
  return inTransaction(demo.pool, async (db) => {
    const { rows } = await db.query<{ starts: number }>(
      `INSERT INTO session_starts (ip_hash, hour, starts) VALUES ($1, date_trunc('hour', now()), 1)
       ON CONFLICT (ip_hash, hour) DO UPDATE SET starts = session_starts.starts + 1
       RETURNING starts`,
      [ipHash],
    );
    if ((rows[0]?.starts ?? 0) > SESSIONS_PER_HOUR) {
      throw new AppError(
        "too many demo sessions from this network; try again in an hour",
        429,
        "rate_limited",
      );
    }
    const id = randomUUID();
    await db.query(
      `INSERT INTO profiles (id, email, display_name, role) VALUES ($1, $2, 'Demo visitor', 'manager')`,
      [id, `visitor-${id}@demo.invalid`],
    );
    const visit = await db.query<{ expires_at: Date }>(
      `INSERT INTO visitors (id, fingerprint_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(hours => $3)) RETURNING expires_at`,
      [id, fingerprint, VISIT_HOURS],
    );
    const expiresAt = visit.rows[0]?.expires_at;
    if (!expiresAt) throw new Error("visitor not created");
    return { id, expiresAt };
  });
}

/** liveVisitor returns the visitor's device hash while the visit lasts, else null. */
export async function liveVisitor(
  db: Queryable,
  id: string,
): Promise<{ fingerprint: string } | null> {
  const { rows } = await db.query<{ fingerprint_hash: string }>(
    "SELECT fingerprint_hash FROM visitors WHERE id = $1 AND expires_at > now()",
    [id],
  );
  return rows[0] ? { fingerprint: rows[0].fingerprint_hash } : null;
}

/** uploadsLeftToday is the day's cap less the demo uploads already taken. */
export async function uploadsLeftToday(demo: DemoContext): Promise<number> {
  const { rows } = await demo.pool.query<{ uploads: number }>(
    "SELECT uploads FROM daily_uploads WHERE day = (now() AT TIME ZONE 'UTC')::date",
  );
  return Math.max(0, demo.dailyUploads - (rows[0]?.uploads ?? 0));
}
