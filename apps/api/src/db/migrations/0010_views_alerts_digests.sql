-- Migration 0010 (SCC-1, 2026-10-16): saved views, the in-app inbox, alert
-- rules and digests (ADR-0025).
-- saved_views keep a page's filters under a name, for one person or shared.
-- notifications are the inbox: alerts and digests land here (no email).
-- alert_rules watch a metric per team, product or agent against its own
-- baseline; alert_firings record each firing and drive the cooldown.
-- digest_subscriptions say who wants a daily or weekly digest.
-- Index decision: the inbox reads a person's notifications newest first and
-- counts the unread; firings are read per rule newest first and checked per
-- (rule, group) for the cooldown.
-- Down: down/0010_views_alerts_digests.sql.
CREATE TABLE saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  page text NOT NULL,
  name text NOT NULL,
  search jsonb NOT NULL,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_saved_views_page CHECK (page IN ('calls', 'performance', 'batches')),
  CONSTRAINT chk_saved_views_name CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_saved_views_search CHECK (jsonb_typeof(search) = 'object')
);
CREATE INDEX ix_saved_views_page ON saved_views (page, owner_id);
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_notifications_kind CHECK (kind IN ('alert', 'digest')),
  CONSTRAINT chk_notifications_link CHECK (link IS NULL OR link ~ '^/')
);
COMMENT ON COLUMN notifications.link IS 'An in-app path, never an outside URL';
CREATE INDEX ix_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX ix_notifications_unread ON notifications (recipient_id) WHERE read_at IS NULL;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric text NOT NULL,
  scope text NOT NULL,
  item_key text,
  threshold_points numeric(6,2) NOT NULL,
  window_days integer NOT NULL DEFAULT 7,
  baseline_days integer NOT NULL DEFAULT 28,
  min_calls integer NOT NULL DEFAULT 5,
  cooldown_hours integer NOT NULL DEFAULT 24,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at timestamptz,
  CONSTRAINT chk_alert_rules_name CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_alert_rules_metric CHECK (metric IN ('flag_rate', 'avg_score', 'item_fail_rate')),
  CONSTRAINT chk_alert_rules_scope CHECK (scope IN ('team', 'product', 'agent')),
  CONSTRAINT chk_alert_rules_item CHECK ((metric = 'item_fail_rate') = (item_key IS NOT NULL)),
  CONSTRAINT chk_alert_rules_numbers CHECK (
    threshold_points > 0 AND window_days BETWEEN 1 AND 30 AND baseline_days BETWEEN 7 AND 180
    AND min_calls BETWEEN 1 AND 1000 AND cooldown_hours BETWEEN 1 AND 720)
);
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE alert_firings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES alert_rules (id) ON DELETE CASCADE,
  group_id text NOT NULL,
  group_name text NOT NULL,
  value numeric(8,2) NOT NULL,
  baseline numeric(8,2) NOT NULL,
  calls integer NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_alert_firings_rule ON alert_firings (rule_id, fired_at DESC);
CREATE INDEX ix_alert_firings_group ON alert_firings (rule_id, group_id, fired_at DESC);
ALTER TABLE alert_firings ENABLE ROW LEVEL SECURITY;

CREATE TABLE digest_subscriptions (
  profile_id uuid PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  frequency text NOT NULL,
  last_sent_at timestamptz,
  CONSTRAINT chk_digest_subscriptions_frequency CHECK (frequency IN ('daily', 'weekly'))
);
ALTER TABLE digest_subscriptions ENABLE ROW LEVEL SECURITY;
