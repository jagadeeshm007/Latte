-- Reverses 0005_call_archive.sql. Kept out of the migrations folder's top
-- level so migrate.ts never applies it; the integration suite runs it.
-- Fails (and changes nothing) while audit rows use the new actions.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged', 'finding_decided', 'call_retried')
);
DROP INDEX ix_calls_live_created;
ALTER TABLE calls DROP COLUMN deleted_at;
ALTER TABLE calls DROP COLUMN archived_at;
