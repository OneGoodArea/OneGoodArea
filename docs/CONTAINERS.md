# Running OneGoodArea in Containers

This document covers running the OneGoodArea application components in containers.

## Web Container (Plan 011)

The web container is a **stateless HTTP client** to the API. It requires no `DATABASE_URL` and can connect to an API server anywhere: local container, LAN, or cloud.

### Connection Scenarios

| Scenario | API Location | INTERNAL_API_URL | Make Target | Setup |
|----------|--------------|------------------|-------------|-------|
| **Local Container** | `oga-api` on `oga-network` | `http://oga-api:8080` | `make web-up-local` | `make db-net api-run` |
| **Bare Process** | Same host, :8080 | `http://host.containers.internal:8080` | `make web-up-external` | `make dev` |
| **LAN / Local VM** | Another machine on network | `http://192.168.1.50:8080` | `make web-up-external` | Ensure reachable |
| **Oracle Cloud / VPS** | Public cloud domain | `https://api.yourdomain.com` | `make web-up-external` | Ensure reachable |

### Quick Start

**Scenario: API as local container**

```bash
# Terminal 1: Start database and API
make db-net db-run db-seed
make api-build
make api-run

# Terminal 2: Start web
cp env/local/web.env.example env/local/web.env
# Edit web.env: set INTERNAL_API_URL=http://oga-api:8080
make web-build
make web-up-local

# Browser: http://localhost:3000
```

**Scenario: API as bare process on same host**

```bash
# Terminal 1: Start database and API
make db-net db-run db-seed
make dev        # API on :8080

# Terminal 2: Start web
cp env/local/web.env.example env/local/web.env
# Edit web.env: set INTERNAL_API_URL=http://host.containers.internal:8080
make web-build
make web-up-external

# Browser: http://localhost:3000
```

### Web Make Targets

```bash
make web-build              # Build web image (onegoodarea/web:local)
make web-up-external        # Start web (API on LAN/cloud/bare)
make web-up-local           # Start web (API as local container)
make web-down               # Stop web container
make web-logs               # Follow web container logs
make web-open               # Open web app in browser (macOS/Linux)
```

### Environment File

Copy `env/local/web.env.example` to `env/local/web.env` and fill in:

- `INTERNAL_API_URL` — where the API server is (required; see scenarios above)
- `AUTH_SECRET` — must match API's `AUTH_SECRET`
- `NEXTAUTH_URL` — browser-facing URL (default: `http://localhost:3000`)
- `NEXT_PUBLIC_APP_URL` — same as NEXTAUTH_URL
- `STRIPE_*` — provider keys (optional for local testing)
- `SENTRY_*` — observability (optional; leave blank for local)

## API Container

The API server container includes the PostgreSQL client and full application server.

### Quick Start

```bash
# One-time setup
make db-net db-vol db-run db-seed
make migrate

# Run API in container
make api-build
make api-run        # Runs on :8080, connects to localhost:55432

# Run API in watch mode (development)
make dev            # Same API on :8080, with hot reload
```

### API Make Targets

```bash
make api-build      # Build API image (onegoodarea/api:local)
make api-run        # Start API container on oga-network
make api-stop       # Stop API container
make api-clean      # Stop + remove image
make dev            # Run API in development mode (bare process)
```

## Database Container (Plan 009)

PostgreSQL 16 runs in a container with a dedicated network and volume.

### Quick Start

```bash
# One-time setup
make db-net         # Create oga-network bridge
make db-vol         # Create oga-postgres-data volume
make db-run         # Start postgres container
make migrate        # Run schema migrations
make db-seed        # Load baseline seed data

# Stop and resume later
make db-stop        # Stop + remove container (volume persists)
make db-run         # Restart (data preserved)

# Full reset (lose data)
make db-clean       # Stop + remove volume
make db-run db-seed # Rebuild from scratch
```

### Database Make Targets

```bash
make db-net         # Create oga-network
make db-vol         # Create oga-postgres-data volume
make db-run         # Start postgres container (implies db-net + db-vol)
make db-stop        # Stop + remove container
make db-clean       # db-stop + remove volume
make db-seed        # Load seed SQL files
```

### Connection Details

- **Host:** `localhost`
- **Port:** `55432` (host-side) → `5432` (container-side)
- **User:** `oga`
- **Password:** `oga`
- **Database:** `oga`

From inside a container on `oga-network`, use hostname `oga-postgres` instead of `localhost`.

## Portable Per-Service Targets

All three services (API, web, postgres) can also be run via the portable matrix:

```bash
# Build
make container-build ENV=local SERVICE=api
make container-build ENV=local SERVICE=web
make container-build ENV=local SERVICE=postgres

# Run
make container-run ENV=local SERVICE=api
make container-run ENV=local SERVICE=web

# Stop
make container-stop ENV=local SERVICE=api
make container-stop ENV=local SERVICE=web

# Logs
make container-logs ENV=local SERVICE=api
make container-logs ENV=local SERVICE=web
```

These are less ergonomic than the specific shortcuts (e.g., `make api-run`) but ensure consistency across environments (local, dev, prod).

## Networking

All containers use the `oga-network` bridge for inter-container communication.

```bash
# View network details
docker network inspect oga-network

# See which containers are on it
docker network inspect oga-network | grep -A 20 "Containers"
```

The web container automatically joins `oga-network` when using `make web-up-local` (compose/web-local.yml).

## Troubleshooting

### Web can't reach API
- Verify API is running: `docker ps | grep oga-api`
- Check INTERNAL_API_URL in `env/local/web.env`
- For local container scenario: ensure both are on `oga-network`
  ```bash
  docker network inspect oga-network
  ```

### Database won't start
- Check if volume exists: `docker volume ls | grep oga-postgres-data`
- Check for port conflicts: `lsof -i :55432` (macOS) or `ss -tlnp :55432` (Linux)
- Full reset: `make db-clean && make db-run && make db-seed`

### Healthcheck failures
- Ensure curl is available in the image (added in Plan 011)
- Check container logs: `make web-logs` or `docker logs oga-web`
- Test manually: `curl http://localhost:3000`

---

**Last Updated:** Plan 011 (AR-208)  
**References:** Plans 008, 009, 011; CLAUDE.md Rule 13 (simple, maintainable solutions)
