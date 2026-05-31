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

# --- legacy API shortcuts ----------------------------------------------
IMG     ?= onegoodarea/api:local
NAME    ?= oga-api
PORT    ?= 8080
ENVFILE ?= .env.local

.PHONY: help api-build api-run api-stop api-clean \
        container-build container-run container-stop container-logs \
        container-guard

help:
	@echo "OneGoodArea container targets:"
	@echo "  make container-info                                       runtime info"
	@echo "  make api-build                                            build $(IMG)"
	@echo "  make api-run                                              run $(NAME) on :$(PORT) (env: $(ENVFILE))"
	@echo "  make api-stop                                             stop $(NAME)"
	@echo "  make api-clean                                            stop $(NAME) + drop $(IMG)"
	@echo "  make container-build ENV=<local|dev|prod> SERVICE=<api|web|postgres>"
	@echo "  make container-run   ENV=<...> SERVICE=<...>"
	@echo "  make container-stop  ENV=<...> SERVICE=<...>"
	@echo "  make container-logs  ENV=<...> SERVICE=<...>"

api-build:
	$(CONTAINER_ENGINE) build -t $(IMG) -f container/api/Containerfile .

api-run:
	$(CONTAINER_ENGINE) run -d --rm --name $(NAME) -p $(PORT):8080 --env-file $(ENVFILE) $(IMG)
	@echo "Started $(NAME) -> http://localhost:$(PORT)/health"

api-stop:
	-$(CONTAINER_ENGINE) stop $(NAME)

api-clean: api-stop
	-$(CONTAINER_ENGINE) rmi $(IMG)

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
