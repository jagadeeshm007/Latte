-- Migration 0009 (SCC-1, 2026-10-16): webhooks through an outbox, idempotency
-- keys, and key rotation (ADR-0021, ADR-0022).
-- webhook_endpoints keep the signing secret encrypted (AES-256-GCM under
-- DATA_ENCRYPTION_KEY), because signing needs it back. webhook_deliveries is
-- the outbox: rows are written in the same transaction as the change they
-- announce, and a sender delivers the ones that are due. idempotency_keys
-- remember a create request's response for 24 hours so a retry replays it.
-- batches.completed_at makes batch.completed fire once per run.
-- Index decision: the sender scans due pending deliveries; the developer page
-- lists an endpoint's deliveries newest first; idempotency looks up by
-- (owner, key) and the purge deletes by age.
-- Down: down/0009_webhooks_idempotency.sql.
CREATE TABLE webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  events text[] NOT NULL,
  secret_ciphertext text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  disabled_reason text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  CONSTRAINT chk_webhook_endpoints_url CHECK (url ~ '^https://' AND length(url) <= 2000),
  CONSTRAINT chk_webhook_endpoints_events CHECK (
    cardinality(events) > 0
    AND events <@ ARRAY['call.scored', 'call.failed', 'batch.completed', 'alert.triggered', 'digest.ready', 'ping']::text[]
  )
);
COMMENT ON TABLE webhook_endpoints IS 'HTTPS endpoints that receive signed event notifications';
COMMENT ON COLUMN webhook_endpoints.secret_ciphertext IS 'Signing secret, AES-256-GCM under DATA_ENCRYPTION_KEY; shown once at creation';
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_status integer,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_webhook_deliveries_status CHECK (status IN ('pending', 'succeeded', 'failed'))
);
COMMENT ON TABLE webhook_deliveries IS 'The webhook outbox: one row per event per endpoint, with its delivery attempts';
CREATE INDEX ix_webhook_deliveries_due ON webhook_deliveries (next_attempt_at) WHERE status = 'pending';
CREATE INDEX ix_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, created_at DESC);
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE TABLE idempotency_keys (
  owner text NOT NULL,
  key text NOT NULL,
  method text NOT NULL,
  route text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, key),
  CONSTRAINT chk_idempotency_keys_status CHECK (status IN ('in_progress', 'done'))
);
COMMENT ON TABLE idempotency_keys IS 'Create requests seen with an Idempotency-Key, and their responses, for 24 hours';
CREATE INDEX ix_idempotency_keys_created ON idempotency_keys (created_at);
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE batches ADD COLUMN completed_at timestamptz;
COMMENT ON COLUMN batches.completed_at IS 'When every call in the batch last reached scored or failed; cleared by a retry';

ALTER TABLE api_keys DROP CONSTRAINT chk_api_keys_scopes;
ALTER TABLE api_keys ADD CONSTRAINT chk_api_keys_scopes CHECK (
  cardinality(scopes) > 0
  AND scopes <@ ARRAY['calls:read', 'calls:write', 'batches:read', 'batches:write', 'exports:read', 'analytics:read', 'webhooks:write']::text[]
);

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted')
);
