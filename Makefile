.DEFAULT_GOAL := help
.PHONY: help deps setup lint format

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

deps: ## Install locked tooling (used locally and in CI)
	uv sync --frozen
	npm ci

setup: deps ## One-time local setup after cloning
	uv run pre-commit install

lint: ## Run every check on the whole repo (branch protection only applies on commit)
	SKIP=no-commit-to-branch uv run pre-commit run --all-files

format: ## Format all files with Prettier
	npm run format -- .
