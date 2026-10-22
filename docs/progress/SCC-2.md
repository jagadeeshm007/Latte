# Progress: SCC-2 PublicPlatform

- Task: SCC-2
- Title: PublicPlatform
- Branch: feature/SCC-2-PublicPlatform
- Status: in progress
- Owner: Jagadeesh
- Started: 2026-10-22
- Updated: 2026-10-22
- Acceptance criteria: 7

## Next
- Unit SCC-2-7 Release030: in review (PR into feature/SCC-2-PublicPlatform)
- Then SCC-2-4 SdkExamples, SCC-2-5 LandingLegal, SCC-2-6 Settings
- After the Intent merges to main: push tag sdk-v0.3.0 (releases every SDK)

## Done
- SCC-2-0 IntentsUnitsBolts: way of working in AGENTS.md and CLAUDE.md (PR #8, merged)
- SCC-2-1 OpenApi: operation ids, tags, named schemas, webhooks section (PR #9, merged)
- SCC-2-2 PublicDocs: /docs, llms.txt, llms-full.txt, generated API reference (PR #10, merged)
- SCC-2-3 LanguageSdks: Python, Go and Java SDKs generated from OpenAPI, ADR-0031 (PR #11, merged)

## Blockers
- none

## Decisions
- Docs live in docs/public as Markdown; the API reference and openapi.json are generated and checked by make typecheck
- marked renders docs through its lexer into React elements, never innerHTML
- Python, Go and Java SDKs are generated (OpenAPI Generator 7.26.0) and share the TypeScript SDK's version; sdk-latest is the one moving tag

## Links
- MR: https://github.com/jagadeeshm007/Latte/pull/8, https://github.com/jagadeeshm007/Latte/pull/9, https://github.com/jagadeeshm007/Latte/pull/10, https://github.com/jagadeeshm007/Latte/pull/11
- Ticket: none
