# SalesCall monorepo (API, worker, web, shared packages, evals). Every command
# lives here. `make help` lists them; `make check` is the gate CI runs.
SHELL := /bin/bash
.DEFAULT_GOAL := help
PNPM ?= pnpm
STATE := .bearing/state
NODE_PACKAGES := packages/shared packages/gateway apps/api evals
ALL_PACKAGES := $(NODE_PACKAGES) apps/web
POSTGRES_PORT ?= 54329
export TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:$(POSTGRES_PORT)/scc_test

.PHONY: help setup dev dev-api dev-worker dev-web check format format-check lint typecheck test vuln eval eval-record render-seed db db-stop migrate seed env-check build-web clean

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Install dependencies and git hooks
	$(PNPM) install --frozen-lockfile
	bash .githooks/install.sh

dev: ## Run API, worker and web together (needs .env)
	@trap 'kill 0' EXIT; $(PNPM) --filter @scc/api dev & $(PNPM) --filter @scc/api dev:worker & $(PNPM) --filter @scc/web dev & wait

dev-api: ## Run the API with reload
	$(PNPM) --filter @scc/api dev

dev-worker: ## Run the worker with reload
	$(PNPM) --filter @scc/api dev:worker

dev-web: ## Run the web app (Vite)
	$(PNPM) --filter @scc/web dev

format: ## Prettier --write over the repository
	$(PNPM) exec prettier --log-level warn --write .

format-check: ## Fail if any file is unformatted
	@$(PNPM) exec prettier --log-level warn --check . && echo "format-check: $$(git ls-files -co --exclude-standard | grep -cE '\.(ts|tsx|js|json|css|md|yml|yaml)$$') files checked"

lint: ## ESLint, zero warnings, every package
	@for p in $(ALL_PACKAGES); do (cd $$p && $(PNPM) exec eslint . --max-warnings 0) || exit 1; echo "lint: $$p clean"; done

typecheck: ## tsc --noEmit, every package
	@for p in $(ALL_PACKAGES); do (cd $$p && $(PNPM) exec tsc --noEmit -p tsconfig.json) || exit 1; echo "typecheck: $$p clean"; done

test: db ## Unit and integration tests with coverage floors (starts Postgres)
	@set -o pipefail; for p in $(ALL_PACKAGES); do echo "== test $$p"; (cd $$p && $(PNPM) exec vitest run --coverage 2>&1 | grep -E 'Test Files|Tests |ERROR|FAIL|×' ) || exit 1; done

eval: ## The judge eval from recorded responses: fails on any missed planted prohibited statement
	$(PNPM) --filter @scc/evals run eval

eval-record: ## Re-record judge responses with live keys (costs a few cents), then run the gate
	$(PNPM) --filter @scc/evals run eval:record

render-seed: ## Voice the seed scripts into stereo WAV with Groq TTS (resumable; 100 requests a day on the free plan)
	$(PNPM) --filter @scc/evals run render

vuln: ## pnpm audit at high and above (production dependencies)
	$(PNPM) audit --audit-level=high --prod

check: ## The gate: format, lint, typecheck, tests, eval, audit
	@mkdir -p $(STATE); rm -f $(STATE)/.check-passed
	@for g in format-check lint typecheck test eval vuln; do $(MAKE) --no-print-directory $$g || { echo "check: $$g failed" >&2; exit 1; }; done
	@touch $(STATE)/.check-passed; echo "check: passed (6 gates)"

db: ## Start the local Postgres for tests
	@POSTGRES_PORT=$(POSTGRES_PORT) docker compose up -d --wait postgres >/dev/null && echo "db: postgres on localhost:$(POSTGRES_PORT)"

db-stop: ## Stop the local Postgres
	docker compose down

migrate: ## Apply migrations to DATABASE_URL from .env
	$(PNPM) --filter @scc/api migrate

seed: ## Seed reference data, rubric, bucket and one user per role (development)
	$(PNPM) --filter @scc/api seed

env-check: ## Show which configuration variables are set (never their values)
	$(PNPM) --filter @scc/api env:check

build-web: ## Production build of the web app
	$(PNPM) --filter @scc/web build

clean: ## Remove build and test output
	rm -rf apps/*/dist apps/*/coverage packages/*/coverage evals/coverage $(STATE)/.check-passed
