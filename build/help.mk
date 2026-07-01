.PHONY: help

help: ## Display available Make targets
	@echo ""
	@echo "\033[1mOneGoodArea — Make Targets\033[0m"
	@echo ""
	@echo "\033[1;36mApp (host)\033[0m"
	@grep -hE '^app-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "\033[1;36mStack (compose)\033[0m"
	@grep -hE '^stack-(up|down|logs|clean)[a-zA-Z0-9._-]*:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "\033[1;36mBuild images\033[0m"
	@grep -hE '^build-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "\033[1;36mContainer tests\033[0m"
	@grep -hE '^[a-z]+-[a-z-]*container:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "\033[1;36mInfo\033[0m"
	@grep -hE '^stack-engine-info:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
