# Latte

**Sales call compliance and coaching, on every call.**

Latte transcribes recorded sales and service calls, checks each one against your compliance and quality rubric, and sends the calls that need attention to QA with playable, timestamped evidence. Agents get a scorecard and coaching points; managers see trends across teams, products and agents.

Live: [latte-delta.vercel.app](https://latte-delta.vercel.app) · License: [MIT](LICENSE)

## Features

**Calls and review**

- Upload stereo WAV or MP3 recordings (agent left, customer right), or transcripts with no audio, in batches of up to 500 calls.
- Transcription per speaker with word-level timestamps: English through Groq Whisper, Hindi and nine other Indian languages through Sarvam, with translation to English before scoring.
- One AI judge call per call scores every rubric item; quotes and times always come from the transcript, never from the model.
- A review queue where QA plays each finding from its moment, agrees or disagrees, and adds findings the judge missed. Agreement between judge and QA is tracked per rubric item.
- A waveform player synced to the transcript, word by word.

**Coaching and insight**

- Agent scorecards with their top coaching points.
- Dashboard, leaderboards and highlights by team, product and agent.
- Alerts when a team's flag rate jumps, daily or weekly digests, and saved views.
- An in-app notice when a batch finishes.

**Administration**

- An editable rubric, with a separate rubric per product if needed.
- Invite-only members with Google, Microsoft or SAML sign-in.
- Audio retention per team, and personal data (card, phone, Aadhaar, PAN, account numbers, email) masked in transcripts and exports, with audited reveal.
- Monthly usage statements and a public status page.

**For developers**

- A REST API with scoped API keys, per-route rate limits, request logs and an OpenAPI description.
- Signed webhooks for scored calls, failed calls, finished batches, alerts and digests.
- `@latte/sdk`, a zero-dependency TypeScript client.

## How it works

```
Upload ──► Transcribe each speaker ──► Translate regional lines ──► Phrase rules + one judge call ──► Flag ──► QA review ──► Scorecards and dashboard
```

1. The browser uploads recordings straight to private storage through signed URLs, and the API queues each call.
2. The worker decodes the audio, splits the two channels, trims silence and transcribes each speaker. Transcript uploads skip this step.
3. Phrase rules catch common prohibited statements, talk ratio is computed, and one call to `openai/gpt-oss-120b` with a strict JSON schema judges every rubric item, citing transcript lines.
4. Calls with a breach, a missed mandatory item or an unverifiable citation go to the QA queue.

Processing starts as soon as a call is uploaded.

## Quick start

Run the whole application locally with Docker. You need Docker and a [Groq API key](https://console.groq.com).

```bash
GROQ_API_KEY=gsk_your_key make up
```

- Open http://localhost:8000 and sign in with one of the demo users in `.scratch/docker/seed-users.txt` (one per role: manager, QA reviewer, two agents).
- Invitation emails arrive in Mailpit at http://localhost:8025.
- Add `SARVAM_API_KEY=...` for Indian-language calls.
- `make logs` follows the API and worker; `make down` stops everything and keeps the data.

`make up` starts Postgres, Supabase Auth and Storage, the API, the worker and the web app, and generates every secret on first run into `.env.docker` (git-ignored).

## Development

Prerequisites: Node 24+, pnpm, Docker, a [Supabase](https://supabase.com) project and a Groq API key.

```bash
make setup        # install dependencies and git hooks
cp .env.example .env
make env-check    # shows which variables are set, never their values
make migrate      # apply the database schema
make seed         # storage bucket, reference data, default rubric, one user per role
make dev          # API on :8080, worker, web app on :5173
```

Demo sign-in details are written to `.scratch/seed-users.txt`; `pnpm --filter @scc/api seed:reset-passwords` issues new passwords.

Sample calls:

```bash
make render-seed  # voice the 20 sample calls into stereo WAV (evals/audio/calls)
make load-seed    # upload them through the running pipeline
make status       # recent calls with status, score and findings, and this month's spend
```

## API and SDK

Create an API key under **Developers** in the app, then install the SDK:

```bash
npm install https://github.com/jagadeeshm007/Latte/releases/download/sdk-v0.3.0/latte-sdk-0.3.0.tgz
```

```ts
import { LatteClient } from "@latte/sdk";

const latte = new LatteClient({
  apiKey: process.env.LATTE_API_KEY!,
  baseUrl: "https://latte-delta.vercel.app",
});

const batch = await latte.batches.create(files, { name: "Inbound, week 42" });
const done = await latte.batches.wait(batch.batchId!);
const csv = await latte.batches.resultsCsv(done.id);
```

- Docs: public at `/docs` in the app, written in [`docs/public`](docs/public); `/llms.txt` and `/llms-full.txt` for LLMs and tools.
- SDK reference: [`packages/sdk/README.md`](packages/sdk/README.md).
- OpenAPI: `GET /api/openapi.json`.

## Deployment

Latte deploys as one Vercel project (the web app as static files and the API as a Node 24 function) with Supabase for the database, authentication and storage. A Supabase `pg_cron` job runs the background tasks every minute.

```bash
make setup-deploy                                              # configure the Vercel project from .env
pnpm --filter @scc/api migrate                                 # apply migrations before deploying
LATTE_URL=https://your-domain make supabase-cron               # schedule background tasks
LATTE_URL=https://your-domain make e2e-check                   # verify end to end
```

The full steps, environment variables and rollback are in [`docs/runbooks/deploy-vercel.md`](docs/runbooks/deploy-vercel.md).

## Configuration

Every variable is listed with a placeholder in [`.env.example`](.env.example). The main ones:

| Variable                    | Default                       | Effect                                                             |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `LLM_PROVIDER`, `LLM_MODEL` | `groq`, `openai/gpt-oss-120b` | Judge provider and model; OpenRouter and Gemini are also supported |
| `STT_MODEL`                 | `whisper-large-v3`            | Speech-to-text model for English                                   |
| `LLM_BUDGET_USD`            | `5`                           | Monthly model spend cap; calls are refused once it is reached      |
| `AUDIO_RETENTION_DAYS`      | `90`                          | Default days to keep audio; transcripts and findings stay          |
| `WORKER_CONCURRENCY`        | `1`                           | Calls processed in parallel by the worker                          |
| `MODEL_MODE`                | `live`                        | `record` saves model responses for tests, `replay` uses only those |

## Project structure

| Path               | Contents                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| `apps/api`         | Express 5 API and background worker (TypeScript, PostgreSQL, pg-boss)                  |
| `apps/web`         | React 19 web app (Vite, TanStack Router and Query, coss ui)                            |
| `packages/shared`  | Shared Zod schemas for every request and response, and the default rubric              |
| `packages/gateway` | All model provider calls: budget, token caps, cost log, rate limits, record and replay |
| `packages/sdk`     | `@latte/sdk`, the TypeScript client                                                    |
| `evals`            | 20 labelled sample calls and the judge evaluation                                      |
| `docs`             | Requirements, design, architecture decisions, API guide and runbooks                   |

## Testing

```bash
make check
```

Runs formatting, lint, typecheck, unit and integration tests (against PostgreSQL in Docker), the judge evaluation and a dependency audit. The evaluation replays recorded model responses, so it needs no API key, and fails if the judge misses any planted prohibited statement. After changing the prompt, rubric or model, re-record with `make eval-record`.

## Documentation

| Topic                  | Where                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Requirements and scope | [`docs/product/PRD.md`](docs/product/PRD.md), [`backlog.md`](docs/product/backlog.md)                                  |
| Architecture           | [`docs/design/sales-call-compliance-hld.md`](docs/design/sales-call-compliance-hld.md), [`lld.md`](docs/design/lld.md) |
| Data model             | [`docs/design/data-model.md`](docs/design/data-model.md)                                                               |
| Security               | [`docs/design/threat-model.md`](docs/design/threat-model.md)                                                           |
| Decisions              | [`docs/adr`](docs/adr)                                                                                                 |
| Operations             | [`docs/runbooks`](docs/runbooks)                                                                                       |
| Contributing           | [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md)                                                         |

## License

[MIT](LICENSE) © 2026 Jagadeesh Mandala
