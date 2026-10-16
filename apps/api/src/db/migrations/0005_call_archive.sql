-- Migration 0005 (SCC-1, 2026-10-15): archive and soft delete for calls (ADR-0015).
-- Both only hide: archived calls leave the lists and the review queue but still
-- count in dashboards and scorecards; deleted calls leave every list, view and
-- statistic. Nothing is removed, so either can be reviewed or undone later.
-- Index decision: the calls list orders by (created_at, id) over calls that are
-- not deleted; a partial index serves it. Other new WHERE shapes (archived_at,
-- search, team, product, language) run on top of that scan at seed volumes.
-- Down: down/0005_call_archive.sql.
ALTER TABLE calls ADD COLUMN archived_at timestamptz;
ALTER TABLE calls ADD COLUMN deleted_at timestamptz;
COMMENT ON COLUMN calls.archived_at IS 'When the call was archived: hidden from lists and the queue, still counted';
COMMENT ON COLUMN calls.deleted_at IS 'When the call was deleted: hidden everywhere, kept for audit';
CREATE INDEX ix_calls_live_created ON calls (created_at DESC, id DESC) WHERE deleted_at IS NULL;

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted')
);
