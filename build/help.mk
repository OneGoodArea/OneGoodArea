.PHONY: help

help: ## Display available Make targets
	@echo "========================================================================="
	@echo " ONEGOODAREA AUTOMATED MAKE DISCOVERY CONSOLE "
	@echo "========================================================================="
	@echo "Available Engineering Automation Run Targets:"
	@grep -hE '^[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf " \033[36m%-32s\033[0m %s\n", $$1, $$2}'
