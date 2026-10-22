# ADR-0031: Python, Go and Java SDKs generated from the OpenAPI document

- Status: Accepted
- Date: 2026-10-22
- Task: SCC-2-3 (Intent SCC-2)
- Deciders: engineering, with the product owner (asked for Python, Go and Java with as little upkeep as possible)
- Area: sdk, distribution
- Builds on: ADR-0018 (OpenAPI from the shared Zod schemas), ADR-0027 (SDK releases on GitHub)
- Reversibility: easy: any SDK can later be hand-written or published to a registry under the same names

## Context

Integrators outside TypeScript asked for clients. One maintainer cannot keep four hand-written SDKs in step with the API. SCC-2-1 gave every operation an `operationId`, a tag and named schemas, so the OpenAPI document is now good enough to generate from.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| Hand-written clients per language | every API change becomes four changes and four reviews | a team per language |
| Speakeasy, Stainless or Fern | paid services, and the code would be generated outside the repository | a funded public API |
| Publish only `openapi.json` | every customer generates and maintains their own client | APIs used by a few experts |
| OpenAPI Generator, pinned Docker image, output committed (chosen) | generated code is verbose and the image is a large download | small teams with an accurate spec |

## Decision

- **Generation.** `make sdks` (`scripts/gen-sdks.js`) prints the API's document, drops its `webhooks` section (clients receive no webhooks; the event schemas stay in `components`), and runs `openapitools/openapi-generator-cli:v7.26.0` with `sdks/config/<language>.yaml` into `sdks/python`, `sdks/go` and `sdks/java`. Files a previous run made are removed first, so nothing stale is left.
- **Hand-written, per language, one file and its test.** The webhook signature check (`latte_sdk/webhook.py`, `webhook.go`, `Webhook.java`) and a README. `.openapi-generator-ignore` protects them. All three checks are tested against `sdks/webhook-test-vector.json`, which an API test checks against `signPayload`.
- **CI.** The `sdks` job regenerates and fails on any difference from what is committed, then runs `make sdks-test`: build and test each SDK in its official image (Python 3.12, Go 1.24, Maven with Temurin 21).
- **Versions.** Every SDK takes the version of `packages/sdk`. One tag, `sdk-v<version>`, releases all of them: the TypeScript tarball, the Python wheel, the Java jar and pom, and the Go module tag `sdks/go/v<version>`. The workflow then moves the floating tag `sdk-latest` to the release, for `@latest`-style installs from git; pinned `sdk-v*` tags never move.

## Consequences

- An API change is followed by `make sdks` and one commit; CI says when it was forgotten.
- Upgrading the generator image rewrites many files, so it is a commit of its own.
- The Python and Java clients have dependencies, unlike the TypeScript SDK: urllib3, pydantic, python-dateutil and typing-extensions; Jackson, jsr305 and the Jakarta annotations.
- No package registry yet: installs come from git and GitHub releases.

## Commits us to

The package names `latte_sdk` (Python), `github.com/jagadeeshm007/Latte/sdks/go` (Go) and `io.github.jagadeeshm007:latte-sdk` (Java), the tags `sdk-v*`, `sdks/go/v*` and `sdk-latest`, and the release asset names.
