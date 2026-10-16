-- Reverses 0004_call_language.sql. Kept out of the migrations folder's top
-- level so migrate.ts never applies it; the integration suite runs it.
-- Postgres cannot drop an enum value: the type is rebuilt without translate,
-- which fails (and changes nothing) while any model_calls row still uses it.
ALTER TABLE model_calls ALTER COLUMN kind TYPE text;
DROP TYPE model_kind;
CREATE TYPE model_kind AS ENUM ('chat', 'stt', 'tts');
ALTER TABLE model_calls ALTER COLUMN kind TYPE model_kind USING kind::model_kind;

ALTER TABLE transcript_segments DROP COLUMN text_en;
ALTER TABLE calls DROP CONSTRAINT chk_calls_language;
ALTER TABLE calls DROP COLUMN language;
