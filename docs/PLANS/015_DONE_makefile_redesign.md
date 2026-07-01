# Makefile & Container Reorganization

Architecture Blueprint & Implementation Plan

```text
JIRA Ref: AR-215 / AR-
Status: Proposed (Zero-Legacy Edition)
Target: Internal Engineering Review
```

## 1. Executive Summary & Core Philosophy

The root orchestration layer has grown organically over multiple development iterations. We are facing an accumulation of technical debt characterized by overlapping script shortcuts, monolithic Makefile clutter, and parallel container strategies (standalone container lifecycle execution vs Docker Compose stacks). This duplication increases configuration drift risks, confuses local onboarding workflows, and slows engineering iteration.

**The Zero-Legacy Mandate:** In order to establish a scalable, intuitive, and modern developer experience (DX), this proposal aggressively cuts away all backward-compatibility requirements. Legacy hooks, transitional target aliases, and old setup paths are to be immediately deleted. This gives our engineering organization a rare opportunity to design a pristine, top-tier developer workspace.

> **Strategic Synthesis:** This plan combines the best components of our team's initial exploratory drafts. We adopt Service-First Target Names to maximize productivity via terminal tab-completion, backed by a clean Layer-Based Modular File Layout under the hood. Furthermore, we decouple container runtimes by standardizing entirely on native Docker Compose Profiles, replacing custom ad-hoc docker run steps.

## 2. Clean Workspace Architecture

We are consolidating all container orchestration, environmental configurations, and microservice definitions into a singular, cohesive design. The following section illustrates the absolute file system layout after stripping away the legacy baggage:

```text
Makefile               # Main entrypoint: includes modular parts, coordinates global targets
build/
  container.mk         # Engine detection layer (automates Podman vs Docker engine selection)
  targets-app.mk       # Host-level bare metal targets (npm, linting, type-checks, local testing)
  targets-compose.mk   # Global multi-container profile stacks & shared helper macros
  targets-services.mk  # Tab-completable shortcuts per service & isolated containerized test runners
  help.mk              # Regex parsing engine for automated self-documenting CLI helper menu
compose/
  compose.yml          # Unified structural definition for all system microservices & mocks
  compose.override.yml # Local workstation parameters (bind mounts, explicit port exposures)
```

**Immediate Removals (Hard Deletion):**
The following files are to be permanently expunged from the codebase as part of this implementation. Dependencies inside [apps/web/scripts/runtime-*.sh](apps/web/scripts/runtime-*.sh) and `tests/unit/runtime-env.test.ts` must be safely updated to map directly to the new unified Compose definitions:

- `container-compose.yml` (Legacy monolithic compose structure)
- `Containerfile.dev` (Outdated development container template)
- `compose/stack.yml`, `compose/web-local.yml`, and `compose/web-external.yml` (Redundant variants)

## 3. Docker Compose Evolution: Native Profiles & Mocking

Managing discrete configuration variations across several distinct compose files introduces configuration fragmentation. Instead, we transition to utilizing native **Docker Compose Profiles** declared inside a single canonical `compose/compose.yml` file.

This strategy allows certain infrastructure services to be grouped into logical development profiles. Mock components (such as an internal Stripe sandbox or a specialized mail server) are only loaded when explicitly requested, preserving system memory and CPU cycles during standard, minimal local execution passes.

### Architectural Conceptualization: `compose/compose.yml`

```yaml
services:
  # --- MINIMAL DEVELOPMENT LAYER (Core Infrastructure) ---
  postgres:
    image: onegoodarea/postgres:local
    profiles: ["minimal"]
    # Shared configuration block...

  neon-proxy:
    image: onegoodarea/neon-compat-proxy:local
    profiles: ["minimal"]
    depends_on:
      - postgres

  api:
    image: onegoodarea/api:local
    profiles: ["minimal"]
    depends_on:
      - neon-proxy

  web:
    image: onegoodarea/web:local
    profiles: ["minimal"]

  # --- MOCK & INTERMEDIARY SANDBOX LAYER ---
  mailhog:
    image: mailhog/mailhog:latest
    profiles: ["full"]

  stripe-mock:
    image: stripe/stripe-mock:latest
    profiles: ["full"]
```

## 4. Refactored Target Taxonomy

To keep a neat separation between commands running directly on an engineer's local host machine and those executing inside isolated container sandboxes, we introduce rigid naming prefixes.

### 4.1 Host-Level App Core (`build/targets-app.mk`)

All processes bound to the native workspace hardware are prefixed with `app-`. This immediately signals execution scope to the developer.

| Target Name | Functional Scope | Description |
| :--- | :--- | :--- |
| `app-setup` | Setup | Installs necessary monorepo npm node_modules and scaffolds required local .env files. |
| `app-build` | Build | Triggers local package builds directly across workspace projects. |
| `app-dev` | Development | Launches the core API application in local live watch mode directly on the machine host. |
| `app-test` | Testing | Executes the local testing framework test runners directly on host resources. |
| `app-typecheck` | Validation | Executes a strict TypeScript validation pass across the entire monorepo. |
| `app-lint` | Quality | Runs strict ESLint analysis routines across all code packages. |

### 4.2 Unified Multi-Container Stack Management (`build/targets-compose.mk`)

These targets manage high-level orchestration, leveraging the compose profile tags to cleanly bring up predefined execution configurations.

| Target Name | Functional Scope | Description |
| :--- | :--- | :--- |
| `stack-up-min` | Orchestration | Boots the minimal operational product development layer (postgres, neon-proxy, api, web). |
| `stack-up-full` | Orchestration | Spins up the full workspace ecosystem including third-party testing mocks (stripe-mock, mailhog). |
| `stack-down` | Lifecycle | Gracefully terminates running containers, teardown networks, and unloads any active profiles. |
| `stack-logs` | Diagnostics | Streams and consolidates real-time diagnostic output streams from all active system services. |
| `stack-clean` | Cleanup | Forces stack teardown and permanently destroys local system database volumes for total state reset. |

### 4.3 Service Control & Isolated Container Testing (`build/targets-services.mk`)

To provide maximum terminal command discovery, individual service actions utilize a clean `<service>-<action>` syntax. This allows developers to rely on tab-completion (e.g., typing `make api-` and hitting Tab) to find specific microservice utilities.

Furthermore, this module encapsulates the **Ephemeral Container Test Architecture**. Developers can run specialized test tasks that spawn an isolated, headless container runtime environment. The runner automatically executes deep testing configurations, pipes generated coverage output data straight into the developer's shared workspace assets folder, and gracefully cleans itself up after completing the pass.

| Target Name | Functional Scope | Description |
| :--- | :--- | :--- |
| `api-up` | Service | Spins up the isolated API microservice runtime along with its immediate core network dependencies. |
| `api-logs` | Monitoring | Tail and isolate live diagnostic trace lines specifically emitted from the API application layer. |
| `web-up` | Service | Targeted orchestration command to bring up the Web client frontend module via docker compose. |
| `db-seed` | Database | Executes standard system migration initialization and seeds database values directly into the active container instance. |
| `api-test-coverage-container` | Ephemeral Runner | Isolated Ephemeral Container Runner: Instantly boots up an optimized testing environment container, performs automated application coverage evaluations, outputs valid reports into local directories, and cleanly vanishes. |
| `web-test-coverage-container` | Ephemeral Runner | Isolated Ephemeral Container Runner: Instantly boots up an optimized frontend container, runs automated testing workflows, exports coverage telemetry, and tears itself down. |

**Implementation Reference — Ephemeral Test Runner:**
Beneath the abstraction, the containerized test runner intercepts execution states by injecting tailored commands directly into the environment layer using volatile runtime containers:

```makefile
api-test-coverage-container:
	@echo "🚀 Launching headless, isolated API testing execution container..."
	$(CTR_ENGINE) compose run --rm --entrypoint "npm run coverage-api" api
	@echo "📊 Verification complete. System telemetry report exported to ./coverage/apps/api"
```

## 5. Zero-Maintenance Auto-Discovery Help System

Manual task list updates in root documentation text files are prone to human oversight. To resolve this completely, we introduce an auto-scrapping macro inside `build/help.mk`. The command dynamically loops through all active internal `.mk` sub-components included by the framework, compiles the documentation targets, and renders an organized CLI menu directly to the engineering operator.

### Automated Discovery Engine

```makefile
help: ## Display this interactive tool guidance helper screen
	@echo "========================================================================="
	@echo " ONEGOODAREA AUTOMATED MAKE DISCOVERY CONSOLE "
	@echo "========================================================================="
	@echo "Available Engineering Automation Run Targets:"
	@grep -hE '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf " \033[36m%-32s\033[0m %s\n", $$1, $$2}'
```
