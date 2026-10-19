#!/usr/bin/env bash
# One-time setup of the Vercel project and the GitHub repository for Latte
# (docs/runbooks/deploy-vercel.md, ADR-0020). Run it yourself, signed in to
# both CLIs (`vercel login`, `gh auth login`):
#   make setup-deploy                       # or: bash scripts/setup-deploy.sh
#   LATTE_URL=https://your.domain make setup-deploy   # once the URL is known
# It is safe to run again: every variable is overwritten with the same value.
#
# What it does:
#   1. creates or links the Vercel project and connects it to the GitHub repo;
#   2. generates the app's own secrets once, into .env.vercel (git-ignored);
#   3. copies the hosted settings from .env into Vercel (production and
#      preview), piping each value through stdin so none is printed or lands
#      in shell history;
#   4. sets the GitHub Actions variable and secret the Hobby cron fallback uses.
# It never pushes, deploys, migrates or prints a secret.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${VERCEL_PROJECT:-latte}"
REPO="${GITHUB_REPO:-jagadeeshm007/Latte}"
TARGETS="production,preview"
DOTENV="$ROOT/.env"
GENERATED="$ROOT/.env.vercel"

say() { printf '%s\n' "setup-deploy: $*"; }
die() {
  printf '%s\n' "setup-deploy: $*" >&2
  exit 1
}

# The value of NAME in a dotenv file, unquoted; empty when absent.
value_of() {
  local file="$1" name="$2"
  [ -f "$file" ] || return 0
  sed -n "s/^${name}=//p" "$file" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

# Adds NAME to Vercel for production and preview from stdin, as a secret.
put() {
  local name="$1" value="$2" kind="${3:---sensitive}"
  [ -n "$value" ] || {
    say "skip $name (no value)"
    return 0
  }
  printf '%s' "$value" | vercel env add "$name" "$TARGETS" --force --yes "$kind" >/dev/null
  say "set $name"
}

# --- preflight -------------------------------------------------------------
command -v vercel >/dev/null || die "the Vercel CLI is not installed (npm i -g vercel)"
command -v gh >/dev/null || die "the GitHub CLI is not installed"
command -v openssl >/dev/null || die "openssl is needed to generate secrets"
vercel whoami >/dev/null 2>&1 || die "not signed in to Vercel: run vercel login"
gh auth status >/dev/null 2>&1 || die "not signed in to GitHub: run gh auth login"
[ -f "$DOTENV" ] || die ".env not found: copy .env.example and fill in the hosted Supabase values"
for name in DATABASE_URL SUPABASE_URL SUPABASE_SECRET_KEY VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY GROQ_API_KEY; do
  [ -n "$(value_of "$DOTENV" "$name")" ] || die "$name is empty in .env"
done
case "$(value_of "$DOTENV" DATABASE_URL)" in
  *pooler.supabase.com:6543*) die "DATABASE_URL uses the transaction pooler (6543); pg-boss needs the session pooler (5432)" ;;
esac

# --- 1. project ------------------------------------------------------------
if [ ! -f .vercel/project.json ]; then
  say "linking Vercel project $PROJECT"
  vercel link --yes --project "$PROJECT" >/dev/null
fi
say "connecting the project to github.com/$REPO"
if ! connect_output="$(vercel git connect "https://github.com/$REPO" --yes 2>&1)"; then
  case "$connect_output" in
    *"already connected"*) say "git already connected" ;;
    *) say "could not connect GitHub; connect it under Project > Settings > Git: $(printf '%s' "$connect_output" | grep -m1 -i error)" ;;
  esac
fi

# --- 2. secrets generated once ---------------------------------------------
umask 077
touch "$GENERATED"
for name in EXPORT_LINK_SECRET DATA_ENCRYPTION_KEY CRON_SECRET; do
  if [ -z "$(value_of "$GENERATED" "$name")" ]; then
    printf '%s=%s\n' "$name" "$(openssl rand -hex 32)" >>"$GENERATED"
  fi
done
say "app secrets kept in .env.vercel; keep a copy of DATA_ENCRYPTION_KEY outside Vercel"

# --- 3. Vercel environment -------------------------------------------------
LATTE_URL="${LATTE_URL:-https://$PROJECT.vercel.app}"
for name in DATABASE_URL SUPABASE_URL SUPABASE_SECRET_KEY SUPABASE_JWKS_URL SUPABASE_POOLER_HOST GROQ_API_KEY SARVAM_API_KEY OPENROUTER_API_KEY GEMINI_API_KEY; do
  put "$name" "$(value_of "$DOTENV" "$name")"
done
for name in EXPORT_LINK_SECRET DATA_ENCRYPTION_KEY CRON_SECRET; do
  put "$name" "$(value_of "$GENERATED" "$name")"
done
# Public or plain settings, stored as readable config.
for name in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_AUTH_PROVIDERS LLM_BUDGET_USD AUDIO_RETENTION_DAYS; do
  put "$name" "$(value_of "$DOTENV" "$name")" --no-sensitive
done
put WEB_ORIGIN "$LATTE_URL" --no-sensitive
put DB_SSL true --no-sensitive
put DB_POOL_MAX 2 --no-sensitive
put MODEL_MODE live --no-sensitive
# Hobby allows daily crons only; the GitHub workflow below drives the queue.
put VERCEL_CRON_PLAN "${VERCEL_CRON_PLAN:-hobby}" --no-sensitive
# Lets Vercel use the pnpm version named in package.json.
put ENABLE_EXPERIMENTAL_COREPACK 1 --no-sensitive
# The database CA, verified by the function when given (deploy-vercel.md).
ca_path="$(value_of "$DOTENV" DB_SSL_CA)"
if [ -n "$ca_path" ] && [ -f "$ca_path" ]; then
  put DB_SSL_CA_PEM "$(cat "$ca_path")"
else
  say "skip DB_SSL_CA_PEM (no CA file in .env): TLS to the database will not verify the certificate"
fi

# --- 4. GitHub Actions -----------------------------------------------------
gh variable set LATTE_URL --repo "$REPO" --body "$LATTE_URL" >/dev/null
value_of "$GENERATED" CRON_SECRET | tr -d '\n' | gh secret set CRON_SECRET --repo "$REPO" >/dev/null
say "set GitHub variable LATTE_URL ($LATTE_URL) and secret CRON_SECRET"

say "done. Next steps are in docs/runbooks/deploy-vercel.md, section 'First deploy'."
