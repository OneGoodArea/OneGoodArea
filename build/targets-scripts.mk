.PHONY: scripts-bootstrap-test-key scripts-reset-playground-limit

scripts-bootstrap-test-key: ## Bootstrap a test user + API key (local dev only)
	node e2e/bootstrap-test-key.mjs $(ARGS)

scripts-reset-playground-limit: ## Reset playground daily IP rate limit (local dev only)
	node scripts/reset-playground-rate-limit.mjs $(ARGS)
