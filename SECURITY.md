# Security

## Reporting

Report a vulnerability to the lead in private (direct message or the
security channel), never in a public issue. Include the reproduction, the
impact and the commit. You will get an acknowledgement within one working
day.

## What every change must satisfy

1. Authorisation is per resource: every handler checks that the caller may
   act on this record.
2. Every input is validated at the boundary with a schema.
3. No secret in the repository, in logs, in error messages or in analytics.
   Configuration comes from the environment; `.env.example` lists every
   variable with a placeholder.
4. No credential-shaped file is ever committed; the pre-commit hook blocks
   the common ones, and the agent's settings deny reading them.
5. Dependencies are pinned. CI scans them; a known-vulnerable version blocks
   the pipeline.
6. Auth, payments, PII and external-input paths get gstack `/cso --diff`
   (or claude-security) before the MR, and before release a scan of the
   release commit that `vapt-report` writes up as the VAPT report. Critical and
   High findings are fixed before production.
7. Mobile: tokens live in the keychain or keystore; deep links are validated;
   no exported component without a permission; certificate pinning on money
   paths.
8. Infrastructure: least-privilege IAM, no public buckets, TLS everywhere,
   `terraform plan` reviewed before a person applies it.

## Incident

Declare early. Follow the runbook. Write the postmortem (`postmortem`)
within five working days. Blameless, with owned follow-ups.
