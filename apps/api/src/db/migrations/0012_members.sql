-- Migration 0012 (SCC-1, 2026-10-18): invite-only members (ADR-0024).
-- A manager invites people (Supabase sends the invitation) and can turn an
-- account off; an off account is refused at sign-in by the API whichever
-- way it signs in (password, Google, Microsoft or SAML), and so are the API
-- keys it created.
-- Down: down/0012_members.sql.
ALTER TABLE profiles ADD COLUMN disabled_at timestamptz;
COMMENT ON COLUMN profiles.disabled_at IS 'When a manager turned the account off; the API refuses it while set';

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported', 'api_key_created', 'api_key_updated', 'api_key_revoked',
             'api_key_rotated', 'api_keys_revoked_all', 'webhook_created', 'webhook_updated',
             'webhook_deleted', 'pii_revealed', 'team_retention_changed', 'member_invited',
             'member_updated')
);
