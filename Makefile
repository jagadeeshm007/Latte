# SalesCall monorepo (API, worker, web, shared packages, evals). Every command
# lives here. `make help` lists them; `make check` is the gate CI runs.
SHELL := /bin/bash
.DEFAULT_GOAL := help
PNPM ?= pnpm
STATE := .bearing/state
NODE_PACKAGES := packages/shared packages/gateway packages/sdk apps/api evals
ALL_PACKAGES := $(NODE_PACKAGES) apps/web
POSTGRES_PORT ?= 54329
export TEST_DATABASE_URL ?= postgres://postgres:postgres@localhost:$(POSTGRES_PORT)/scc_test

.PHONY: load-seed status help setup dev dev-api dev-worker dev-web check format format-check lint typecheck test vuln eval eval-record render-seed db db-stop migrate seed env-check build-web vercel-build vercel-smoke sdk-build sdk-pack sdks sdks-test up down logs setup-deploy supabase-cron e2e-check clean

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

typecheck: ## tsc --noEmit, every package; the SDK's generated types must match the API's schemas
	@for p in $(ALL_PACKAGES); do (cd $$p && $(PNPM) exec tsc --noEmit -p tsconfig.json) || exit 1; echo "typecheck: $$p clean"; done
	@node packages/sdk/scripts/gen-types.ts --check

test: db ## Unit and integration tests with coverage floors (starts Postgres)
	@set -o pipefail; for p in $(ALL_PACKAGES); do echo "== test $$p"; (cd $$p && $(PNPM) exec vitest run --coverage 2>&1 | grep -E 'Test Files|Tests |ERROR|FAIL|×|AssertionError|Expected|Received' ) || exit 1; done

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
	@POSTGRES_PORT=$(POSTGRES_PORT) docker compose -f docker-compose.test.yml up -d --wait postgres >/dev/null && echo "db: postgres on localhost:$(POSTGRES_PORT)"

db-stop: ## Stop the local Postgres for tests
	docker compose -f docker-compose.test.yml down

up: ## Run Latte completely locally in Docker; needs only a model key (GROQ_API_KEY=... make up)
	@mkdir -p .scratch/docker
	@if command -v node >/dev/null; then node scripts/docker-env.js; \
	else docker run --rm -u "$$(id -u):$$(id -g)" -e GROQ_API_KEY -e SARVAM_API_KEY -e OPENROUTER_API_KEY -e GEMINI_API_KEY \
	  -v "$$PWD:/w" -w /w node:24-slim node scripts/docker-env.js; fi
	docker compose --env-file .env.docker up -d --build --wait
	@echo "up: Latte on http://localhost:8000, mail on http://localhost:8025, sign-in details in .scratch/docker/seed-users.txt"

down: ## Stop the local stack (data stays; add -v to docker compose down to wipe it)
	docker compose --env-file .env.docker down

logs: ## Follow the local stack's API and worker logs
	docker compose --env-file .env.docker logs -f api worker

migrate: ## Apply migrations to DATABASE_URL from .env
	$(PNPM) --filter @scc/api migrate

seed: ## Seed reference data, rubric, bucket and one user per role (development)
	$(PNPM) --filter @scc/api seed

load-seed: ## Queue the rendered seed calls into the running pipeline (development)
	$(PNPM) --filter @scc/api load-seed

status: ## Recent calls with status and score, and this month's model spend
	$(PNPM) --filter @scc/api status

env-check: ## Show which configuration variables are set (never their values)
	$(PNPM) --filter @scc/api env:check

build-web: ## Production build of the web app
	$(PNPM) --filter @scc/web build

vercel-build: ## Build .vercel/output: static web app, bundled API function, routes and crons (ADR-0020)
	node scripts/vercel-build.js

vercel-smoke: db vercel-build ## Load the built function locally and check it answers (needs Docker)
	node scripts/vercel-smoke.js

supabase-cron: ## Schedule /api/cron/* every minute from the hosted Supabase (LATTE_URL=...; you run it, it changes production)
	node scripts/supabase-cron.js

e2e-check: sdk-build ## Sign in, upload one sample call and wait for its score (LATTE_URL=...; writes data, costs a few cents)
	node scripts/e2e-check.js

setup-deploy: ## One-time Vercel project and GitHub setup from .env; you run it, it never deploys (docs/runbooks/deploy-vercel.md)
	bash scripts/setup-deploy.sh

sdk-build: ## Build the SDK into packages/sdk/dist (zero dependencies, size budget checked)
	node packages/sdk/scripts/build.ts

sdk-pack: sdk-build ## Pack the SDK as packages/sdk/latte-sdk-<version>.tgz, the file a GitHub release carries
	cd packages/sdk && $(PNPM) pack

# The Python, Go and Java SDKs are generated (ADR-0031); these run in Docker as you, so no tool is installed here.
SDK_RUN = docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -v "$$PWD:/w"

sdks: ## Regenerate the Python, Go and Java SDKs in sdks/ from the API's OpenAPI document (Docker)
	node scripts/gen-sdks.js

sdks-test: ## Build and test the Python, Go and Java SDKs in their official images; leaves the wheel and jar
	$(SDK_RUN) -w /w/sdks/python python:3.12-slim sh -c 'python -m venv /tmp/v && /tmp/v/bin/pip install -q . build && /tmp/v/bin/python -m unittest discover -s test && /tmp/v/bin/python -m build -q --wheel --outdir dist'
	$(SDK_RUN) -w /w/sdks/go -e GOCACHE=/tmp/go-cache -e GOPATH=/tmp/go golang:1.24 sh -c 'go vet ./... && go test ./...'
	$(SDK_RUN) -w /w/sdks/java --entrypoint mvn maven:3.9-eclipse-temurin-21 -q -B -Duser.home=/tmp -Dmaven.repo.local=/tmp/m2 package

clean: ## Remove build and test output
	rm -rf .vercel/output packages/sdk/dist packages/sdk/*.tgz sdks/java/target sdks/python/build sdks/python/dist apps/*/dist apps/*/coverage packages/*/coverage evals/coverage $(STATE)/.check-passed
