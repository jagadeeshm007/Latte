# Low level design: gateway, audio, scoring, jobs, API

Serves: US-01-001 to US-01-008, US-00-001 to US-00-003, US-02-001 to US-02-003. HLD: docs/design/sales-call-compliance-hld.md. Date: 2026-10-14.

## Module layout

```
packages/shared/src/        rubric.ts (item schema, default rubric), judge.ts (judge output schema + JSON schema), api.ts (DTOs), roles.ts
packages/gateway/src/       index.ts (callModel), config.ts, pricing.ts, budget.ts, limiter.ts, cassette.ts, providers.ts, errors.ts
apps/api/src/
  config.ts                 env parsing with Zod, fails fast
  db/                       client.ts (postgres.js + Drizzle), schema.ts (Drizzle tables mirroring schema.sql), migrate.ts, migrations/0001_initial.sql
  auth/                     jwt.ts (jose JWKS verify), middleware.ts (requireAuth, requireRole)
  audio/                    decode.ts, wav.ts, resample.ts, vad.ts (speech regions + time map), chunk.ts
  scoring/                  prompt.ts, ground.ts, rules.ts, talk.ts, route.ts, score.ts (orchestration)
  storage.ts                Supabase Storage: signUpload, signDownload, download, remove
  jobs/                     boss.ts, transcribe.ts, score.ts, purge.ts
  routes/                   reference, uploads, calls, review, scorecard, agreement, dashboard, rubrics, usage, me, health
  app.ts, server.ts, worker.ts
apps/web/src/               routes/ (TanStack Router), components/ui (coss ui), lib/api.ts, lib/supabase.ts
evals/                      calls/*.json, fixtures/transcripts, cassettes/, render.ts, run.ts
```

## Gateway contract

```
callModel(req: ChatRequest | SttRequest | TtsRequest, ctx: { purpose, callId? }): Promise<ChatResult | SttResult | TtsResult>
```
- Order inside: resolve provider and model from config; build the request (chat: clamp `max_tokens` to 1000); compute request hash (sha256 of provider, model, body without secrets, audio sha256 for STT); replay mode returns the cassette or throws `CassetteMissingError`; budget check (`sum(cost_usd)` this month from model_calls, via an injected `UsageStore`) throws `BudgetExceededError` and records a `refused` row; limiter `reserve(model, estimate)` returns a wait in ms, and a positive wait throws `RateLimitedError(waitMs)` so jobs reschedule; send with a 60 s timeout; on 429 throw `RateLimitedError(retry-after)`; on 5xx retry twice with 1 s and 4 s backoff; compute cost; insert one model_calls row (ok or error); record mode writes the cassette.
- Providers: `groq` (base https://api.groq.com/openai/v1; chat, stt, tts), `openrouter` (https://openrouter.ai/api/v1; chat), `gemini` (https://generativelanguage.googleapis.com/v1beta/openai; chat). Unsupported kind on a provider throws at config time.
- Pricing table per model: input, cached input, output per 1M tokens; per audio hour with a 10 s minimum; per 1M characters.

## Audio

- Decode: WAV via `wavefile` (PCM 16/24/32, float); MP3 via `mpg123-decoder`. Output Float32 per channel and sample rate. Mono throws `MonoRecordingError`.
- Resample to 16 kHz by linear interpolation after a simple low-pass (adequate for speech recognition).
- VAD: 30 ms frames, RMS energy in dB, threshold = max(noise floor + 12 dB, -45 dBFS), hangover 300 ms, pad 200 ms, merge gaps under 600 ms. Output regions and a time map: list of {srcStartMs, dstStartMs, durationMs}. `toCallTime(dstMs)` maps back.
- Chunk: concatenated speech audio split at region boundaries into chunks of at most 10 minutes (about 19 MB of 16-bit mono WAV).

## Scoring

- Prompt: system message holds fixed instructions and rubric; user message holds the transcript block `<transcript>` with lines `[S12][AGENT][00:41] text` and the closing instruction.
- Judge output schema (strict): `{ items: [{ key, status, segments: int[], note }], coaching: string[] }` with every rubric key required once.
- Ground: validate keys (missing key = item marked not grounded with status from rubric default `missed`), statuses fit type, segments exist; prohibited breach segments must be agent segments, otherwise `grounded=false`.
- Rules: `rules.ts` exports patterns per prohibited item; `findRuleHits(segments)` returns hits on agent segments.
- Score: overall = met / applicable over mandatory and quality items (partial counts half), 0 if any breach; null when the judge failed.

## Jobs

- transcribe {callId}: claim `UPDATE calls SET status='transcribing', updated_at=now() WHERE id=$1 AND status IN ('uploaded','transcribing') RETURNING *`; if no row, exit. Download, decode, split, VAD, chunk, STT per chunk (RateLimitedError: `boss.send` the same job with startAfter and return), map, merge, write segments and status `transcribed` in one transaction, enqueue score. Other errors: retry by pg-boss (retryLimit 4, backoff); on final failure set failed with a user-safe reason.
- score {callId}: claim `transcribed|scoring` to `scoring`; load segments and active rubric; rules and talk ratio; judge via gateway; ground and merge; write score and findings and status `scored` in one transaction (replace any previous score whose review is not done).
- purge (daily cron): delete audio of calls past retention_until; sweep unconfirmed objects older than 1 day.

## API

All routes under /api, JSON, Zod-validated; errors `{ error: { code, message } }`. Pagination `?limit` (max 100) and `?cursor`.

| Method and path | Roles | Notes |
| --- | --- | --- |
| GET /api/health, /api/ready | none | ready checks the database |
| GET /api/me | all | profile and role |
| GET /api/reference | QA, manager | agents, teams, products |
| POST /api/uploads/sign | QA, manager | up to 10 files: name, type, size; returns path and signed upload URL each |
| POST /api/uploads/confirm | QA, manager | per file: path and metadata; inserts call and enqueues transcribe; returns batch |
| GET /api/calls | all (agent: own) | filters status, team, product, date range, needs_review |
| GET /api/calls/:id | all (agent: own) | call, segments, score, findings with reviews |
| POST /api/calls/:id/audio-url | all (agent: own) | 10-minute signed URL, audited |
| POST /api/calls/:id/retry | QA, manager | failed calls or unscored judge only |
| GET /api/review/queue | QA, manager | pending reviews, oldest first |
| PUT /api/findings/:id/review | QA | agree or disagree, note |
| POST /api/calls/:id/findings | QA | add missed finding (item, status, segment or time, note) |
| POST /api/calls/:id/review/complete | QA | all findings decided |
| GET /api/scorecard/me, GET /api/scorecard/:agentId | agent (me), QA and manager (any) | pass rates, coaching top three |
| GET /api/agreement | QA, manager | per item agreed, disagreed, misses, rate |
| GET /api/dashboard | manager | groupBy team or product, date range |
| GET /api/rubrics/active, GET /api/rubrics | all, manager | |
| POST /api/rubrics | manager | new active version |
| GET /api/usage | manager | month spend, budget, by purpose |
