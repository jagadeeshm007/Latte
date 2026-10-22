-- Reverses 0014_transcript_upload.sql. Kept out of the migrations folder's top
-- level so migrate.ts never applies it; the integration suite runs it. Fails
-- (and changes nothing) while transcript calls or batch notices exist.
ALTER TABLE notifications DROP CONSTRAINT chk_notifications_kind;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_kind CHECK (kind IN ('alert', 'digest'));
ALTER TABLE calls DROP CONSTRAINT chk_calls_transcript_has_no_audio;
ALTER TABLE calls DROP CONSTRAINT chk_calls_size_bytes;
ALTER TABLE calls ADD CONSTRAINT chk_calls_size_bytes CHECK (size_bytes > 0 AND size_bytes <= 52428800);
ALTER TABLE calls DROP CONSTRAINT chk_calls_mime_type;
ALTER TABLE calls ADD CONSTRAINT chk_calls_mime_type CHECK (mime_type IN ('audio/wav', 'audio/mpeg'));
ALTER TABLE calls DROP CONSTRAINT chk_calls_audio_is_timed;
ALTER TABLE calls DROP CONSTRAINT chk_calls_input;
ALTER TABLE calls DROP COLUMN timed;
ALTER TABLE calls DROP COLUMN input;
