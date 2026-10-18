-- Migration 0011 (SCC-1, 2026-10-18): a rubric per product, retention per
-- team, and audit for PII reveals (ADR-0023).
-- rubrics.product_id: null is the default rubric; a product with its own
-- active rubric is scored with it. Version numbers stay global, so a score's
-- rubric_version still finds its rubric. One active rubric per product (and
-- one default) is enforced by a partial unique index on the product.
-- teams.audio_retention_days overrides AUDIO_RETENTION_DAYS for the team.
-- Index decision: the active lookup is by product; rubric lists filter by it.
-- Down: down/0011_product_rubrics_retention.sql.
ALTER TABLE rubrics ADD COLUMN product_id uuid REFERENCES products (id) ON DELETE RESTRICT;
COMMENT ON COLUMN rubrics.product_id IS 'The product this rubric scores; null for the default rubric';
DROP INDEX uq_rubrics_active;
CREATE UNIQUE INDEX uq_rubrics_active_per_product
  ON rubrics (coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE is_active;
CREATE INDEX ix_rubrics_product ON rubrics (product_id, version DESC);

ALTER TABLE teams ADD COLUMN audio_retention_days integer;
ALTER TABLE teams ADD CONSTRAINT chk_teams_retention CHECK (audio_retention_days IS NULL OR audio_retention_days BETWEEN 1 AND 3650);
COMMENT ON COLUMN teams.audio_retention_days IS 'Days to keep this team''s recordings; null uses AUDIO_RETENTION_DAYS';

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted', 'pii_revealed', 'team_retention_changed')
);
