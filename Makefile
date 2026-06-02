# OneGoodArea -- container Make interface (Plans 008 + 009).
#
# Cross-platform: Linux defaults to Podman, macOS/Windows default to Docker.
# All engine calls route through $(CONTAINER_ENGINE) from build/container.mk
# -- never hardcode "docker" or "podman" here.
#
# Two target families:
#   api-*                    -- ergonomic API shortcuts (legacy + still useful)
#   container-*  ENV=  SERVICE= -- portable per-service prod-mirror targets
#   db-*                     -- standalone postgres lifecycle (Plan 009)
#
# Usage:
#   make container-info        show detected engine + host OS
#   make api-build             build the API image
#   make api-run               run API detached on $(PORT) (env from $(ENVFILE))
#   make api-stop              stop the API container
#   make api-clean             stop API + remove API image
#
#   make container-build ENV=prod SERVICE=api|web|postgres
#   make container-run   ENV=prod SERVICE=api|web|postgres
#   make container-stop  ENV=prod SERVICE=api|web|postgres
#   make container-logs  ENV=prod SERVICE=api|web|postgres
#
# Override variables on the command line, e.g.:
#   make container-build ENV=local SERVICE=web CONTAINER_ENGINE=podman

include build/container.mk

# --- local setup ----------------------------------------------------------
WEB_ENV_FILE ?= apps/web/.env.local
API_ENV_FILE ?= apps/api/.env.local
BOOTSTRAP_EMAIL ?= api-test@onegoodarea.local
BOOTSTRAP_PLAN ?= sandbox
CRIME_ARCHIVE_DIR ?=

# --- postgres container (Plan 009) ------------------------------------
DB_IMG     ?= postgres:16-alpine
DB_NAME    ?= oga-postgres
DB_PORT    ?= 55432
DB_VOL     ?= oga-postgres-data
NET_NAME   ?= oga-network

# --- legacy API shortcuts ----------------------------------------------
API_IMAGE   ?= onegoodarea/api:local
API_NAME    ?= oga-api
API_PORT    ?= 8080
API_ENVFILE ?= .env.local

.PHONY: help setup setup-install setup-env dev dev-signals migrate \
        bootstrap-test-key test typecheck lint refresh-deprivation \
        refresh-property refresh-crime api-build api-run api-stop api-clean \
        container-build container-run container-stop container-logs \
        container-guard \
        db-net db-vol db-run db-stop db-clean db-seed

help:
	@echo ""
	@echo "  OneGoodArea — available targets"
	@echo ""
	@echo "  ── Development ──────────────────────────────────────────────────────"
	@echo "  setup                     install npm deps + scaffold .env.local files"
	@echo "  dev                       run the API in watch mode on :8080"
	@echo "  dev-signals               run the API with OGA_SIGNALS_API=true"
	@echo "  migrate                   run pending DB schema migrations"
	@echo "  bootstrap-test-key        create a disposable test API key"
	@echo "                            (EMAIL=$(BOOTSTRAP_EMAIL) PLAN=$(BOOTSTRAP_PLAN))"
	@echo ""
	@echo "  ── Checks ───────────────────────────────────────────────────────────"
	@echo "  test                      run the full test suite"
	@echo "  typecheck                 TypeScript type-check (no emit)"
	@echo "  lint                      ESLint across all packages"
	@echo ""
	@echo "  ── Data refresh ─────────────────────────────────────────────────────"
	@echo "  refresh-deprivation       re-ingest deprivation signal data"
	@echo "  refresh-property          re-ingest property signal data"
	@echo "  refresh-crime             re-ingest crime data"
	@echo "                            (CRIME_ARCHIVE_DIR=/path/to/folder  required)"
	@echo ""
	@echo "  ── Local Postgres container (Plan 009) ──────────────────────────────"
	@echo "  db-net                    create the $(NET_NAME) bridge network"
	@echo "  db-vol                    create the $(DB_VOL) named volume"
	@echo "  db-run                    start $(DB_NAME) on :$(DB_PORT)  [db-net + db-vol implied]"
	@echo "  db-stop                   stop and remove the $(DB_NAME) container"
	@echo "  db-clean                  db-stop + destroy the data volume (full reset)"
	@echo "  db-seed                   load framework + baseline seed SQL"
	@echo ""
	@echo "  One-time setup:  make db-run  →  make migrate  →  make db-seed"
	@echo "  Full reset:      make db-clean  →  make db-run  →  make migrate  →  make db-seed"
	@echo ""
	@echo "  ── API container shortcuts ──────────────────────────────────────────"
	@echo "  api-build                 build $(API_IMAGE)"
	@echo "  api-run                   run $(API_NAME) on :$(API_PORT)  (env: $(API_ENVFILE))"
	@echo "  api-stop                  stop $(API_NAME)"
	@echo "  api-clean                 api-stop + remove image"
	@echo ""
	@echo "  ── Portable per-service targets  (ENV=  SERVICE=) ───────────────────"
	@echo "  container-info            show detected engine + host OS"
	@echo "  container-build           build image  ENV=<local|dev|prod> SERVICE=<api|web|postgres>"
	@echo "  container-run             start container  ENV=<...> SERVICE=<...>"
	@echo "  container-stop            stop container   ENV=<...> SERVICE=<...>"
	@echo "  container-logs            tail logs        ENV=<...> SERVICE=<...>"
	@echo ""

setup: setup-install setup-env
	@echo "Fill in $(WEB_ENV_FILE) and $(API_ENV_FILE), then run 'make dev'."

setup-install:
	npm ci

setup-env:
	@if [ -f "$(WEB_ENV_FILE)" ]; then echo "$(WEB_ENV_FILE) already exists"; else cp apps/web/.env.example "$(WEB_ENV_FILE)" && echo "created $(WEB_ENV_FILE)"; fi
	@if [ -f "$(API_ENV_FILE)" ]; then echo "$(API_ENV_FILE) already exists"; else cp apps/api/.env.example "$(API_ENV_FILE)" && echo "created $(API_ENV_FILE)"; fi

dev:
	npm run dev -w @onegoodarea/api

dev-signals:
	OGA_SIGNALS_API=true npm run dev -w @onegoodarea/api

migrate:
	npm run migrate -w @onegoodarea/api

bootstrap-test-key:
	npm run bootstrap:test-key -w @onegoodarea/api -- --email $(BOOTSTRAP_EMAIL) --plan $(BOOTSTRAP_PLAN)

test:
	npm test

typecheck:
	npm run typecheck

lint:
	npm run lint

refresh-deprivation:
	npm run refresh:deprivation -w @onegoodarea/api

refresh-property:
	npm run refresh:property -w @onegoodarea/api

refresh-crime:
	@test -n "$(CRIME_ARCHIVE_DIR)" || { echo "ERROR: CRIME_ARCHIVE_DIR is required"; exit 2; }
	npm run refresh:crime -w @onegoodarea/api -- $(CRIME_ARCHIVE_DIR)

api-build:
	$(CONTAINER_ENGINE) build -t $(API_IMAGE) -f container/api/Containerfile .

api-run:
	$(CONTAINER_ENGINE) run -d --rm --name $(API_NAME) -p $(API_PORT):8080 --env-file $(API_ENVFILE) --network $(NET_NAME) $(API_IMAGE)
	@echo "Started $(API_NAME) -> http://localhost:$(API_PORT)/health"

api-stop:
	-$(CONTAINER_ENGINE) stop $(API_NAME)

api-clean: api-stop
	-$(CONTAINER_ENGINE) rmi $(API_IMAGE)

# --- portable per-service targets --------------------------------------
#
# Inputs (must be supplied on the command line):
#   ENV     = local | dev | prod
#   SERVICE = api | web | postgres
#
# Derived:
#   IMAGE     = onegoodarea/$(SERVICE):$(ENV)
#   C_NAME    = oga-$(SERVICE)
#   ENV_FILE  = env/$(ENV)/$(SERVICE).env
#   PORT_HOST = host-side port (per service)
#   PORT_CONT = container-side port (per service)
#   CTX       = build context (api/web = repo root, postgres = its own dir)
#   DOCKERFILE = container/$(SERVICE)/Containerfile

IMAGE      = onegoodarea/$(SERVICE):$(ENV)
C_NAME     = oga-$(SERVICE)
ENV_FILE   = env/$(ENV)/$(SERVICE).env
DOCKERFILE = container/$(SERVICE)/Containerfile

# Per-service port defaults. PORT_HOST_OVERRIDE can pin a custom host port
# from the CLI without rewriting the matrix.
ifeq ($(SERVICE),api)
  PORT_CONT = 8080
  PORT_HOST ?= 8080
  CTX = .
endif
ifeq ($(SERVICE),web)
  PORT_CONT = 3000
  PORT_HOST ?= 3000
  CTX = .
endif
ifeq ($(SERVICE),postgres)
  PORT_CONT = 5432
  PORT_HOST ?= 5432
  CTX = container/postgres
endif

# Guard: both ENV and SERVICE must be set, must be in the allow-list.
container-guard:
	@test -n "$(ENV)" || { echo "ERROR: ENV is required (local|dev|prod)"; exit 2; }
	@test -n "$(SERVICE)" || { echo "ERROR: SERVICE is required (api|web|postgres)"; exit 2; }
	@case "$(ENV)" in local|dev|prod) ;; *) echo "ERROR: ENV=$(ENV) not in {local,dev,prod}"; exit 2 ;; esac
	@case "$(SERVICE)" in api|web|postgres) ;; *) echo "ERROR: SERVICE=$(SERVICE) not in {api,web,postgres}"; exit 2 ;; esac

container-build: container-guard
	@echo "building $(IMAGE) via $(CONTAINER_ENGINE) ($(DOCKERFILE), context=$(CTX))"
	$(CONTAINER_ENGINE) build -t $(IMAGE) -f $(DOCKERFILE) $(CTX)

container-run: container-guard
	@test -f $(ENV_FILE) || { echo "ERROR: $(ENV_FILE) not found. Copy $(ENV_FILE).example and fill it in."; exit 2; }
	@echo "starting $(C_NAME) ($(IMAGE)) on :$(PORT_HOST) (env: $(ENV_FILE))"
	$(CONTAINER_ENGINE) run -d --rm --name $(C_NAME) -p $(PORT_HOST):$(PORT_CONT) --env-file $(ENV_FILE) $(IMAGE)

container-stop: container-guard
	-$(CONTAINER_ENGINE) stop $(C_NAME)

container-logs: container-guard
	$(CONTAINER_ENGINE) logs -f $(C_NAME)

# --- postgres container lifecycle (Plan 009) ---------------------------
#
# One-time setup:        make db-net db-vol db-run db-seed
# Tear down completely:  make db-clean

db-net:
	$(CONTAINER_ENGINE) network create $(NET_NAME) 2>/dev/null || true

db-vol:
	$(CONTAINER_ENGINE) volume create $(DB_VOL)

db-run: db-net db-vol
	$(CONTAINER_ENGINE) run -d \
	  --name $(DB_NAME) \
	  --network $(NET_NAME) \
	  -p $(DB_PORT):5432 \
	  -e POSTGRES_USER=oga \
	  -e POSTGRES_PASSWORD=oga \
	  -e POSTGRES_DB=oga \
	  -v $(DB_VOL):/var/lib/postgresql/data \
	  -v $(CURDIR)/apps/web/tests/db/bootstrap:/docker-entrypoint-initdb.d:ro \
	  $(DB_IMG)
	@echo "$(DB_NAME) listening on localhost:$(DB_PORT)"

db-stop:
	-$(CONTAINER_ENGINE) stop $(DB_NAME)
	-$(CONTAINER_ENGINE) rm   $(DB_NAME)

db-clean: db-stop
	-$(CONTAINER_ENGINE) volume rm $(DB_VOL)

db-seed:
	$(CONTAINER_ENGINE) exec -i $(DB_NAME) psql -U oga -d oga \
	  < apps/web/tests/seeds/framework/001-seed-framework.sql
	$(CONTAINER_ENGINE) exec -i $(DB_NAME) psql -U oga -d oga \
	  < apps/web/tests/seeds/profiles/baseline/100-baseline-users.sql
	@echo "Seed applied."
