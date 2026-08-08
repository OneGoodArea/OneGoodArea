# Running OneGoodArea in Containers

## Prerequisites

- Docker or Podman (auto-detected by Make)
- Ports available: 55432 (postgres), 55433 (neon-proxy), 8080 (api), 3000 (web), 8888 (pgadmin)

## Quick Start

```bash
# Start the full minimal stack (postgres, neon-proxy, api, web, pgadmin)
make stack-up-min

# Optionally rebuild images first
make stack-up-min BUILD_FLAG=--build

# Follow logs
make stack-logs

# Stop everything
make stack-down-min

# Full cleanup (removes volumes/data)
make stack-clean
```

## Dev Bind-Mount Stack (hot reload, AR-774)

For day-to-day development, run the same stack but read code from **host bind
mounts** instead of a copy baked into the image — `tsx watch` / `next dev`
hot-reload on every edit with **no image rebuild**.

```bash
# First boot (builds the dev deps images once)
make stack-dev-up BUILD_FLAG=--build

# Subsequent boots reuse the images (no rebuild)
make stack-dev-up

# Follow logs
make stack-dev-logs

# Stop
make stack-dev-down
```

- Api runs `npm run migrate && npm run dev` on **host** `apps/api` + `packages/contracts`.
- Web runs `next dev` on **host** `apps/web` + `packages/contracts`.
- Same infra as the prod-mirror stack: postgres, neon-proxy, mailhog, stripe-mock.

**Caveats**

- A host-local `apps/api/node_modules` (from a host `npm install`) would shadow
  the image's hoisted deps — usually absent since npm workspaces hoist to root.
- `apps/web/.next` is written into the host dir (gitignored).
- Adding a new dependency requires rebuilding the dev image (`node_modules`
  comes from the image): `make stack-dev-up BUILD_FLAG=--build`.

## Stack Targets

| Target | Description |
|--------|-------------|
| `make stack-up-min` | Boot minimal stack (postgres, neon-proxy, api, web, pgadmin) |
| `make stack-up-full` | Boot full stack (minimal + mailhog, stripe-mock) |
| `make stack-up-db` | Boot db-only stack (postgres + full profile services) |
| `make stack-dev-up` | Boot dev stack from host source (bind-mounted, hot reload) |
| `make stack-dev-down` | Stop dev stack |
| `make stack-dev-logs` | Follow logs for dev stack |
| `make stack-down-min` | Stop minimal stack |
| `make stack-down-full` | Stop full stack |
| `make stack-down` | Stop all compose services |
| `make stack-logs` | Follow logs for all services |
| `make stack-clean` | Stop + remove named volumes (destructive) |
| `make stack-engine-info` | Show detected container engine |

Set `BUILD_FLAG=--build` to force rebuild: `make stack-up-min BUILD_FLAG=--build`.

## Service Targets

| Target | Description |
|--------|-------------|
| `make api-up` | Boot API service with compose dependencies |
| `make api-logs` | Follow API logs |
| `make web-up` | Boot web service with compose dependencies |
| `make web-logs` | Follow web logs |
| `make db-seed` | Load framework + baseline seed SQL |
| `make signal-refresh-build` | Build the tooling-only signal-refresh image (refresh stage) |
| `make signal-refresh` | Run the containerized signal-refresh pipeline (boots postgres + neon-proxy first) |
| `make api-test-coverage-container` | Run API coverage in ephemeral container |
| `make web-test-coverage-container` | Run web coverage in ephemeral container |

## Host Targets

| Target | Description |
|--------|-------------|
| `make app-setup` | Install deps + scaffold local env files |
| `make app-build` | Build all workspace packages |
| `make app-dev` | Run API in host watch mode |
| `make app-test` | Run full test suite |
| `make app-typecheck` | Run strict TypeScript checks |
| `make app-lint` | Run ESLint across workspace |

## Services

### PostgreSQL

- **Image:** `onegoodarea/postgres:local` (extends `postgres:16-alpine`)
- **Host port:** `55432` → container `5432`
- **User:** `oga_user`
- **Password:** `oga_test_password_local`
- **Database:** `oga_local`
- **Data volume:** `oga-postgres-data` (persisted)

### Neon Compat Proxy

Lightweight proxy between API and PostgreSQL providing Neon-compatible wire protocol.

- **Image:** `onegoodarea/neon-compat-proxy:local`
- **Host port:** `55433`

### API

- **Image:** `onegoodarea/api:local`
- **Host port:** `8080`
- Depends on: postgres (healthy), neon-proxy (healthy)

**Image architecture (Plan 017):** Multi-stage build.
- **Deps stage:** Manifests + full `npm install` (devDeps included) — no source, no bundle. Rebased by the `build` stage and reused as the dev-bind image target (AR-774).
- **Build stage:** Full npm install (inherited from `deps`) + TypeScript source → esbuild bundles to `dist/server.cjs`. Also used as the `api-test` target in `compose.test.yml`.
- **Runtime stage:** Fresh `node:22-slim`, slim `npm install --omit=dev` (production deps only), `dist/server.cjs`, `curl` for healthchecks. No source code, no TypeScript, no dev tooling.

### Web

- **Image:** `onegoodarea/web:local`
- **Host port:** `3000`
- Depends on: api (started)

**Image architecture (Plan 011):** Multi-stage build (`deps` → `build` → `runtime`).
- **Runtime stage:** Next.js `output: "standalone"` with automatic dependency tracing — only statically reachable modules are included. `curl` installed for healthchecks. No source code, no dev tooling.

### pgAdmin

pgAdmin 4 for database management, available in the minimal profile.

- **Image:** `dpage/pgadmin4:latest`
- **Host port:** `8888` → container `80`
- **Login:** `admin@onegoodarea.com` / `admin`
- **Data volume:** `oga-pgadmin-data` (persists servers, queries, preferences)
- Depends on: postgres (healthy)

To connect to PostgreSQL from pgAdmin:
- **Host:** `postgres`
- **Port:** `5432`
- **User:** `oga_user`
- **Password:** `oga_test_password_local`

### Signal Refresh (profile: `refresh`)

Containerized mirror of the prod cron (`docs/OPERATIONS/SIGNAL-REFRESH.md`).
Builds the tooling-only `refresh` stage of `container/api/Containerfile` and
runs `apps/api/scripts/signal-refresh.sh` against the local stack.

- **Image:** `onegoodarea/api-refresh:local`
- **Runtime:** one-shot via `make signal-refresh` (or `compose run --rm`)
- **Volumes:**
  - `..:/app:z` — host repo root bind mount (hot-reload of scripts; `.github/scripts/retry.sh` resolved from host)
  - `/app/node_modules` — anonymous volume, shadows the mount with the image's Linux-installed deps
  - `refresh-cache:/cache` — named volume, persists the ~1.6GB police.uk archive
- **Depends on:** postgres (healthy), neon-proxy (healthy)

**Image architecture (AR-766):** `refresh` stage — `node:22-slim` + `curl` +
`unzip`, workspace manifests copied (no source), full `npm install`
(devDeps => `tsx`). The service bind-mounts the repo root at runtime.

### Mailhog (full profile only)

- **Image:** `mailhog/mailhog:v1.0.1`
- **Host ports:** `1025` (SMTP), `8025` (UI)

### Stripe Mock (full profile only)

- **Image:** `stripe/stripe-mock:latest`
- **Host port:** `12111`

## Networking

All services are on the `compose_default` network created by Docker Compose. Services communicate by container name (e.g., `postgres`, `neon-proxy`, `api`, `web`).

## Troubleshooting

### Port already allocated

```bash
# Check what's using the port
docker ps --format '{{.Names}} {{.Ports}}' | grep <PORT>

# Stop the offending container
docker stop <container-name>
```

### Containers not stopping

All services use `profiles` in compose.yml. The `down` commands include `--profile` flags so compose knows which services exist:

```bash
make stack-down-min    # uses --profile minimal
make stack-down-full   # uses --profile minimal --profile full
```

### Container engine not found

```bash
# Override engine
make stack-up-min CTR_ENGINE=docker
# or
make stack-up-min CTR_ENGINE=podman
```

---

**Last Updated:** August 2026 (AR-766)
