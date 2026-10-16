-- Reverses 0008_api_keys.sql. Kept out of the migrations folder's top level so
-- migrate.ts never applies it; the integration suite runs it.
-- Fails (and changes nothing) while audit rows use the new actions.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported')
);
ALTER TABLE audit_events DROP COLUMN api_key_id;
DROP TABLE rate_limit_windows;
DROP TABLE api_requests;
ALTER TABLE batches DROP CONSTRAINT fk_batches_api_key;
DROP TABLE api_keys;
