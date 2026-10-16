-- Migration 0003 (SCC-1, 2026-10-15): word timestamps for the read-along transcript.
-- Each segment keeps its words, in call time, as a JSON array of
-- {"text", "startMs", "endMs"}. Words are only ever read with their segment,
-- so they live on the segment row rather than in a table of their own.
-- Index decision: no new WHERE or ORDER BY shape; reads stay on
-- uq_transcript_segments_call_id_seq. A constant default makes ADD COLUMN a
-- catalog change in Postgres 11+, so existing rows are not rewritten.
-- Down: down/0003_transcript_words.sql.
ALTER TABLE transcript_segments ADD COLUMN words jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE transcript_segments ADD CONSTRAINT chk_transcript_segments_words CHECK (jsonb_typeof(words) = 'array');
COMMENT ON COLUMN transcript_segments.words IS 'Words of the segment in call time: [{text, startMs, endMs}]; empty for calls transcribed before word timestamps';
