# build/container.mk -- container runtime abstraction (Plan 008 Commit A).
#
# Single source of truth for which OCI engine the Makefile invokes. Linux
# defaults to Podman (rootless, daemonless, no Docker Desktop license). macOS
# and Windows default to Docker (Docker Desktop is the path of least resistance
# there). Both engines honour the "Containerfile" filename, so the image
# definitions are engine-agnostic.
#
# Override either var on the command line (highest precedence) or via env:
#   make api-build CONTAINER_ENGINE=docker
#   CONTAINER_ENGINE=podman make api-build
#
# Targets must always reference $(CONTAINER_ENGINE) / $(CONTAINER_COMPOSE)
# and never hardcode "docker" or "podman" -- that is the whole point of this
# include.

# Detect host OS. `uname -s` works on Linux + macOS + Git Bash / WSL on Windows.
# Pure cmd.exe make sets OS=Windows_NT instead -- handle both.
ifeq ($(OS),Windows_NT)
  CONTAINER_HOST_OS := windows
else
  CONTAINER_HOST_OS := $(shell uname -s 2>/dev/null | tr A-Z a-z)
endif

# Engine default: Podman on Linux, Docker on macOS/Windows.
ifeq ($(CONTAINER_HOST_OS),linux)
  CONTAINER_ENGINE ?= podman
else
  CONTAINER_ENGINE ?= docker
endif

# Compose binding follows the engine. `docker compose` (v2 plugin) and
# `podman compose` (or podman-compose) are the modern invocations -- never
# the legacy `docker-compose` script.
#
# Compose is for local/dev only per Plan 008; prod targets call the engine
# directly. Exposed here so dev Make targets can use a single variable.
ifeq ($(CONTAINER_ENGINE),podman)
  CONTAINER_COMPOSE ?= podman compose
else
  CONTAINER_COMPOSE ?= docker compose
endif

.PHONY: container-info

container-info:
	@echo "container runtime"
	@echo "  host os         : $(CONTAINER_HOST_OS)"
	@echo "  engine          : $(CONTAINER_ENGINE)"
	@echo "  compose         : $(CONTAINER_COMPOSE)"
	@echo "  override engine : CONTAINER_ENGINE=docker|podman make <target>"
