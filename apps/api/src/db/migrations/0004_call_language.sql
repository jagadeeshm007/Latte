-- Migration 0004 (SCC-1, 2026-10-15): Indian regional language calls (ADR-0014).
-- calls.language is what the uploader chose; it routes speech-to-text (English
-- to Groq Whisper, the rest to Sarvam). transcript_segments.text_en holds the
-- English translation the judge reads; null for English lines. model_calls
-- gains the translate kind for Sarvam Translate.
-- Index decision: no new WHERE or ORDER BY shape, so no index.
-- Constant defaults make both ADD COLUMNs catalog changes: no table rewrite.
-- Down: down/0004_call_language.sql.
ALTER TABLE calls ADD COLUMN language text NOT NULL DEFAULT 'en-IN';
ALTER TABLE calls ADD CONSTRAINT chk_calls_language CHECK (
  language IN ('en-IN', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'od-IN', 'pa-IN', 'auto')
);
COMMENT ON COLUMN calls.language IS 'Language chosen at upload (BCP-47, or auto for Sarvam detection); picks the speech-to-text engine';

ALTER TABLE transcript_segments ADD COLUMN text_en text;
COMMENT ON COLUMN transcript_segments.text_en IS 'English translation the judge reads, for regional calls; null for English lines';

ALTER TYPE model_kind ADD VALUE IF NOT EXISTS 'translate';
