.PHONY: help

# Portable ANSI colors. printf interprets \033 on every platform/shell
# (bash, zsh, Git-Bash, and cmd.exe via sh), unlike echo's \033 literals
# which render as raw control chars on Windows.
#
# Colors are disabled automatically when stdout is not a TTY (piped/logged)
# or when NO_COLOR / TERM=dumb is set.
ifeq ($(shell test -t 1 && echo 1),1)
  ifeq ($(NO_COLOR),)
    ifneq ($(TERM),dumb)
      MK_BOLD  := \033[1m
      MK_CYAN  := \033[1;36m
      MK_BLUE  := \033[36m
      MK_RESET := \033[0m
    endif
  endif
endif

help: ## Display available Make targets
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_BOLD)' 'OneGoodArea — Make Targets' '$(MK_RESET)'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'App (host)' '$(MK_RESET)'
	@grep -hE '^app-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'Stack (compose)' '$(MK_RESET)'
	@grep -hE '^(stack-(up|down|logs|clean|dev)|signal-refresh|amenities-refresh|load-geo)[a-zA-Z0-9._-]*:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'Build images' '$(MK_RESET)'
	@grep -hE '^build-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'Container tests' '$(MK_RESET)'
	@grep -hE '^[a-z]+-[a-z-]*container:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'Scripts' '$(MK_RESET)'
	@grep -hE '^scripts-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
	@printf '%s%s%s\n' '$(MK_CYAN)' 'Info' '$(MK_RESET)'
	@grep -hE '^stack-engine-info:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  $(MK_BLUE)%-32s$(MK_RESET) %s\n", $$1, $$2}'
	@printf '%s\n' ''
