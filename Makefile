# OneGoodArea -- container Make interface (Plan 008).
#
# Cross-platform: Linux defaults to Podman, macOS/Windows default to Docker.
# All engine calls route through $(CONTAINER_ENGINE) from build/container.mk
# -- never hardcode "docker" or "podman" here.
#
# Two target families:
#   api-*                    -- ergonomic API shortcuts (legacy + still useful)
#   container-*  ENV=  SERVICE= -- portable per-service prod-mirror targets
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

# --- legacy API shortcuts ----------------------------------------------
API_IMAGE   ?= onegoodarea/api:local
API_NAME    ?= oga-api
API_PORT    ?= 8080
API_ENVFILE ?= .env.local

.PHONY: help setup setup-install setup-env dev dev-signals migrate \
        bootstrap-test-key test typecheck lint refresh-deprivation \
        refresh-property refresh-crime api-build api-run api-stop api-clean \
        container-build container-run container-stop container-logs \
        container-guard

help:
	@echo "OneGoodArea targets:"
	@echo "  make setup                                                install deps and scaffold .env.local files"
	@echo "  make dev                                                  run the API on :8080"
	@echo "  make dev-signals                                          run the API with OGA_SIGNALS_API=true"
	@echo "  make migrate                                              run API migrations"
	@echo "  make bootstrap-test-key                                   create a disposable test API key"
	@echo "  make test | typecheck | lint                              workspace checks"
	@echo "  make refresh-deprivation                                  refresh deprivation signals"
	@echo "  make refresh-property                                     refresh property signals"
	@echo "  make refresh-crime ARCHIVE_DIR=/path/to/folder            refresh crime signals"
	@echo "  make container-info                                       runtime info"
	@echo "  make api-build                                            build $(API_IMAGE)"
	@echo "  make api-run                                              run $(API_NAME) on :$(API_PORT) (env: $(API_ENVFILE))"
	@echo "  make api-stop                                             stop $(API_NAME)"
	@echo "  make api-clean                                            stop $(API_NAME) + drop $(API_IMAGE)"
	@echo "  make container-build ENV=<local|dev|prod> SERVICE=<api|web|postgres>"
	@echo "  make container-run   ENV=<...> SERVICE=<...>"
	@echo "  make container-stop  ENV=<...> SERVICE=<...>"
	@echo "  make container-logs  ENV=<...> SERVICE=<...>"

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
	$(CONTAINER_ENGINE) run -d --rm --name $(API_NAME) -p $(API_PORT):8080 --env-file $(API_ENVFILE) $(API_IMAGE)
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
