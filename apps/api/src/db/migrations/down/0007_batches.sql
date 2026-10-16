-- Reverses 0007_batches.sql. Kept out of the migrations folder's top level so
-- migrate.ts never applies it; the integration suite runs it.
-- Fails (and changes nothing) while audit rows use the new actions.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted')
);
ALTER TABLE audit_events DROP COLUMN batch_id;
ALTER TABLE calls DROP CONSTRAINT fk_calls_batch;
DROP TABLE batches;
