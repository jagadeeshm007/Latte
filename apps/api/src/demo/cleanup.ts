import { inTransaction, type Pool } from "../db/pool.ts";
import type { Storage } from "../storage.ts";

// The demo's daily cleanup (ADR-0033), run by the purge on the demo pool:
// a visitor lasts a day, a device's used upload a week, the counters a
// little longer than the limits that read them. Seeded calls belong to no
// visitor and are never touched here.

/**
 * clearExpiredVisitors deletes visitors whose visit has ended, with their
 * calls, batches, audit rows and profile, then the counters past their time.
 */
export async function clearExpiredVisitors(
  demoPool: Pool,
  storage: Storage,
): Promise<{ visitors: number }> {
  const removed = await inTransaction(demoPool, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      "SELECT id FROM visitors WHERE expires_at < now() FOR UPDATE",
    );
    const gone = rows.map((r) => r.id);
    if (gone.length === 0) return { gone, paths: [] as string[] };
    const paths = await db.query<{ storage_path: string }>(
      "SELECT storage_path FROM calls WHERE uploaded_by = ANY($1::uuid[]) AND storage_path IS NOT NULL",
      [gone],
    );
    // Children first: these references refuse to let a profile or call go.
    await db.query("DELETE FROM audit_events WHERE actor_id = ANY($1::uuid[])", [gone]);
    await db.query("DELETE FROM finding_reviews WHERE reviewer_id = ANY($1::uuid[])", [gone]);
    await db.query("DELETE FROM calls WHERE uploaded_by = ANY($1::uuid[])", [gone]);
    await db.query("DELETE FROM batches WHERE created_by = ANY($1::uuid[])", [gone]);
    await db.query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [gone]);
    return { gone, paths: paths.rows.map((r) => r.storage_path) };
  });
  if (removed.paths.length > 0) await storage.remove(removed.paths);
  await demoPool.query(
    `DELETE FROM device_uploads WHERE uploaded_at < now() - interval '7 days';
     DELETE FROM daily_uploads WHERE day < (now() AT TIME ZONE 'UTC')::date - 30;
     DELETE FROM session_starts WHERE hour < now() - interval '2 days';`,
  );
  return { visitors: removed.gone.length };
}
