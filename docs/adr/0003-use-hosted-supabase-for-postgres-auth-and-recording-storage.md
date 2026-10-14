# ADR-0003: Use hosted Supabase for Postgres, Auth and recording storage

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: database
- Reversibility: awkward: auth and storage calls move to another provider

## Context

The brief asks for PostgreSQL on Supabase; the user chose a hosted project and supplied its URL, publishable and secret keys and JWKS URL. Recordings are customer audio and must stay private (REQ-035).

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Hosted Supabase: Postgres + Auth (JWT verified via JWKS) + private Storage bucket (chosen) | network dependency for dev; tests use a local Postgres container instead | a small team that wants managed auth and storage |
| Local Supabase CLI in Docker | user declined; adds a heavy local stack | offline development |
| Plain Postgres + own auth + S3 | more code to own | a team with an existing identity provider |

## Decision

We will use the hosted Supabase project: Postgres through Drizzle from the API only, Supabase Auth for sign-in with tokens verified in Express against the project JWKS, and a private Storage bucket served by short-lived signed URLs, because the request names Supabase and this keeps auth and storage managed.

## Consequences

RLS is enabled on every app table with no policies for anon or authenticated, so the publishable key reads nothing through PostgREST; the API uses the database connection and the secret key. Integration tests run on a local postgres:17 container with the same migrations. Revisit if data residency requires a self-hosted database.

## Commits us to

Supabase (Postgres 17, Auth, Storage), @supabase/supabase-js, jose, Drizzle ORM, postgres.js
