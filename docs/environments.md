# Environments

No secrets in this file, ever: no tokens, passwords, API keys, signed URLs
or `user:pass@` in a URL. It is committed and read by agents. Checks are GET
requests with no credentials, so every path listed here must answer without
signing in. The agent never deploys or rolls back; the Rollback row is a
sentence for the engineer, not a command anyone runs from here.

Version field: `json:<dotted.path>` for a JSON body (`json:commit`,
`json:build.sha`) or `header:<Name>` for a response header
(`header:X-App-Version`); it must carry the deployed commit or tag.

Development runs locally (`make dev`, or `make up` for the Docker stack), so
there is no shared dev or qa section. Vercel preview deployments are per
branch and are checked by hand.

## prod

Vercel builds production from `main` (`docs/runbooks/deploy-vercel.md`). The
web app and the API share one origin. The API has no version endpoint yet,
so the version is read, not compared; adding one is a follow-up for
`health-checks`.

| Key | Value |
| --- | --- |
| Product URL | https://latte-delta.vercel.app |
| API base URL | https://latte-delta.vercel.app |
| Health path | /api/health |
| Readiness path | /api/ready |
| Version path | - |
| Version field | - |
| Owner | Jagadeesh (Latte engineering) |
| Rollback | In Vercel > Deployments, open the previous production deployment and choose Instant Rollback (`docs/runbooks/deploy-vercel.md`, Rollback). |
| Synthetic suite | - |

| Smoke check | Base | Path | Expect | Contains |
| --- | --- | --- | --- | --- |
| home page | product | / | 200 | Sales call compliance and coaching |
| sign-in page | product | /sign-in | 200 | Sales call compliance and coaching |
| public status | api | /api/status | 200 | "components" |
