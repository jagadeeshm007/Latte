# ADR-0013: Store word timestamps as jsonb on transcript segments

- Status: Accepted
- Date: 2026-10-15
- Task: SCC-1
- Deciders: engineering (word-level read-along requested by the product owner)
- Area: data model
- Reversibility: cheap: one column, written by replaceSegments and read by listSegments; down/0003_transcript_words.sql drops it

## Context

The call transcript highlights the exact word being spoken as the recording plays. That needs a time per word. ADR-0009 put speech-to-text behind a contract of segments with start, end, text and language; Groq Whisper also returns word timestamps (`timestamp_granularities[]=word`), listed for the whole chunk rather than per segment.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| A `words` jsonb array on `transcript_segments`, `[{text, startMs, endMs}]` in call time, default `[]` (chosen) | the database does not check each word's shape (a CHECK only enforces an array); the shared Zod schema checks it at the API edge | words always read with their segment |
| A `transcript_words` table, one row per word | about 1,500 rows per 10-minute call and a join on every call page, for no query that filters or orders by word | search or analytics over individual words |
| Estimate word times in the browser from each segment's span | a word can be off by a fraction of a second; the product owner chose real timestamps | providers without word timestamps |

## Decision

We will ask Whisper for segment and word timestamps, place each word on the segment of its chunk that holds its midpoint (else the nearest), map it to call time with the chunk's silence map, and store it in `transcript_segments.words` (migration 0003). The API returns `words` on every segment. Words extend ADR-0009's contract without changing it: a provider that sends none yields `[]`, and the transcript then highlights whole lines.

## Consequences

Calls transcribed before this change keep `words = []` until they are transcribed again. The STT cache key now includes the granularities, so no reply recorded without words is reused for one that expects them.

## Commits us to

Postgres jsonb on transcript_segments; Groq Whisper `verbose_json` with word granularity
