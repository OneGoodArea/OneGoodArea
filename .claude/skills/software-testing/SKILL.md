---
name: software-testing
description: Use when running tests — covers container-based test execution, engine detection (Podman/Docker), and standard commands
---

# Testing Rules

To avoid environment drift and ensure local testing mirrors production execution, test runs must run inside isolated containers whenever possible.

## 1. Engine Detection
Check for available local container runtimes before running tests:
1. Prefer **Podman** if `podman` CLI is present.
1. Fall back to **Docker** if `docker` CLI is present.
1. Fall back to host execution (`npm test`) **ONLY** if neither container engine is available or explicitly requested by the user.
1. You dont test against the real / live deployed system, UNLESS EXPLICITELY told to and even then you MUST confirm

## 2. Test Execution Protocol
- **Container Environment:** Use the project's default container definition (`Dockerfile`, `docker-compose.yml`, or `podman-compose.yml`).
- **Volume Mounts:** Mount the repository root into the container so test runs reflect local source edits in real time.
- **Node/Dependency Isolation:** Run `npm run lint`, `npm run typecheck`, and `npm test` inside the containerized environment.

## 3. Lint and TypeCheck and Tests
- For lint, typoecheck and tests, always use containers when they exist.

## 4. Standard Commands
Run tests using the available engine via make.

If there is no make availbale to perform the test, then you have to ask whether it should be created or no
