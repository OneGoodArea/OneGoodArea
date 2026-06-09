.PHONY: compose-down api-test-container api-test-coverage-container web-test-container web-test-coverage-container

COMPOSE_TEST_FILE ?= compose/compose.test.yml
CTR_COMPOSE_TEST_CMD = $(CTR_COMPOSE) -f $(COMPOSE_TEST_FILE) --project-name oga-test

api-test-container: ## Run API tests in ephemeral container (plain, no coverage)
	$(CTR_COMPOSE_TEST_CMD) run --rm --entrypoint sh api-test -lc "npm install --no-audit --no-fund && npm run test -w @onegoodarea/api"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

api-test-coverage-container: ## Run API tests with coverage in ephemeral container
	$(CTR_COMPOSE_TEST_CMD) run --rm --entrypoint sh api-test -lc "npm install --no-audit --no-fund && npm run test:coverage -w @onegoodarea/api"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

web-test-container: ## Run web tests in ephemeral container (plain, no coverage)
	$(CTR_COMPOSE_TEST_CMD) run --rm --entrypoint sh web-test -lc "npm run test -w @onegoodarea/web"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

web-test-coverage-container: ## Run web tests with coverage in ephemeral container
	$(CTR_COMPOSE_TEST_CMD) run --rm --entrypoint sh web-test -lc "npm run test:coverage -w @onegoodarea/web"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT
