.PHONY: app-setup app-build app-dev app-test app-typecheck app-lint

APP_API_ENV ?= env/local/api.env
APP_WEB_ENV ?= env/local/web.env
APP_PG_ENV ?= env/local/postgres.env

app-setup: ## Install deps and scaffold local env files
	npm ci
	@if [ -f "$(APP_API_ENV)" ]; then echo "$(APP_API_ENV) already exists"; else cp env/local/api.env.example "$(APP_API_ENV)" && echo "created $(APP_API_ENV)"; fi
	@if [ -f "$(APP_WEB_ENV)" ]; then echo "$(APP_WEB_ENV) already exists"; else cp env/local/web.env.example "$(APP_WEB_ENV)" && echo "created $(APP_WEB_ENV)"; fi
	@if [ -f "$(APP_PG_ENV)" ]; then echo "$(APP_PG_ENV) already exists"; else cp env/local/postgres.env.example "$(APP_PG_ENV)" && echo "created $(APP_PG_ENV)"; fi

app-build: ## Build all workspace packages on host
	npm run build

app-dev: ## Run API in host watch mode
	npm run dev -w @onegoodarea/api

app-test: ## Run full test suite on host
	npm test

app-typecheck: ## Run strict TypeScript checks on host
	npm run typecheck

app-lint: ## Run ESLint across workspace on host
	npm run lint
