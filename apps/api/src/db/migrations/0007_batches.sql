-- Migration 0007 (SCC-1, 2026-10-16): batches become first-class (ADR-0017).
-- Every call already carries a batch_id (one per upload confirm); a batch now
-- has a row with a name, its creator and where it came from, so it can be
-- listed, renamed, archived, retried and exported. A batch can be filled over
-- several confirms (chunks of up to 50 files) up to 500 calls.
-- Backfill: one row per existing batch_id, named after its first upload and
-- owned by the uploader of its first call.
-- Index decision: the batch list orders by (created_at, id) over batches that
-- are not archived; calls already have idx_calls_batch_id for the per-batch
-- counts. api_key_id gets its foreign key with the api_keys table (0008).
-- Down: down/0007_batches.sql.
CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  source text NOT NULL DEFAULT 'web',
  api_key_id uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_batches_name CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT chk_batches_source CHECK (source IN ('web', 'api'))
);
COMMENT ON TABLE batches IS 'A named group of calls uploaded together, by a person or an API key';
COMMENT ON COLUMN batches.source IS 'web (uploaded in the app) or api (uploaded with an API key)';
CREATE INDEX ix_batches_created ON batches (created_at DESC, id DESC);
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

INSERT INTO batches (id, name, created_by, created_at)
SELECT batch_id,
       'Upload ' || to_char(min(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI'),
       (array_agg(uploaded_by ORDER BY created_at, id))[1],
       min(created_at)
  FROM calls
 GROUP BY batch_id;

ALTER TABLE calls ADD CONSTRAINT fk_calls_batch FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE RESTRICT;

ALTER TABLE audit_events ADD COLUMN batch_id uuid REFERENCES batches (id) ON DELETE RESTRICT;
COMMENT ON COLUMN audit_events.batch_id IS 'The batch a batch-level action was on (rename, archive, retry, export)';

ALTER TABLE audit_events DROP CONSTRAINT chk_audit_events_action;
ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action CHECK (
  action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged',
             'finding_decided', 'call_retried', 'call_archived', 'call_unarchived', 'call_deleted',
             'batch_created', 'batch_renamed', 'batch_archived', 'batch_unarchived', 'batch_retried',
             'batch_exported')
);
