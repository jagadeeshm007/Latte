-- Migration 0008 (SCC-1, 2026-10-16): API keys, their request log and rate-limit windows (ADR-0018).
-- A key belongs to the manager who created it and acts as them, limited to its
-- scopes. Only a SHA-256 hash of the secret is stored (the secret is 32 random
-- bytes, so a slow hash adds nothing); the prefix finds the row.
-- api_requests holds one row per request made with a key, for the developer
-- logs and metrics; the nightly purge keeps 30 days. rate_limit_windows holds
-- a counter per key, bucket and fixed window, so limits hold across processes;
-- the purge keeps one day.
-- Index decision: logs and metrics read a key's requests newest first over a
-- date range; the purge deletes by age.
-- Down: down/0008_api_keys.sql.
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text NOT NULL,
  secret_hash bytea NOT NULL,
  scopes text[] NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT uq_api_keys_prefix UNIQUE (prefix),
  CONSTRAINT chk_api_keys_name CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_api_keys_prefix CHECK (prefix ~ '^[a-z0-9]{8}$'),
  CONSTRAINT chk_api_keys_hash CHECK (octet_length(secret_hash) = 32),
  CONSTRAINT chk_api_keys_scopes CHECK (
    cardinality(scopes) > 0
    AND scopes <@ ARRAY['calls:read', 'calls:write', 'batches:read', 'batches:write', 'exports:read', 'analytics:read']::text[]
  ),
  CONSTRAINT chk_api_keys_limits CHECK (jsonb_typeof(limits) = 'object')
);
COMMENT ON TABLE api_keys IS 'Keys machine clients use to call the API as the manager who created them, within scopes';
COMMENT ON COLUMN api_keys.secret_hash IS 'SHA-256 of the secret; the secret itself is shown once and never stored';
COMMENT ON COLUMN api_keys.limits IS 'Per-bucket overrides of the default request limits, e.g. {"read": 1200}';
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE batches ADD CONSTRAINT fk_batches_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE RESTRICT;

CREATE TABLE api_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES api_keys (id) ON DELETE CASCADE,
  method text NOT NULL,
  route text NOT NULL,
  bucket text NOT NULL,
  status smallint NOT NULL,
  duration_ms integer NOT NULL,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_api_requests_bucket CHECK (bucket IN ('read', 'single', 'batch', 'bulk'))
);
COMMENT ON TABLE api_requests IS 'One row per request made with an API key: the route template, never the path or body';
CREATE INDEX ix_api_requests_key_created ON api_requests (api_key_id, created_at DESC);
CREATE INDEX ix_api_requests_created ON api_requests (created_at);
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE rate_limit_windows (
  api_key_id uuid NOT NULL REFERENCES api_keys (id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL,
  PRIMARY KEY (api_key_id, bucket, window_start)
);
COMMENT ON TABLE rate_limit_windows IS 'Requests counted per key, bucket and fixed window, shared by every API process';
ALTER TABLE rate_limit_windows ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_events ADD COLUMN api_key_id uuid REFERENCES api_keys (id) ON DELETE RESTRICT;
COMMENT ON COLUMN audit_events.api_key_id IS 'The API key an action was about or made with';

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked')
);
