# Latte: sales call compliance and coaching intelligence

Audits every recorded sales or service call instead of a sample. Stereo recordings (agent on the left channel, customer on the right) are transcribed per channel, scored against a configurable compliance and quality rubric by one model call, and calls with a prohibited statement or a missed mandatory item go to QA with timestamped, playable evidence. QA agrees or disagrees with each finding; the system tracks judge-to-human agreement per rubric item. Agents see a scorecard and their top three coaching points.

## What is in the repository

| Path               | What it is                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`         | Express 5 API (`src/server.ts`) and the pg-boss worker (`src/worker.ts`): uploads, transcription, scoring, review, scorecards, dashboard |
| `apps/web`         | React 19 + Vite + TanStack Router/Query + coss ui                                                                                        |
| `packages/gateway` | The only code that calls a model: budget, `max_tokens` cap of 1000, cost log, rate limits, record and replay                             |
| `packages/sdk`     | `@latte/sdk`: the zero-dependency TypeScript client, installed from a GitHub release                                                     |
| `packages/shared`  | Zod schemas shared by the API and the web app, the default rubric and the judge output schema                                            |
| `evals`            | 20 labelled synthetic calls with planted breaches, the judge eval and its gate, the seed audio renderer                                  |
| `docs`             | PRD, backlog, ADRs, HLD, data model, threat model, GenAI design, UX flows, LLD, runbook                                                  |

## How a call flows

1. A QA reviewer or manager uploads 1 to 10 WAV or MP3 files (50 MB each). The browser uploads straight to a private Supabase Storage bucket through signed URLs; the API then records each call and queues it.
2. The worker decodes the file, refuses mono, splits the channels, trims silence (keeping a time map), and transcribes each channel with Groq Whisper (`whisper-large-v3`, English, Hindi and code-mixed).
3. Phrase rules for prohibited statements run on the transcript, talk ratio is computed in code, then one Groq `openai/gpt-oss-120b` call with a strict JSON schema judges every rubric item. The model cites transcript lines; quotes and timestamps are copied from those lines in code.
4. A call with any breach, missed mandatory item, ungrounded citation or failed judge goes to the QA queue. Reviewers play each finding from its timestamp, agree or disagree, and can add a finding the judge missed.

## Run it locally with Docker

Everything runs on your machine: Postgres, Supabase Auth and Storage, the API, the worker and the web app. Only Docker and a model key are needed.

```bash
GROQ_API_KEY=gsk_your_key make up
```

- Open http://localhost:8000 and sign in with a user from `.scratch/docker/seed-users.txt` (one per role; the hosted project keeps its own `.scratch/seed-users.txt`).
- Invitation emails land in http://localhost:8025 (Mailpit).
- `SARVAM_API_KEY=...` adds Indian-language calls. Keys can also go in `.env.docker` (generated on the first run with every other secret, git-ignored).
- `make logs` follows the API and worker, and `make down` stops the stack while keeping the data. `docker compose --env-file .env.docker down -v` wipes it.

How it fits together is in ADR-0028.

## Develop against hosted Supabase

Prerequisites: Node 24 or later, pnpm, Docker (for the test database), a Supabase project and a Groq API key.

```bash
make setup                 # install dependencies and git hooks
cp .env.example .env       # then fill in the Supabase and Groq values; set DB_SSL_CA to the Supabase CA file to verify TLS
make env-check             # shows which variables are set, never their values
make migrate               # apply the schema to the Supabase database
make seed                  # bucket, teams, products, agents, rubric, one user per role
make dev                   # API on :8080, worker, web on :5173
```

Each seed user gets a generated password, written to `.scratch/seed-users.txt` (git-ignored, readable only by you); `pnpm --filter @scc/api seed:reset-passwords` issues new ones. To voice the 20 seed calls with Groq Orpheus (TTS; the org must accept the model's terms once in the Groq console):

```bash
make render-seed           # resumable; stops at the daily limit and continues on the next run
```

Rendered audio lands in `evals/audio/calls/` (git-ignored) and can be uploaded from the Upload page.
To push the rendered calls through the running pipeline without the browser, and to see where every call stands:

```bash
make load-seed             # uploads them as the seeded QA reviewer and queues transcription
make status                # recent calls with status, score and findings, plus this month's spend
```

## The gate

`make check` runs formatting, lint, typecheck, unit and integration tests (Postgres in Docker), the judge eval and a dependency audit. The eval replays recorded judge responses, so CI makes no live model calls, and it fails if the judge misses any planted prohibited statement. After a prompt, rubric or model change, re-record with live keys:

```bash
make eval-record
```

## Deploy

Everything deploys as one Vercel project: the web app as static files, the API as one Node 24 function, and the job queue drained right after each upload, with Supabase `pg_cron` as the every-minute backstop (ADR-0020, ADR-0029). `make vercel-build` writes `.vercel/output`; `make vercel-smoke` loads the built function locally and checks it. Setup, variables, plan limits and rollback are in `docs/runbooks/deploy-vercel.md`. Locally, `make dev` still runs the API and worker as long-lived processes from the same code.

The API guide for integrators is `docs/api/guide.md`, also in the app under Developers > Docs. The SDK installs into any project straight from GitHub:

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.1.0/latte-sdk-0.1.0.tgz
```

## Configuration

Every variable is listed with a placeholder in `.env.example`. The ones that change behaviour most:

| Variable                    | Default                       | Effect                                                                  |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `LLM_PROVIDER`, `LLM_MODEL` | `groq`, `openai/gpt-oss-120b` | Judge provider and model; OpenRouter and Gemini are supported for chat  |
| `STT_MODEL`                 | `whisper-large-v3`            | `whisper-large-v3-turbo` is cheaper and weaker on Hindi                 |
| `LLM_BUDGET_USD`            | `5`                           | Monthly spend cap; the gateway refuses calls once it is reached         |
| `MODEL_MODE`                | `live`                        | `record` saves responses as cassettes, `replay` uses only cassettes     |
| `AUDIO_RETENTION_DAYS`      | `90`                          | The daily purge deletes audio after this; transcripts and findings stay |
| `WORKER_CONCURRENCY`        | `1`                           | Raise only with a Groq plan above the free limits                       |

## Limits to know

At Groq's free limits the system scores about 50 calls a day; the 20,000 calls a month in the brief need a paid Groq plan (HLD section 8). Open product questions are in `docs/product/questions.md`.

## License

MIT, see [LICENSE](LICENSE).
