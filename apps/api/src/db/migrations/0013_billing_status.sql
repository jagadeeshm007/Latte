-- Migration 0013 (SCC-1, 2026-10-18): usage statements and the status page
-- (ADR-0026).
-- billing_prices is a single row: what a scored call, an audio minute and
-- model spend cost the customer, in their currency. Statements are worked
-- out from calls and model_calls when asked; nothing is stored per month.
-- status_checks records each component's health every few minutes, for the
-- uptime history; status_notices are incidents a manager posts.
-- Index decision: uptime reads a component's checks by time; the purge
-- deletes by age.
-- Down: down/0013_billing_status.sql.
CREATE TABLE billing_prices (
  id integer PRIMARY KEY DEFAULT 1,
  currency text NOT NULL DEFAULT 'INR',
  usd_rate numeric(10,4) NOT NULL DEFAULT 88,
  per_call numeric(10,2) NOT NULL DEFAULT 5,
  per_audio_minute numeric(10,2) NOT NULL DEFAULT 1,
  model_markup_pct numeric(6,2) NOT NULL DEFAULT 20,
  updated_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_billing_prices_single CHECK (id = 1),
  CONSTRAINT chk_billing_prices_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_billing_prices_numbers CHECK (
    usd_rate > 0 AND per_call >= 0 AND per_audio_minute >= 0 AND model_markup_pct BETWEEN 0 AND 1000)
);
COMMENT ON COLUMN billing_prices.usd_rate IS 'Units of the currency per US dollar, for model spend';
INSERT INTO billing_prices (id) VALUES (1);
ALTER TABLE billing_prices ENABLE ROW LEVEL SECURITY;

CREATE TABLE status_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  component text NOT NULL,
  ok boolean NOT NULL,
  latency_ms integer,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_status_checks_component CHECK (component IN ('api', 'database', 'storage', 'processing', 'models'))
);
CREATE INDEX ix_status_checks_component ON status_checks (component, checked_at DESC);
ALTER TABLE status_checks ENABLE ROW LEVEL SECURITY;

CREATE TABLE status_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  severity text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT chk_status_notices_severity CHECK (severity IN ('info', 'degraded', 'outage')),
  CONSTRAINT chk_status_notices_title CHECK (length(btrim(title)) BETWEEN 1 AND 120)
);
CREATE INDEX ix_status_notices_started ON status_notices (started_at DESC);
ALTER TABLE status_notices ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted', 'pii_revealed', 'team_retention_changed', 'member_invited',
             'member_updated', 'billing_prices_updated', 'status_notice_posted',
             'status_notice_resolved')
);
