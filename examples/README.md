# Latte SDK examples

Runnable programs for common integrations, written against the TypeScript SDK (`@latte/sdk`). `make check` typechecks, lints and tests them, so they keep working as the API changes; the tests run each example's logic against a fake API.

| Example                                       | What it does                                                                                      | Scopes                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [upload-and-wait](src/upload-and-wait.ts)     | uploads a folder of recordings as one batch, waits until it is scored, saves the results CSV      | `calls:write`, `batches:read`, `exports:read` |
| [transcript-import](src/transcript-import.ts) | turns a dialler or CRM export (JSON) into scored calls, without audio                             | `calls:write`                                 |
| [webhook-receiver](src/webhook-receiver.ts)   | an Express endpoint that checks `Latte-Signature`, drops redeliveries and answers before handling | none (it receives)                            |
| [crm-sync](src/crm-sync.ts)                   | copies every scored call's score, QA flag and breaches into a CRM, keyed by the call              | `calls:read`                                  |

## Run one

From the repository, after `make setup`:

```bash
export LATTE_URL=https://your-latte-domain
export LATTE_API_KEY=latte_...   # Developers > API keys, with the scopes above
pnpm --filter @scc/examples crm-sync
pnpm --filter @scc/examples upload-and-wait ./calls --agent <id> --team <id> --product <id> --date 2026-10-22
pnpm --filter @scc/examples transcript-import export.json --name "Dialler, 22 Oct"
LATTE_WEBHOOK_SECRET=whsec_... PORT=3000 pnpm --filter @scc/examples webhook-receiver
```

Agent, team and product ids come from `GET /api/reference` (`latte.reference()`).

To use one in your own project, install the SDK ([packages/sdk](../packages/sdk)) and copy the file; each one is self-contained apart from `client.ts`, which only reads `LATTE_URL` and `LATTE_API_KEY`.

## Other languages

- Python: [sdks/python/examples](../sdks/python/examples)
- Go: [sdks/go/examples](../sdks/go/examples)
- Java: [sdks/java/examples](../sdks/java/examples)

Each lists scored calls and shows the webhook signature check; `make sdks-test` compiles them.
