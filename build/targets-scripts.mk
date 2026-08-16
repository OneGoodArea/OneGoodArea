.PHONY: scripts-bootstrap-test-key seed-showcase-key

scripts-bootstrap-test-key: ## Bootstrap a test user + API key (local dev only)
	node scripts/bootstrap-test-key.mjs $(ARGS)

seed-showcase-key: ## Generate a one-time showcase API key + dashboard snippets
	node scripts/gen-showcase-key.mjs $(ARGS)

# --- Containerized script runner -------------------------------------------------
# Run any scripts/<SCRIPT>.mjs inside a throwaway node:22-alpine container.
#   make scripts-run SCRIPT=gen-api-test-plan.mjs
#   make scripts-run SCRIPT=mint-session-token.mjs ARGS='--help'
# scripts/ is mounted read-only; .artifacts/ is writable. Host env vars listed
# in SCRIPTS_ENV_VARS are forwarded into the container (-e NAME uses host value).
SCRIPTS_IMAGE     ?= node:22-alpine
SCRIPTS_MOUNT_SRC ?= $(CURDIR)/scripts
SCRIPTS_MOUNT_OUT ?= $(CURDIR)/.artifacts
SCRIPTS_RUN_USER  ?= $(shell id -u):$(shell id -g)
SCRIPTS_ENV_VARS  ?= DOMAIN OGA_API_KEY OGA_SESSION_TOKEN OGA_CRON_SECRET OGA_LOG_LEVEL LOG_LEVEL NODE_ENV

# Expand each whitelisted var into a "-e NAME" flag only when it is defined.
scripts-env-flags = $(foreach v,$(SCRIPTS_ENV_VARS),$(if $(filter undefined,$(origin $(v))),,-e $(v)))

.PHONY: scripts-run
scripts-run: ## Run a scripts/<SCRIPT>.mjs (repo scripts/ dir) in node:22-alpine (SCRIPT=name.mjs [ARGS=...])
	@test -n "$(SCRIPT)" || { echo "usage: make scripts-run SCRIPT=<name>.mjs [ARGS='...']"; exit 1; }
	@test -f "$(SCRIPTS_MOUNT_SRC)/$(SCRIPT)" || { echo "scripts/$(SCRIPT) not found"; exit 1; }
	$(CTR_ENGINE) run --rm --network host \
	  --user "$(SCRIPTS_RUN_USER)" \
	  -v "$(SCRIPTS_MOUNT_SRC):/work/scripts:ro" \
	  -v "$(SCRIPTS_MOUNT_OUT):/work/.artifacts:rw" \
	  -w /work \
	  $(call scripts-env-flags) \
	  $(SCRIPTS_IMAGE) node scripts/$(SCRIPT) $(ARGS)

# Run the FULL API test suite inside the container (generates the plan from
# $DOMAIN/docs/json, then exercises every endpoint with curl). node:22-alpine
# lacks bash/curl, so they are installed on the fly before the run.
#   make scripts-api-test-suite
.PHONY: scripts-api-test-suite
scripts-api-test-suite: ## Run scripts/api-test-suite.sh (full suite) in node:22-alpine (container)
	$(CTR_ENGINE) run --rm --network host \
	  -v "$(CURDIR)/scripts:/work/scripts:ro" \
	  -v "$(CURDIR)/.artifacts:/work/.artifacts:rw" \
	  -w /work \
	  $(call scripts-env-flags) \
	  $(SCRIPTS_IMAGE) sh -c 'apk add --no-cache bash curl && bash scripts/api-test-suite.sh; rc=$$?; chown -R $(shell id -u):$(shell id -u) /work/.artifacts; exit $$rc'
