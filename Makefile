# OneGoodArea — local Docker convenience targets for apps/api.
#
# Requires Docker. The Dockerfile lives at repo root and esbuild-bundles
# apps/api/src/server.ts -> dist/server.cjs (see ADR notes + docs/DEPLOY.md).
#
# Usage:
#   make api-build   build the image (multi-stage; production output)
#   make api-run     run the container detached on $(PORT), env from $(ENVFILE)
#   make api-stop    stop the running container (no-op if not running)
#   make api-clean   stop the container AND remove the image (full reset)
#
# Override variables on the command line, e.g.:
#   make api-run PORT=9090 ENVFILE=apps/api/.env.local

IMG     ?= onegoodarea/api:local
NAME    ?= oga-api
PORT    ?= 8080
ENVFILE ?= apps/web/.env.local

.PHONY: help api-build api-run api-stop api-clean

help:
	@echo "OneGoodArea local docker targets:"
	@echo "  make api-build   build $(IMG) from the repo-root Dockerfile"
	@echo "  make api-run     run $(NAME) detached on http://localhost:$(PORT) (env from $(ENVFILE))"
	@echo "  make api-stop    stop $(NAME) (no-op if not running)"
	@echo "  make api-clean   stop $(NAME) + remove image $(IMG)"

api-build:
	docker build -t $(IMG) .

api-run:
	docker run -d --rm --name $(NAME) -p $(PORT):8080 --env-file $(ENVFILE) $(IMG)
	@echo "Started $(NAME) -> http://localhost:$(PORT)/health"

# Leading '-' tells make to ignore exit status; --rm in api-run means stop
# also removes the container, so api-clean only needs to drop the image.
api-stop:
	-@docker stop $(NAME) 2>/dev/null && echo "Stopped $(NAME)" || echo "$(NAME) not running"

api-clean: api-stop
	-@docker rmi $(IMG) 2>/dev/null && echo "Removed image $(IMG)" || echo "Image $(IMG) not present"
