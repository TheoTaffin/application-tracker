.DEFAULT_GOAL := help
.PHONY: help deps deps-py deps-js setup lint lint-commits lint-pr-title format

# Commit range checked by lint-commits (CI passes the PR's base..head)
RANGE ?= origin/main..HEAD

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

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
