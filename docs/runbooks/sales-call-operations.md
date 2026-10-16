# Runbook: Latte operations

Owner: engineering. Covers the checks named in HLD section 10. There is no alerting stack yet; an operator runs these checks.

## Health

- `GET /api/health`: the API process is up.
- `GET /api/ready`: the API can reach Postgres. A 503 means the database is unreachable: check the Supabase status page and the session pooler host in `.env`.
- Worker: its log prints `worker started`; each call logs `transcribed` and `scored` with the call id.

## Checks and what to do

| Check | How | Threshold | Action |
| --- | --- | --- | --- |
| Failed calls | Calls page, view Failed | more than 5% of an hour's uploads | Read the reason on each call. "Recording must be stereo" needs a new recording. "Budget exhausted" needs `LLM_BUDGET_USD` raised, then Retry. "failed after several attempts" means Groq or Storage errors: check the worker log, then Retry. |
| Unscored calls | Review queue, calls marked Unscored | more than 5% of scored calls | The judge failed (cut off, invalid output, provider). Check `model_calls` errors for purpose `score`; Retry once fixed. |
| Budget | Dashboard, Model spend | above 80% | Raise `LLM_BUDGET_USD` or slow uploads; at 100% new calls fail with a clear reason. |
| Dead letters | `SELECT count(*) FROM pgboss.job WHERE name LIKE '%-dead'` | any | Each row is a call whose job gave up; open the call and Retry. |
| Rate limits | worker log `rate limited, rescheduled` | steady stream | Expected at free Groq limits; jobs reschedule themselves. For volume, move to a paid plan and raise `LIMIT_*` and `WORKER_CONCURRENCY`. |

## Common operations

- Retry a call: Retry button on the call (QA or manager), or `POST /api/calls/:id/retry`.
- Change the rubric: Rubric page as a manager; saving makes a new active version; old scores keep theirs.
- Re-record the eval after a prompt or model change: `make eval-record` (live Groq calls, a few cents), then `make eval`.
- Rotate keys: Supabase dashboard (secret key, database password) and Groq console; update `.env` and restart the API and worker.

## Data

- Audio is deleted by the daily purge (02:15) after `AUDIO_RETENTION_DAYS`; the call row records `audio_purged_at`.
- Every audio URL issued is in `audit_events` with the user and call.
