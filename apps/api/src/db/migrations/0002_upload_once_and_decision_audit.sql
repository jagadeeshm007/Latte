-- Migration 0002 (security review, 2026-10-15).
-- One uploaded object becomes at most one call, so confirming the same path
-- twice cannot spend the model budget twice.
CREATE UNIQUE INDEX uq_calls_storage_path ON calls (storage_path) WHERE storage_path IS NOT NULL;

-- Every review decision and retry is audited, so an overwritten decision keeps its history.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged', 'finding_decided', 'call_retried')
);
