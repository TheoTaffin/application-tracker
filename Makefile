.DEFAULT_GOAL := help
.PHONY: help deps deps-py deps-js setup lint lint-commits lint-pr-title format test test-integration \
	env build up down logs ps tools dev seed db-generate backup

COMPOSE := docker compose
COMPOSE_DEV := docker compose -f compose.yaml -f compose.dev.yaml

# Commit range checked by lint-commits (CI passes the PR's base..head)
RANGE ?= origin/main..HEAD

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- Tooling ---------------------------------------------------------------------

deps: deps-py deps-js ## Install all locked tooling (used locally and in CI)

deps-py: ## Install locked Python tooling (pre-commit)
	uv sync --frozen

deps-js: ## Install locked JS tooling
	npm ci

setup: deps ## One-time local setup after cloning (installs pre-commit and commit-msg hooks)
	uv run pre-commit install

lint: ## Run every check on the whole repo (branch protection only applies on commit)
	SKIP=no-commit-to-branch uv run pre-commit run --all-files

lint-commits: ## Check that every commit in RANGE follows Conventional Commits
	@set -e; for c in $$(git rev-list --no-merges $(RANGE)); do \
		git log -1 --format=%B $$c > .git/COMMIT_CHECK_MSG; \
		echo "Checking $$(git log -1 --format='%h %s' $$c)"; \
		uv run pre-commit run conventional-pre-commit --hook-stage commit-msg \
			--commit-msg-filename .git/COMMIT_CHECK_MSG; \
	done

lint-pr-title: ## Check that $PR_TITLE follows Conventional Commits (it becomes the merge commit title)
	@test -n "$$PR_TITLE" || { echo "PR_TITLE is not set"; exit 1; }
	@printf '%s\n' "$$PR_TITLE" > .git/COMMIT_CHECK_MSG
	uv run pre-commit run conventional-pre-commit --hook-stage commit-msg \
		--commit-msg-filename .git/COMMIT_CHECK_MSG

format: ## Format all files with Prettier
	npm run format -- .

test: ## Run unit tests
	npm test

test-integration: dev ## Run integration tests against the dev stack (real Postgres + storage)
	npm run test:integration

# --- Application stack -------------------------------------------------------------

env: ## Create .env from .env.example with random secrets (refuses to overwrite)
	@test ! -f .env || { echo ".env already exists; delete it first to regenerate"; exit 1; }
	@db_pw=$$(openssl rand -hex 24); s3_pw=$$(openssl rand -hex 24); \
	sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$$db_pw/" \
	    -e "s/^S3_SECRET_ACCESS_KEY=.*/S3_SECRET_ACCESS_KEY=$$s3_pw/" \
	    -e "s#^DATABASE_URL=postgres://tracker:change-me@#DATABASE_URL=postgres://tracker:$$db_pw@#" \
	    .env.example > .env
	@chmod 600 .env && echo "Created .env with generated secrets"

build: ## Build the Docker images
	$(COMPOSE) build

up: ## Start the app (http://127.0.0.1:3000)
	$(COMPOSE) up -d --build --wait

down: ## Stop all services (data volumes are kept)
	$(COMPOSE) --profile tools down

logs: ## Follow logs of all services
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) --profile tools ps

tools: ## Start Adminer (127.0.0.1:8080) and the storage console (127.0.0.1:9001)
	$(COMPOSE) --profile tools up -d --wait adminer storage-console

dev: ## Start database + storage for `npm run dev` on the host
	$(COMPOSE_DEV) up -d --wait db storage
	$(COMPOSE_DEV) run --rm --build init

seed: ## Load fictional demo data into an empty dev database (after `make dev`)
	node --env-file=.env scripts/seed.mts

db-generate: ## Generate a migration from schema changes (drizzle/)
	npx drizzle-kit generate

backup: ## Dump the database and archive stored files into ./backups
	@mkdir -p backups && ts=$$(date +%Y%m%d-%H%M%S); \
	$(COMPOSE) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -Fc' > backups/db-$$ts.dump; \
	$(COMPOSE) run --rm --no-deps -v "$$PWD/backups:/backup" --entrypoint tar storage \
		czf /backup/files-$$ts.tar.gz -C /data . ; \
	echo "Backup written to backups/*-$$ts.*"
