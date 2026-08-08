# Combined Local Test Environment Implementation Plan

### Architecture-First, SOLID-Aligned, Incremental, Fully Isolated Delivery

This plan merges the strongest parts of both the Gemini and Copilot proposals while enforcing:

* Strict isolation of changes
* SOLID principles
* High testability
* Reversible incremental delivery
* Minimal coupling to existing code
* Zero modification of existing runtime logic whenever possible
* One branch per step
* One identifiable commit per sub-step
* Container terminology preferred over Docker-specific naming
* Strong operational/debugging support
* Future extensibility without premature refactoring

---

# 0. Core Engineering Rules

## Mandatory Delivery Rules

### Branching Rules

* Every implementation phase gets its own branch
* No unrelated work allowed in the same branch
* Branches must be mergeable independently
* Branches must remain deployable independently
* Main branch is never used directly

### Commit Rules

Every meaningful sub-step is:

* One isolated commit
* One responsibility
* One rollback unit

Commits must be:

* atomic
* descriptive
* traceable
* independently reviewable

Example:

```text
feat(local-env): add postgres service container
feat(local-env): add mailhog service
feat(local-env): add compose healthchecks
```

NOT:

```text
misc fixes
updates
env work
```

---

# 1. Architectural Principles

## 1.1 SOLID Enforcement

### Single Responsibility Principle

Each added module must have exactly one concern:

* AI mock provider
* Email proxy
* Environment loader
* Database bootstrapper
* API mocking layer

No mixed responsibilities.

---

### Open/Closed Principle

The environment must support:

* adding AI providers
* adding API mocks
* swapping database backends
* switching logging providers

without modifying existing implementations.

This will be achieved using:

* adapters
* provider abstractions
* configuration-driven selection

---

### Liskov Substitution Principle

Mock services must behave like real providers:

* same payload shape
* same HTTP codes
* same headers
* same authentication expectations

A mock must be substitutable for the real implementation.

---

### Interface Segregation Principle

No giant “local env manager” modules.

Separate:

* mail provider abstraction
* AI provider abstraction
* API mock abstraction
* DB initialization abstraction

---

### Dependency Inversion Principle

Application code should depend on abstractions/configuration:

* provider contracts
* adapter interfaces
* environment-driven resolution

NOT concrete implementations.

Where current architecture prevents this:

* wrappers/proxies are preferred
* existing business logic remains untouched

---

# 2. Absolute Constraint Policy

## Existing Code Modification Policy

## Allowed

* Add new files
* Add new folders
* Add new scripts
* Add compose/container configuration
* Add isolated modules
* Add test utilities
* Add optional environment loaders

## Forbidden

* Removing existing code
* Refactoring existing runtime logic
* Altering production behavior
* Rewriting existing APIs
* Editing existing business flows

---

# 3. Constraint Violations Requiring Explicit Approval

These are the ONLY known areas likely requiring existing file modifications.

## 3.1 `next.config.ts`

Potential need:

* CSP relaxation for local mock services

Possible additions:

```text
connect-src localhost
script-src localhost
```

Risk:

* low
* isolated
* environment-specific

---

## 3.2 `package.json`

Potential need:

* additional scripts

Example:

```json
"local:test:start"
"local:test:stop"
"local:test:reset"
```

Risk:

* minimal

---

# 4. High-Level Architecture

## Container Topology

| Component                | Purpose                           |
| ------------------------ | --------------------------------- |
| App Container            | Next.js application               |
| PostgreSQL Container     | Local Neon-compatible persistence |
| Neon Compatibility Proxy | Mimics Neon transport behavior    |
| API Mock Gateway         | External API mocks/stubs          |
| Mail Capture Service     | Email inspection                  |
| Email Provider Adapter   | Resend-compatible forwarding      |
| AI Mock Provider         | Zero-cost AI testing              |
| Observability Layer      | Logs/debugging                    |
| Seed/Bootstrap Container | Optional test data initialization |

---

# 5. Containerization Strategy

## 5.1 Platform Support

Supported:

* Docker Desktop (Windows)
* Podman (Linux)

Implementation must:

* avoid engine-specific features
* use standard Compose specification
* avoid privileged mode
* avoid daemon assumptions

---

## 5.2 Naming Standards

Avoid:

```text
docker-*
```

Prefer:

```text
container-*
runtime-*
compose-*
```

Examples:

```text
container-compose.yml
Containerfile.dev
scripts/runtime-up.sh
```

---

# 6. Local Database Strategy

## 6.1 Primary Goal

Preserve production behavior fidelity.

Production uses:

* Neon
* serverless transport semantics
* DML operations embedded in runtime code

This must remain untouched.

---

## 6.2 Local Strategy

### Preferred

Use local PostgreSQL with Neon compatibility layer.

Why:

* avoids production dependency
* enables offline work
* reproducible
* fast resets
* isolated testing

---

## 6.3 Neon Compatibility Layer

Introduce:

```text
services/neon-compat-proxy/
```

Responsibilities:

* mimic Neon transport behavior
* translate HTTP/websocket semantics
* proxy to PostgreSQL

Must remain isolated from app code.

---

## 6.4 Schema Strategy

No refactor now.

Instead:

* generate bootstrap schema snapshots
* optional initialization scripts
* isolated seed layer

Example:

```text
tests/db/bootstrap/
```

---

## 6.5 Future Migration Strategy (Deferred)

Later:

* move toward proper migrations
* remove runtime DML
* unify schema lifecycle

NOT now.

---

# 7. Environment Variable Management

## 7.1 Goals

* no hardcoded secrets
* no plaintext credentials committed
* environment isolation
* layered overrides

---

## 7.2 Files

### Added

```text
.env.local.test
.env.local.test.example
.env.local.test.secrets
```

### Git Policy

```text
*.secrets
.env.local.test
```

must be ignored.

---

## 7.3 Environment Loader

Add isolated module:

```text
src/lib/runtime/env/
```

Responsibilities:

* layered loading
* validation
* defaults
* debug visibility

No runtime modification unless absolutely required.

---

# 8. External Service Strategy

## 8.1 API Mock Gateway

Preferred tool:

* Prism

Responsibilities:

* mock postcodes.io
* mock external REST APIs
* contract-based responses

---

## 8.2 Mocking Philosophy

Every external dependency must support:

* real mode
* test mode
* mock mode

Switching mechanism:

```text
environment variables only
```

---

# 9. Email Strategy

## 9.1 Preferred

Use provider test environments if fully inspectable.

---

## 9.2 Fallback

If inspection/retrieval is limited:

* MailHog

---

## 9.3 Architecture

```text
Application
   ↓
Resend-compatible adapter
   ↓
MailHog
```

---

# 10. AI Provider Strategy

## 10.1 Goals

Support:

* Claude
* OpenAI
* local models
* mock providers

without application rewrites.

---

## 10.2 Immediate Approach

Add:

```text
src/lib/ai/providers/
```

Include:

* mock provider
* adapter layer
* provider selector

---

## 10.3 Mock AI Requirements

Must support:

* deterministic responses
* configurable latency
* forced failures
* token simulation
* rate-limit simulation

---

# 11. Observability & Troubleshooting

## 11.1 Mandatory Debug Tooling

Every runtime container must include:

* curl
* ping
* dig/nslookup
* net-tools
* vim/nano
* proc utilities

---

## 11.2 Logging Requirements

Default:

```text
DEBUG
TRACE
VERBOSE
```

Must support:

```text
INFO
WARN
ERROR
```

through env vars only.

---

## 11.3 Structured Logs

Preferred:

```json
{
  "service": "",
  "level": "",
  "correlationId": ""
}
```

---

# 12. Authentication Testing

## 12.1 Auto Login Utility

Add isolated testing endpoint:

```text
/api/testing/auth/*
```

Restrictions:

* test/dev only
* environment gated
* disabled in production

---

## 12.2 Future Direction

Eventually replace with:

* E2E framework auth helpers

NOT now.

---

# 13. Test Data Strategy

## 13.1 Investigation Phase First

Before implementation determine:

* minimum required datasets
* deterministic fixtures
* user/account dependencies
* relational consistency

---

## 13.2 Seed Architecture

Must support:

* resettable state
* reproducible state
* isolated scenarios

Suggested structure:

```text
tests/seeds/
```

---

# 14. One-Command Developer Experience

## 14.1 Goal

Single command:

```bash
compose up
```

OR:

```bash
./scripts/runtime-up.sh
```

Must:

* validate prerequisites
* load env
* start all services
* wait for healthchecks
* print service URLs

---

# 15. Testing Strategy

## 15.1 Required Testing Levels

| Type                         | Required |
| ---------------------------- | -------- |
| Infrastructure tests         | Yes      |
| Container health tests       | Yes      |
| API contract tests           | Yes      |
| Mock fidelity tests          | Yes      |
| Environment validation tests | Yes      |
| Seed integrity tests         | Yes      |

---

## 15.2 Mock Verification

Mocks must be tested against:

* payload compatibility
* error compatibility
* auth compatibility

---

# 16. Branch & Commit Execution Plan

# Branch 1

```text
feat/local-runtime-foundation
```

## Commits

```text
feat(runtime): add compose foundation
feat(runtime): add shared container network
feat(runtime): add debug tooling base image
feat(runtime): add healthcheck strategy
feat(runtime): add centralized logging defaults
```

---

# Branch 2

```text
feat/local-runtime-database
```

## Commits

```text
feat(database): add postgres runtime container
feat(database): add neon compatibility proxy
feat(database): add bootstrap schema loader
feat(database): add database health validation
feat(database): add database reset scripts
```

---

# Branch 3

```text
feat/local-runtime-environment
```

## Commits

```text
feat(env): add layered environment loader
feat(env): add environment validation module
feat(env): add secure secret templates
feat(env): add runtime configuration diagnostics
```

---

# Branch 4

```text
feat/local-runtime-mocks
```

## Commits

```text
feat(mocks): add prism mock gateway
feat(mocks): add postcode api contracts
feat(mocks): add resend adapter
feat(mocks): add mail capture service
feat(mocks): add ai mock provider
feat(mocks): add provider switching configuration
```

---

# Branch 5

```text
feat/local-runtime-auth-testing
```

## Commits

```text
feat(auth-testing): add local auth utility routes
feat(auth-testing): add environment guards
feat(auth-testing): add auth testing documentation
```

---

# Branch 6

```text
feat/local-runtime-seeding
```

## Commits

```text
feat(seeding): add deterministic seed framework
feat(seeding): add baseline test datasets
feat(seeding): add runtime reset workflows
```

---

# Branch 7

```text
feat/local-runtime-observability
```

## Commits

```text
feat(observability): add structured log formatting
feat(observability): add centralized debug configuration
feat(observability): add runtime diagnostics dashboard
```

---

# Branch 8

```text
feat/local-runtime-documentation
```

## Commits

```text
docs(local-runtime): add onboarding guide
docs(local-runtime): add troubleshooting guide
docs(local-runtime): add architecture diagrams
docs(local-runtime): add provider switching guide
```

---

# 17. SMART Success Metrics

| Metric                               | Target       |
| ------------------------------------ | ------------ |
| Fresh setup time                     | < 5 minutes  |
| Runtime startup reliability          | > 95%        |
| Offline test capability              | > 90%        |
| External dependency reduction        | > 80%        |
| Mock fidelity pass rate              | > 95%        |
| Developer onboarding success         | < 30 min     |
| Environment reset time               | < 2 minutes  |
| AI provider switching                | < 30 seconds |
| Local reproducibility rate           | > 95%        |
| Infrastructure-related test failures | < 5%         |

---

# 18. Major Risks & Mitigations

| Risk                          | Mitigation                         |
| ----------------------------- | ---------------------------------- |
| Neon incompatibility          | Compatibility proxy                |
| Podman networking variance    | Explicit service naming            |
| CSP blocking mocks            | Environment-specific CSP overrides |
| Hidden production assumptions | Contract testing                   |
| Runtime DML fragility         | Schema snapshots                   |
| AI provider drift             | Adapter abstraction                |
| Secret leakage                | layered env + ignored secrets      |
| Mock divergence               | automated compatibility tests      |

---

# 19. Future Deferred Improvements (NOT NOW)

## Deferred Refactors

* proper migration system
* provider dependency injection
* centralized SDK abstraction
* runtime DML removal
* production-grade observability stack
* full E2E orchestration
* service virtualization framework

These are intentionally deferred to preserve current system stability.

---

# 20. Final Architectural Position

This implementation intentionally favors:

* additive architecture
* isolation
* reversibility
* observability
* operational safety
* testability
* future extensibility

over:

* aggressive refactoring
* premature cleanup
* invasive architectural rewrites

The result is a local runtime environment that:

* behaves close to production
* remains safe to introduce incrementally
* supports future modernization
* minimizes risk to existing business logic
