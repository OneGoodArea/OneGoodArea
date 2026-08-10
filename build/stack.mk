.PHONY: stack-up-min stack-up-full stack-down stack-logs stack-clean build-api-image build-web-image signal-refresh-build signal-refresh stack-dev-up stack-dev-down stack-dev-logs

stack-up-min: ## Boot minimal stack (postgres, neon-proxy, api, web)
	$(CTR_COMPOSE_CMD) --profile minimal up -d $(BUILD_FLAG)

stack-down-min: ## Stop minimal stack and remove orphan containers
	$(CTR_COMPOSE_CMD) --profile minimal down --remove-orphans

stack-up-full: ## Boot full stack (minimal + mocks)
	$(CTR_COMPOSE_CMD) --profile minimal --profile full up -d $(BUILD_FLAG)

stack-down-full: ## Stop full stack and remove orphan containers
	$(CTR_COMPOSE_CMD) --profile minimal --profile full down --remove-orphans

stack-up-db: ## Boot db-only stack (postgres + full profile)
	$(CTR_COMPOSE_CMD) --profile db --profile full up -d $(BUILD_FLAG)

stack-down: ## Stop stack and remove orphan containers
	$(CTR_COMPOSE_CMD) down --remove-orphans

stack-logs: ## Follow logs for active stack services
	$(CTR_COMPOSE_CMD) logs -f

stack-clean: ## Stop stack and remove named volumes
	$(CTR_COMPOSE_CMD) down --remove-orphans --volumes

build-api-image: ## Build the api Docker image from current branch sources
	$(CTR_COMPOSE_CMD) --profile minimal build api

build-web-image: ## Build the web Docker image from current branch sources
	$(CTR_COMPOSE_CMD) --profile minimal build web

signal-refresh-build: ## Build the tooling-only signal-refresh image (refresh stage)
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh build signal-refresh

signal-refresh: ## Run the containerized signal-refresh pipeline (boots postgres + neon-proxy first)
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh up -d postgres neon-proxy
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh run --rm -T signal-refresh

load-geo: ## Load ONS NSPL spine into local DB (usage: make load-geo FILE=apps/api/seed/nspl-sample.csv)
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh up -d postgres neon-proxy
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh run --rm -T signal-refresh \
	  bash -c "npm run load:geo -w @onegoodarea/api -- $(FILE)"

stack-dev-up: ## Boot dev stack from host source (bind-mounted, hot reload)
	$(CTR_COMPOSE_DEV) --profile minimal --profile full up -d $(BUILD_FLAG)

stack-dev-down: ## Stop dev stack and remove orphan containers
	$(CTR_COMPOSE_DEV) down --remove-orphans

stack-dev-logs: ## Follow logs for dev stack services
	$(CTR_COMPOSE_DEV) logs -f
