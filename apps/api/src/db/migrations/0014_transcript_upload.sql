-- Migration 0014 (SCC-1, 2026-10-22): calls uploaded as a transcript, without
-- audio, and an in-app notice when a batch finishes (ADR-0030).
-- calls.input says where the transcript came from: speech-to-text on audio,
-- or lines the uploader sent. calls.timed is false when those lines had no
-- times; their stored times are then only an order (proportional to words)
-- and screens show line numbers instead. The audio-only checks on file type
-- and size now apply to audio calls; a transcript is stored as its lines.
-- Expand only: existing rows are audio calls with real times (the defaults).
-- Down: down/0014_transcript_upload.sql.
ALTER TABLE calls ADD COLUMN input text NOT NULL DEFAULT 'audio';
ALTER TABLE calls ADD COLUMN timed boolean NOT NULL DEFAULT true;
ALTER TABLE calls ADD CONSTRAINT chk_calls_input CHECK (input IN ('audio', 'transcript'));
ALTER TABLE calls ADD CONSTRAINT chk_calls_audio_is_timed CHECK (input = 'transcript' OR timed);
COMMENT ON COLUMN calls.input IS 'audio (transcribed here) or transcript (lines sent by the uploader)';
COMMENT ON COLUMN calls.timed IS 'false when an uploaded transcript had no times; stored times are then an order only';

ALTER TABLE calls DROP CONSTRAINT chk_calls_mime_type;
ALTER TABLE calls ADD CONSTRAINT chk_calls_mime_type CHECK (
  (input = 'audio' AND mime_type IN ('audio/wav', 'audio/mpeg'))
  OR (input = 'transcript' AND mime_type IN ('text/plain', 'application/json'))
);
ALTER TABLE calls DROP CONSTRAINT chk_calls_size_bytes;
ALTER TABLE calls ADD CONSTRAINT chk_calls_size_bytes CHECK (
  size_bytes > 0 AND size_bytes <= CASE input WHEN 'audio' THEN 52428800 ELSE 1048576 END
);
ALTER TABLE calls ADD CONSTRAINT chk_calls_transcript_has_no_audio CHECK (
  input = 'audio' OR storage_path IS NULL
);

ALTER TABLE notifications DROP CONSTRAINT chk_notifications_kind;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_kind CHECK (kind IN ('alert', 'digest', 'batch'));
