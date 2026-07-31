---
name: software-testing
description: Use when running tests — covers container-based test execution, engine detection (Podman/Docker), and standard commands
---

# Testing Rules

To avoid environment drift and ensure local testing mirrors production execution, integration/unit tests that require a database must run inside isolated containers.

## 1. Engine Detection
Check for available local container runtimes before running tests:
1. Prefer **Podman** if `podman` CLI is present.
1. Fall back to **Docker** if `docker` CLI is present.
1. Fall back to host execution (`npm test`) **ONLY** if neither container engine is available or explicitly requested by the user.
1. Do not test against the real / live deployed system, UNLESS explicitly told to and even then you MUST confirm.

## 2. Lint and TypeCheck (MUST run in containers)
Lint and typecheck run inside containers, exactly like tests — never bare on the host:
```
make app-lint
make app-typecheck
```
If a container engine is unavailable, see the fallback rules in section 1 before running on the host.

## 3. Test Execution (requires container)
- **Container Environment:** Use the project's compose test stack (`compose/compose.yml` + `compose/compose.test.yml`).
- **Volume Mounts:** The compose.test.yml mounts test sources and artifacts into the container automatically.
- **Standard Commands:**
  ```
  make api-test-container         # Run API tests
  make web-test-container         # Run web tests
  make test-all-container         # Run both in parallel
  ```

## 4. No Make Available
If `make` is not available, ask whether it should be created.
