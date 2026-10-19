# ADR-0027: A zero-dependency SDK, installed from GitHub releases

- Status: Accepted
- Date: 2026-10-18
- Task: SCC-1
- Deciders: engineering, with the product owner (chose release tarballs and the lightest SDK)
- Area: sdk, distribution
- Supersedes: the packaging part of ADR-0019
- Reversibility: easy: the same tarball can be published to npm later

## Context

The SDK was a private workspace package that imported zod and `@scc/shared` at run time, so it could not be installed outside this repository and pulled in about 60 kB of validation code. Integrators want a small client they can add to any project.

## What else was considered

| Option | Why not | Would suit |
| --- | --- | --- |
| npm `github:` install of the repository | npm cannot install a sub-folder of a monorepo | single-package repositories |
| A built `sdk` branch | CI needs write access to the branch; versions are commits | quick unpinned installs |
| Bundle zod and the shared schemas | every response checked at run time, but 60 kB or more and Node only | clients that distrust the server |
| Zero dependencies, tarball per GitHub release (chosen) | responses are typed, not validated at run time | most integrations |

## Decision

- **Runtime.** `fetch` and Web Crypto only, no dependencies: Node 20 or later, Bun, Deno and edge runtimes. `verifyWebhookSignature` is now async because Web Crypto is.
- **Types.** `scripts/gen-types.ts` expands the API's Zod schemas into plain types in `src/types.ts` with the TypeScript compiler, and fails if the result names anything outside itself. `make typecheck` runs it with `--check`, so a schema change without regenerated types fails the gate.
- **Build.** `tsc` emits ES modules and declarations into `dist/`; `make sdk-build` fails above 20 kB of JavaScript (16 kB today). `publishConfig` points the packed package at `dist/` while the workspace keeps using the sources.
- **Release.** Pushing a tag `sdk-v<version>` that matches `package.json` runs `sdk-release`, which attaches `latte-sdk-<version>.tgz` (pinned) and `latte-sdk.tgz` (for `releases/latest/download`) to a GitHub release. Installing needs no registry or token.

## Consequences

- A server that answers in a shape the types do not describe is no longer caught by the SDK.
- The install URLs in the README and the in-app docs name the version and are updated with each release.

## Commits us to

The tag format `sdk-v*` and the asset names.
