.PHONY: stack-up-min stack-up-full stack-down stack-logs stack-clean build-api-image build-web-image signal-refresh-build signal-refresh

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
	$(CTR_COMPOSE_CMD) build api

build-web-image: ## Build the web Docker image from current branch sources
	$(CTR_COMPOSE_CMD) build web

signal-refresh-build: ## Build the tooling-only signal-refresh image (refresh stage)
	$(CTR_COMPOSE_CMD) --profile refresh build signal-refresh

signal-refresh: ## Run the containerized signal-refresh pipeline (boots postgres + neon-proxy first)
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh up -d postgres neon-proxy
	$(CTR_COMPOSE_CMD) --profile minimal --profile refresh run --rm signal-refresh
