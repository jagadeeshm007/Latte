# Security rules

- Authorisation is checked per resource, not per role: "may this caller
  act on this record" (`auth` for the design).
- Secrets come from the environment or a secret manager, never the repo.
  `.env.example` documents every variable with a placeholder;
  `secrets` keeps the inventory and the rotation plan.
- Dependencies are pinned and scanned in CI. A known-vulnerable dependency
  blocks the pipeline (`dependency-audit`).
- Auth, payments, PII and external input paths get gstack `/cso --diff`
  (or claude-security's "scan changes") before the change request, and
  before release a claude-security or `/cso` scan of the release commit,
  written up by `vapt-report`.
- Mobile: tokens in keychain or keystore, deep links validated, no exported
  components without a permission, certificate pinning on money paths.
