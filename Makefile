# AreaIQ Project Makefile
# Universal entry point for development, testing, and deployment.

.DEFAULT_GOAL := help

# --- Variables ---
NPM := npm
COMPOSE_DOWN := ./scripts/runtime-down.sh
DB_RESET := ./scripts/runtime-reset.sh
DB_SEED := ./scripts/runtime-seed.sh
LOCAL_SETUP := ./scripts/local-setup.sh
TEST_API := ./test_files/simple-run.sh

# Detect container engine
COMPOSE := $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v podman-compose >/dev/null 2>&1; then echo "podman-compose"; else echo "echo 'No compose tool found' && exit 1"; fi)

# --- Help ---
.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Environment (Local Development) ---
.PHONY: up
up: ## Start the local test environment (containers + mocks)
	@$(LOCAL_SETUP)

.PHONY: down
down: ## Stop and remove all local containers
	@$(COMPOSE_DOWN)

.PHONY: restart
restart: down up ## Restart the local environment

.PHONY: logs
logs: ## Tail container logs
	@$(COMPOSE) logs -f

# --- Quality & Testing ---
.PHONY: lint
lint: ## Run ESLint
	@$(NPM) run lint

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	@$(NPM) run typecheck

.PHONY: test
test: ## Run unit and integration tests (Vitest)
	@$(NPM) test

.PHONY: test-api
test-api: ## Run API functional tests against local environment
	@$(TEST_API)

.PHONY: ci
ci: lint typecheck test ## Run all CI quality checks (lint, typecheck, test)

# --- Building & Production ---
.PHONY: build
build: ## Build the Next.js production bundle
	@$(NPM) run build

.PHONY: start
start: ## Start the Next.js production server
	@$(NPM) start

# --- Database ---
.PHONY: db-reset
db-reset: ## Wipe and re-initialize the local database schema
	@$(DB_RESET)

.PHONY: db-seed
db-seed: ## Apply seed data to the local database
	@$(DB_SEED)

.PHONY: db-shell
db-shell: ## Open a psql shell inside the database container
	@$(COMPOSE) exec database psql -U oga_user -d oga_local
