-- Reverses 0003_transcript_words.sql. Kept out of the migrations folder's top
-- level so migrate.ts never applies it; the integration suite runs it.
ALTER TABLE transcript_segments DROP CONSTRAINT chk_transcript_segments_words;
ALTER TABLE transcript_segments DROP COLUMN words;
