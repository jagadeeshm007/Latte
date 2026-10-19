# ADR-0028: Run everything locally in Docker, with only model keys from outside

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose a trimmed Supabase compose)
- Area: development, deployment
- Reversibility: easy: hosted Supabase and Vercel keep working unchanged

## Context

Trying Latte needed a Supabase project, a database password and keys before anything ran. The team wants one command that runs the whole product on a laptop, needing only a model key.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Supabase CLI `supabase start` plus compose for Latte | another tool to install; about 12 containers | teams already on the CLI |
| Plain Postgres with auth and storage faked in the app | a second code path that production never runs | unit tests |
| Trimmed Supabase services in one compose (chosen) | image versions to keep up with | local trials and demos |

## Decision

- **Services.** `supabase/postgres`, Supabase Auth (GoTrue) and Storage API (file backend), Mailpit for invitation emails, and Latte's API, worker, migrations and seed from one image (`docker/app.Dockerfile`, TypeScript through tsx).
- **One origin.** An nginx gateway (`docker/gateway.Dockerfile`) serves the built web app and routes `/api`, `/auth/v1` and `/storage/v1` on http://localhost:8000. The API, worker, migrations and seed share the gateway's network namespace, so `http://localhost:8000` is the same address inside and outside, and the upload and playback URLs they sign work in the browser.
- **Keys.** `scripts/docker-env.js` writes `.env.docker` once: the database password, an ES256 signing key for sessions (served as JWKS, which the API verifies as it does with hosted Supabase), the HS256 secret behind the anon and service keys, and the app's own secrets. It never overwrites a value, and takes model keys from the environment or from the model-key lines of `.env`.
- **Order.** db, then Auth and Storage, then the gateway, then migrations, then the seed, then the API and worker. The seed writes sign-in details to `.scratch/docker/seed-users.txt` on the host, kept apart from the hosted project's `.scratch/seed-users.txt`.
- **Invite-only** as in production (`GOTRUE_DISABLE_SIGNUP`).
- The test database moves to `docker-compose.test.yml`; `make db` uses it.

## Consequences

- Restarting the gateway container breaks the shared network of the API and worker; `make up` again restores it.
- The stack runs with `NODE_ENV=development` (the seed refuses production) and is not hardened for exposure beyond the machine.

## Commits us to

Supabase's self-hosted image names and environment variables, pinned in `docker-compose.yml`.
