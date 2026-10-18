-- Reverses 0009_webhooks_idempotency.sql. Kept out of the migrations folder's
-- top level so migrate.ts never applies it; the integration suite runs it.
-- Fails (and changes nothing) while rows use the new actions or scope.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked')
);
ALTER TABLE api_keys DROP CONSTRAINT chk_api_keys_scopes;
ALTER TABLE api_keys ADD CONSTRAINT chk_api_keys_scopes CHECK (
  cardinality(scopes) > 0
  AND scopes <@ ARRAY['calls:read', 'calls:write', 'batches:read', 'batches:write', 'exports:read', 'analytics:read']::text[]
);
ALTER TABLE batches DROP COLUMN completed_at;
DROP TABLE idempotency_keys;
DROP TABLE webhook_deliveries;
DROP TABLE webhook_endpoints;
