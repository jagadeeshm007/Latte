# ADR-0002: Use Express 5 for the API instead of the template's Fastify

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: api framework
- Reversibility: awkward: route handlers and middleware rewritten

## Context

Bearing's node-api template ships Fastify 5. The brief says 'for backend use express js with ts' (from the request).

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Express 5 + Zod validation middleware (chosen) | less built-in schema support than Fastify; validation and error handling are written as middleware | teams that know Express; the request names it |
| Fastify 5 (template default) | contradicts the request | a greenfield team free to choose |

## Decision

We will build the API on Express 5 with Zod-validated handlers, pino-http logging and a central error middleware, because the request names Express.

## Consequences

Async errors propagate natively in Express 5. Revisit only if the request changes.

## Commits us to

Express 5, Zod 4, pino, pino-http, multer (outside the standard stack: Express)
