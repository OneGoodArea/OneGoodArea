# OneGoodArea -- container Make interface (Plan 008).
#
# Cross-platform: Linux defaults to Podman, macOS/Windows default to Docker.
# All engine calls route through $(CONTAINER_ENGINE) from build/container.mk
# -- never hardcode "docker" or "podman" here.
#
# Existing api-* targets are kept as ergonomic shortcuts for the API image.
# The plan-008 portable targets (container-build/run/stop/logs ENV=… SERVICE=…)
# land in Commit C alongside the env split.
#
# Usage:
#   make api-build      build the API image (multi-stage; production output)
#   make api-run        run the container detached on $(PORT), env from $(ENVFILE)
#   make api-stop       stop the running container (no-op if not running)
#   make api-clean      stop the container AND remove the image
#   make container-info show detected runtime (engine + host OS)
#
# Override variables on the command line, e.g.:
#   make api-run PORT=9090 ENVFILE=apps/api/.env.local
#   make api-build CONTAINER_ENGINE=docker

include build/container.mk

IMG     ?= onegoodarea/api:local
NAME    ?= oga-api
PORT    ?= 8080
ENVFILE ?= apps/web/.env.local

.PHONY: help api-build api-run api-stop api-clean

help:
	@echo "OneGoodArea container targets:"
	@echo "  make container-info  show detected engine + host OS"
	@echo "  make api-build       build $(IMG) ($(CONTAINER_ENGINE))"
	@echo "  make api-run         run $(NAME) detached on http://localhost:$(PORT) (env from $(ENVFILE))"
	@echo "  make api-stop        stop $(NAME) (no-op if not running)"
	@echo "  make api-clean       stop $(NAME) + remove image $(IMG)"

api-build:
	$(CONTAINER_ENGINE) build -t $(IMG) .

api-run:
	$(CONTAINER_ENGINE) run -d --rm --name $(NAME) -p $(PORT):8080 --env-file $(ENVFILE) $(IMG)
	@echo "Started $(NAME) -> http://localhost:$(PORT)/health"

# Leading '-' tells make to ignore exit status; --rm in api-run means stop
# also removes the container, so api-clean only needs to drop the image.
api-stop:
	-$(CONTAINER_ENGINE) stop $(NAME)

api-clean: api-stop
	-$(CONTAINER_ENGINE) rmi $(IMG)
