# Progress: SCC-2 PublicPlatform

- Task: SCC-2
- Title: PublicPlatform
- Branch: feature/SCC-2-PublicPlatform
- Status: done
- Owner: Jagadeesh
- Started: 2026-10-22
- Updated: 2026-10-23
- Acceptance criteria: 7

## Next
- none: the Intent is on main (PR #17) and released as sdk-v0.3.0

## Done
- SCC-2-0 IntentsUnitsBolts: way of working in AGENTS.md and CLAUDE.md (PR #8, merged)
- SCC-2-1 OpenApi: operation ids, tags, named schemas, webhooks section (PR #9, merged)
- SCC-2-2 PublicDocs: /docs, llms.txt, llms-full.txt, generated API reference (PR #10, merged)
- SCC-2-3 LanguageSdks: Python, Go and Java SDKs generated from OpenAPI, ADR-0031 (PR #11, merged)
- SCC-2-7 Release030: every SDK at 0.3.0, SDK docs page and changelog (PR #12, merged)
- SCC-2-4 SdkExamples: TypeScript examples package, Python, Go and Java examples (PR #13, merged)
- SCC-2-6 Settings: /settings and PATCH /api/me (PR #15, merged; #14 closed for a commit subject CI refuses)
- SCC-2-5 LandingLegal: landing page, /sign-in?next=, terms, privacy, cookies, subprocessors, licences (PR #16, merged)
- Intent into main (PR #17, merged); sdk-v0.3.0 released every SDK, with sdks/go/v0.3.0 and sdk-latest

## Blockers
- none

## Decisions
- Docs live in docs/public as Markdown; the API reference and openapi.json are generated and checked by make typecheck
- marked renders docs through its lexer into React elements, never innerHTML
- Legal pages are templates for an individual open-source project (contact jagadeeshm0077@gmail.com), not reviewed by a lawyer
- Python, Go and Java SDKs are generated (OpenAPI Generator 7.26.0) and share the TypeScript SDK's version; sdk-latest is the one moving tag

## Links
- MR: https://github.com/jagadeeshm007/Latte/pull/8, https://github.com/jagadeeshm007/Latte/pull/9, https://github.com/jagadeeshm007/Latte/pull/10, https://github.com/jagadeeshm007/Latte/pull/11, https://github.com/jagadeeshm007/Latte/pull/12, https://github.com/jagadeeshm007/Latte/pull/13, https://github.com/jagadeeshm007/Latte/pull/15
- Ticket: none
