# ADR-0001: Use one pnpm monorepo for web, API and shared types

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: repository
- Reversibility: cheap: split packages into repos with history kept

## Context

The product has a React web app, an Express API with a worker, and Zod schemas both sides must agree on (rubric, findings, DTOs). The user chose one repository in the session of 2026-10-14.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| One pnpm workspace: apps/web, apps/api, packages/shared, evals (chosen) | one CI pipeline runs everything, so a web-only change still runs API tests | a small team shipping web and API together |
| Separate web and API repositories | shared types copied or published as a package; two gates to keep in step | separate teams with separate release cadences |

## Decision

We will keep web, API, worker, shared schemas and evals in one pnpm workspace with a single `make check`, because the shared Zod schemas are the contract between web and API and one change should move both.

## Consequences

A breaking DTO change fails the build in one commit. Revisit if web and API get separate owners or deploy cadences.

## Commits us to

pnpm workspaces, Node 24, TypeScript 5
