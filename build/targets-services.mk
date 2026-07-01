.PHONY: compose-down api-test-container api-test-coverage-container web-test-container web-test-coverage-container build-api-test-image build-web-test-image build-stripe-mock-test-image build-test-images test-all-container

COMPOSE_TEST_FILE ?= compose/compose.test.yml
CTR_COMPOSE_TEST_CMD = $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test
# Pass BUILD_FLAG=--build to force image rebuild (otherwise cached)
BUILD_FLAG_TEST ?=

api-test-container: ## Run API tests in ephemeral container (plain, no coverage)
	$(CTR_COMPOSE_TEST_CMD) run $(BUILD_FLAG_TEST) --rm --entrypoint sh api-test -lc "npm install --no-audit --no-fund && npm run test -w @onegoodarea/api"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

api-test-coverage-container: ## Run API tests with coverage in ephemeral container
	$(CTR_COMPOSE_TEST_CMD) run $(BUILD_FLAG_TEST) --rm --entrypoint sh api-test -lc "npm install --no-audit --no-fund && npm run test:coverage -w @onegoodarea/api"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

web-test-container: ## Run web tests in ephemeral container (plain, no coverage)
	$(CTR_COMPOSE_TEST_CMD) run $(BUILD_FLAG_TEST) --rm --entrypoint sh web-test -lc "npm run test -w @onegoodarea/web"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

web-test-coverage-container: ## Run web tests with coverage in ephemeral container
	$(CTR_COMPOSE_TEST_CMD) run $(BUILD_FLAG_TEST) --rm --entrypoint sh web-test -lc "npm run test:coverage -w @onegoodarea/web"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

build-api-test-image: ## Build the api-test Docker image from current branch sources
	$(CTR_COMPOSE_TEST_CMD) build api-test

build-web-test-image: ## Build the web-test Docker image from current branch sources
	$(CTR_COMPOSE_TEST_CMD) build web-test

build-stripe-mock-test-image: ## Build the stripe-mock-test Docker image
	$(CTR_COMPOSE_TEST_CMD) build stripe-mock-test

build-test-images: ## Build all test Docker images
	$(CTR_COMPOSE_TEST_CMD) build stripe-mock-test api-test web-test

test-all-container: ## Run API and web tests in parallel (uses different project names)
	@set -e; TMP=$$(mktemp); \
	( $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test-api run $(BUILD_FLAG_TEST) --rm --entrypoint sh api-test -lc "npm install --no-audit --no-fund && npm run test -w @onegoodarea/api"; echo $$? > $$TMP.api; $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test-api down > /dev/null 2>&1 ) & \
	( $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test-web run $(BUILD_FLAG_TEST) --rm --entrypoint sh web-test -lc "npm run test -w @onegoodarea/web"; echo $$? > $$TMP.web; $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test-web down > /dev/null 2>&1 ) & \
	wait; \
	API_EXIT=$$(cat $$TMP.api); WEB_EXIT=$$(cat $$TMP.web); rm -f $$TMP.*; \
	if [ $$API_EXIT -ne 0 ] || [ $$WEB_EXIT -ne 0 ]; then \
		echo "Tests failed: API exit=$$API_EXIT, Web exit=$$WEB_EXIT"; \
		exit 1; \
	fi
