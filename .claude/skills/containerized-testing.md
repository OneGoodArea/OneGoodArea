# Containerized Local Testing Rules

To avoid environment drift and ensure local testing mirrors production execution, test runs must run inside isolated containers whenever possible.

## 1. Engine Detection
Check for available local container runtimes before running tests:
1. Prefer **Podman** if `podman` CLI is present.
2. Fall back to **Docker** if `docker` CLI is present.
3. Fall back to host execution (`npm test`) **ONLY** if neither container engine is available or explicitly requested by the user.

## 2. Test Execution Protocol
- **Container Environment:** Use the project's default container definition (`Dockerfile`, `docker-compose.yml`, or `podman-compose.yml`).
- **Volume Mounts:** Mount the repository root into the container so test runs reflect local source edits in real time.
- **Node/Dependency Isolation:** Run `npm run lint`, `npm run typecheck`, and `npm test` inside the containerized environment.

## 3. Standard Commands
Run tests using the available engine:

```bash
# Podman (Preferred)
podman run --rm -v "$(pwd):/app" -w /app node:lts npm test

# Docker (Fallback)
docker run --rm -v "$(pwd):/app" -w /app node:lts npm test

# Compose-based setups (if compose file exists)
podman-compose run --rm test  # or docker-compose run --rm test