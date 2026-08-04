.PHONY: scripts-bootstrap-test-key scripts-reset-playground-limit seed-showcase-key

scripts-bootstrap-test-key: ## Bootstrap a test user + API key (local dev only)
	node scripts/bootstrap-test-key.mjs $(ARGS)

scripts-reset-playground-limit: ## Reset playground daily IP rate limit (local dev only)
	node scripts/reset-playground-rate-limit.mjs $(ARGS)

seed-showcase-key: ## Generate a one-time showcase API key + dashboard snippets
	node scripts/gen-showcase-key.mjs $(ARGS)
