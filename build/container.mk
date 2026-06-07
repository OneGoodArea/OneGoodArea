ifeq ($(OS),Windows_NT)
  CTR_HOST_OS := windows
else
  CTR_HOST_OS := $(shell uname -s 2>/dev/null | tr A-Z a-z)
endif

ifeq ($(origin CTR_ENGINE), undefined)
  ifeq ($(CTR_HOST_OS),linux)
    ifneq ($(shell command -v podman 2>/dev/null),)
      CTR_ENGINE := podman
    else ifneq ($(shell command -v docker 2>/dev/null),)
      CTR_ENGINE := docker
    else
      $(error No container engine found in PATH; install podman or docker, or set CTR_ENGINE)
    endif
  else
    ifneq ($(shell command -v docker 2>/dev/null),)
      CTR_ENGINE := docker
    else ifneq ($(shell command -v podman 2>/dev/null),)
      CTR_ENGINE := podman
    else
      $(error No container engine found in PATH; install docker or podman, or set CTR_ENGINE)
    endif
  endif
endif

CTR_COMPOSE ?= $(CTR_ENGINE) compose

.PHONY: stack-engine-info

stack-engine-info: ## Show detected container engine and runtime info
	@echo "container runtime"
	@echo "  host os         : $(CTR_HOST_OS)"
	@echo "  engine          : $(CTR_ENGINE)"
	@echo "  compose         : $(CTR_COMPOSE)"
	@echo "  override engine : CTR_ENGINE=docker|podman make <target>"
