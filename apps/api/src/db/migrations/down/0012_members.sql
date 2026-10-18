-- Reverses 0012_members.sql. Kept out of the migrations folder's top level so
-- migrate.ts never applies it; the integration suite runs it. Fails (and
-- changes nothing) while audit rows use the new actions.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted', 'pii_revealed', 'team_retention_changed')
);
ALTER TABLE profiles DROP COLUMN disabled_at;
