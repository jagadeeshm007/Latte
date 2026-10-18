import type { Notification, SavedView, SavedViewPage } from "@scc/shared";

import type { Queryable } from "../db/pool.ts";

// Saved views, the in-app inbox and digest settings (ADR-0025). Every read
// and write carries the caller: a view is seen by its owner or, when shared,
// by everyone; a notification only by its recipient.

interface ViewRow {
  id: string;
  page: SavedViewPage;
  name: string;
  search: Record<string, string | number | boolean>;
  shared: boolean;
  owner_id: string;
  owner_name: string;
  updated_at: Date;
}

const toView = (r: ViewRow, me: string): SavedView => ({
  id: r.id,
  page: r.page,
  name: r.name,
  search: r.search,
  shared: r.shared,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  mine: r.owner_id === me,
  updatedAt: r.updated_at.toISOString(),
});

export async function listViews(
  db: Queryable,
  me: string,
  page: SavedViewPage,
): Promise<SavedView[]> {
  const { rows } = await db.query<ViewRow>(
    `SELECT v.*, p.display_name AS owner_name FROM saved_views v JOIN profiles p ON p.id = v.owner_id
      WHERE v.page = $2 AND (v.owner_id = $1 OR v.shared)
      ORDER BY (v.owner_id = $1) DESC, lower(v.name), v.id`,
    [me, page],
  );
  return rows.map((r) => toView(r, me));
}

export async function insertView(
  db: Queryable,
  me: string,
  v: { page: SavedViewPage; name: string; search: Record<string, unknown>; shared: boolean },
): Promise<SavedView> {
  const { rows } = await db.query<ViewRow>(
    `WITH v AS (INSERT INTO saved_views (owner_id, page, name, search, shared)
                VALUES ($1, $2, $3, $4, $5) RETURNING *)
     SELECT v.*, p.display_name AS owner_name FROM v JOIN profiles p ON p.id = v.owner_id`,
    [me, v.page, v.name, JSON.stringify(v.search), v.shared],
  );
  const row = rows[0];
  if (!row) throw new Error("insert into saved_views returned no row");
  return toView(row, me);
}

/** updateView changes a view its owner holds; null when there is none (or it is someone else's). */
export async function updateView(
  db: Queryable,
  me: string,
  id: string,
  p: {
    name?: string | undefined;
    search?: Record<string, unknown> | undefined;
    shared?: boolean | undefined;
  },
): Promise<SavedView | null> {
  const { rows } = await db.query<ViewRow>(
    `WITH v AS (UPDATE saved_views
                   SET name = coalesce($3, name), search = coalesce($4::jsonb, search),
                       shared = coalesce($5, shared), updated_at = now()
                 WHERE id = $2 AND owner_id = $1 RETURNING *)
     SELECT v.*, p.display_name AS owner_name FROM v JOIN profiles p ON p.id = v.owner_id`,
    [me, id, p.name ?? null, p.search ? JSON.stringify(p.search) : null, p.shared ?? null],
  );
  return rows[0] ? toView(rows[0], me) : null;
}

export async function deleteView(db: Queryable, me: string, id: string): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM saved_views WHERE id = $1 AND owner_id = $2", [
    id,
    me,
  ]);
  return rowCount === 1;
}

interface NotificationRow {
  id: string;
  kind: "alert" | "digest";
  title: string;
  body: string;
  link: string | null;
  data: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

const toNotification = (r: NotificationRow): Notification => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  link: r.link,
  data: r.data,
  readAt: r.read_at?.toISOString() ?? null,
  createdAt: r.created_at.toISOString(),
});

export async function notify(
  db: Queryable,
  recipients: string[],
  n: {
    kind: "alert" | "digest";
    title: string;
    body: string;
    link: string | null;
    data: Record<string, unknown>;
  },
): Promise<number> {
  if (recipients.length === 0) return 0;
  const { rowCount } = await db.query(
    `INSERT INTO notifications (recipient_id, kind, title, body, link, data)
     SELECT r, $2, $3, $4, $5, $6 FROM unnest($1::uuid[]) r`,
    [
      recipients,
      n.kind,
      n.title.slice(0, 200),
      n.body.slice(0, 2000),
      n.link,
      JSON.stringify(n.data),
    ],
  );
  return rowCount ?? 0;
}

export async function listNotifications(
  db: Queryable,
  me: string,
  f: { unread: boolean; page: number; limit: number },
): Promise<{ items: Notification[]; total: number; unread: number }> {
  const where = `recipient_id = $1${f.unread ? " AND read_at IS NULL" : ""}`;
  const [rows, counts] = await Promise.all([
    db.query<NotificationRow>(
      `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
      [me, f.limit, (f.page - 1) * f.limit],
    ),
    db.query<{ total: number; unread: number }>(
      `SELECT (SELECT count(*)::int FROM notifications WHERE ${where}) AS total,
              (SELECT count(*)::int FROM notifications WHERE recipient_id = $1 AND read_at IS NULL) AS unread`,
      [me],
    ),
  ]);
  return {
    items: rows.rows.map(toNotification),
    total: counts.rows[0]?.total ?? 0,
    unread: counts.rows[0]?.unread ?? 0,
  };
}

export async function unreadCount(db: Queryable, me: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM notifications WHERE recipient_id = $1 AND read_at IS NULL",
    [me],
  );
  return rows[0]?.n ?? 0;
}

/** markRead marks one of the caller's notifications read, or all of them when id is null. */
export async function markRead(db: Queryable, me: string, id: string | null): Promise<number> {
  const { rowCount } = await db.query(
    `UPDATE notifications SET read_at = now()
      WHERE recipient_id = $1 AND read_at IS NULL AND ($2::uuid IS NULL OR id = $2::uuid)`,
    [me, id],
  );
  return rowCount ?? 0;
}

export async function getDigest(db: Queryable, me: string): Promise<"off" | "daily" | "weekly"> {
  const { rows } = await db.query<{ frequency: "daily" | "weekly" }>(
    "SELECT frequency FROM digest_subscriptions WHERE profile_id = $1",
    [me],
  );
  return rows[0]?.frequency ?? "off";
}

export async function setDigest(
  db: Queryable,
  me: string,
  frequency: "off" | "daily" | "weekly",
): Promise<void> {
  if (frequency === "off") {
    await db.query("DELETE FROM digest_subscriptions WHERE profile_id = $1", [me]);
    return;
  }
  await db.query(
    `INSERT INTO digest_subscriptions (profile_id, frequency) VALUES ($1, $2)
     ON CONFLICT (profile_id) DO UPDATE SET frequency = EXCLUDED.frequency`,
    [me, frequency],
  );
}

/** dueDigests: subscriptions whose last digest is older than their period, locked for this run. */
export async function dueDigests(
  db: Queryable,
): Promise<{ profile_id: string; frequency: "daily" | "weekly" }[]> {
  const { rows } = await db.query<{ profile_id: string; frequency: "daily" | "weekly" }>(
    `SELECT profile_id, frequency FROM digest_subscriptions
      WHERE last_sent_at IS NULL
         OR (frequency = 'daily' AND last_sent_at < now() - interval '23 hours')
         OR (frequency = 'weekly' AND last_sent_at < now() - interval '6 days 23 hours')
      FOR UPDATE SKIP LOCKED`,
  );
  return rows;
}

export async function markDigestSent(db: Queryable, profileId: string): Promise<void> {
  await db.query("UPDATE digest_subscriptions SET last_sent_at = now() WHERE profile_id = $1", [
    profileId,
  ]);
}
