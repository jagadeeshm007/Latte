# ADR-0008: Use coss ui on React 19 with Vite and TanStack for the web app

- Status: Accepted
- Date: 2026-10-14
- Task: SCC-1
- Deciders: the requester (product owner), engineering
- Area: frontend
- Reversibility: awkward: components re-skinned

## Context

The brief asks for 'React, TS + coss ui'. Bearing's react-web template ships React 19, Vite, TanStack Router and Query, Zod, shadcn/ui and Tailwind v4. coss ui is a shadcn-registry-compatible component set on Base UI and Tailwind v4.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Template stack with coss ui components in place of shadcn/ui (chosen) | coss ui is younger than shadcn/ui | the request names it |
| shadcn/ui (template default) | contradicts the request | no preference given |

## Decision

We will scaffold from the react-web template and add coss ui components through the shadcn CLI from the coss registry, with Supabase Auth on the client for sign-in, because the request names coss ui and it shares the template's Tailwind v4 base.

## Consequences

Revisit if coss ui lacks a component we need; shadcn/ui components can sit beside it on the same tokens.

## Commits us to

React 19, Vite, TanStack Router, TanStack Query, Tailwind v4, coss ui, Base UI, @supabase/supabase-js (outside the standard stack: coss ui)
