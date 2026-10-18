-- Reverses 0011_product_rubrics_retention.sql. Kept out of the migrations
-- folder's top level so migrate.ts never applies it; the integration suite
-- runs it. Fails (and changes nothing) while product rubrics or the new audit
-- actions exist.
ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted')
);
ALTER TABLE teams DROP CONSTRAINT chk_teams_retention;
ALTER TABLE teams DROP COLUMN audio_retention_days;
DROP INDEX ix_rubrics_product;
DROP INDEX uq_rubrics_active_per_product;
ALTER TABLE rubrics DROP COLUMN product_id;
CREATE UNIQUE INDEX uq_rubrics_active ON rubrics (is_active) WHERE is_active;
