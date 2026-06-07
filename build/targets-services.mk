.PHONY: api-up api-logs web-up db-seed compose-down api-test-coverage-container web-test-coverage-container

api-up: ## Boot API service with compose dependencies
	$(CTR_COMPOSE_CMD) --profile minimal up -d --build api

api-logs: ## Follow API service logs
	$(CTR_COMPOSE_CMD) logs -f api

web-up: ## Boot web service with compose dependencies
	$(CTR_COMPOSE_CMD) --profile minimal up -d --build web

web-logs: ## Follow API service logs
	$(CTR_COMPOSE_CMD) logs -f web

compose-down: ## Stop compose stack and remove orphan containers
	$(CTR_COMPOSE_CMD) down --remove-orphans

db-seed: ## Seed postgres with framework + baseline profile SQL
	$(CTR_COMPOSE_CMD) exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$${POSTGRES_USER:-oga_user}" -d "$${POSTGRES_DB:-oga_local}"' < apps/web/tests/seeds/framework/001-seed-framework.sql
	$(CTR_COMPOSE_CMD) exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$${POSTGRES_USER:-oga_user}" -d "$${POSTGRES_DB:-oga_local}"' < apps/web/tests/seeds/profiles/baseline/100-baseline-users.sql
	$(CTR_COMPOSE_CMD) exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$${POSTGRES_USER:-oga_user}" -d "$${POSTGRES_DB:-oga_local}"' < apps/web/tests/seeds/profiles/baseline/110-baseline-report-cache.sql

api-test-coverage-container: ## Run API coverage in ephemeral API container
	$(CTR_COMPOSE_CMD) run --rm -v $(CURDIR)/.artifacts:/app/.artifacts --entrypoint sh api -lc "npm run test:coverage -w @onegoodarea/api"

web-test-coverage-container: ## Run web coverage in ephemeral web container
	$(CTR_COMPOSE_CMD) run --rm -v $(CURDIR)/.artifacts:/app/.artifacts --entrypoint sh web -lc "npm run test:coverage -w @onegoodarea/web"
