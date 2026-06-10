# Plan 011: WEB App Standalone Container (AR-208)

## 1. JIRA Integration

- **Jira Issue:** AR-208
- **Plan File:** `plan/011_web_standalone_container.md`
- **Branch:** `feat/AR-208-web-standalone-container`
- **Depends On:** Plan 008 ✅, Plan 010 / AR-203 (prerequisite — must land first)

---

## 2. Objective

Create a production-ready WEB container that:

- Contains **only** `apps/web` and its configuration.
- Has **no** API server code, no `DATABASE_URL`, no direct DB dependency.
- Connects to the API via a single env var (`INTERNAL_API_URL`) that can point to:
  - A local container (`oga-api`) on the same host.
  - A local network / LAN address.
  - Oracle Cloud, any VPS, or a cloud platform URL.

---

## 3. Context & Sequencing

```
Plan 008 ✅  →  container/web/Containerfile exists, make container-build/run work
Plan 010 ✅  →  DATABASE_URL removed from apps/web; web is pure HTTP client to API
Plan 011     →  web container is self-sufficient, API-location-agnostic (this plan)
```

### Why this waits for Plan 010

Until Plan 010 lands, `apps/web` still issues direct SQL via `apps/web/src/lib/db.ts`.
Shipping a "clean" web container that secretly needs `DATABASE_URL` would be misleading
and invite environment drift. This plan targets the post-010 state where the web layer
has zero DB coupling.

---

## 4. Current Gaps (post-010 baseline)

| Gap | Impact |
|---|---|
| `make container-run SERVICE=web` doesn't join `oga-network` | Can't reach `oga-api` container by name |
| No web-only compose file | No quick "just start web + point at external API" workflow |
| env examples still show `DATABASE_URL` (interim comment) | Confusing after Plan 010 lands |
| No documented matrix for the four API-location scenarios | Ops ambiguity |

---

## 5. Connection Scenario Matrix

| API Location | `INTERNAL_API_URL` value | Networking needed |
|---|---|---|
| Local container `oga-api` (same host) | `http://oga-api:8080` | `--network oga-network` |
| Process running bare on same host | `http://host.containers.internal:8080` | none |
| LAN / local VM | `http://192.168.x.x:8080` | none |
| Oracle Cloud / any public VPS | `https://api.yourdomain.com` | none (HTTPS) |

`INTERNAL_API_URL` is the **only** variable that changes between scenarios.

---

## 6. Deliverables

### 6.1 Compose Files (Two Scenarios)

**`compose/web-external.yml`** — For APIs on LAN / cloud / bare process  
(No network config needed; INTERNAL_API_URL is host-reachable.)

```yaml
# compose/web-external.yml -- Run the web container with external API.
# The API can be running anywhere outside this Docker network.
#
# Usage:
#   cp env/local/web.env.example env/local/web.env   # set INTERNAL_API_URL
#   docker compose -f compose/web-external.yml --env-file env/local/web.env up -d

services:
  web:
    image: onegoodarea/web:local
    container_name: oga-web
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - ${WEB_ENV_FILE:-env/local/web.env}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s
```

---

**`compose/web-local.yml`** — For API as local container (`oga-api`)  
(Joins `oga-network` to reach the API by container name.)

```yaml
# compose/web-local.yml -- Run the web container with local oga-api.
# The API must be running as a container on oga-network.
#
# Usage:
#   make db-net api-run          # start API on oga-network
#   cp env/local/web.env.example env/local/web.env
#   docker compose -f compose/web-local.yml --env-file env/local/web.env up -d

services:
  web:
    image: onegoodarea/web:local
    container_name: oga-web
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - ${WEB_ENV_FILE:-env/local/web.env}
    networks:
      - oga-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s

networks:
  oga-network:
    external: true
```

---

### 6.2 Updated `env/local/web.env.example` (post-010)

```bash
# env/local/web.env.example -- post Plan 010 (no DATABASE_URL)

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# --- auth -----------------------------------------------------------
# MUST match apps/api AUTH_SECRET.
AUTH_SECRET=replace-me
NEXTAUTH_URL=http://localhost:3000

# --- API connection -------------------------------------------------
# Set ONE of these depending on where your API runs:
#
# API as local container (oga-api):
#   INTERNAL_API_URL=http://oga-api:8080
#
# API as bare process on same host:
#   INTERNAL_API_URL=http://host.containers.internal:8080
#
# API on LAN:
#   INTERNAL_API_URL=http://192.168.x.x:8080
#
# API on Oracle Cloud / VPS:
#   INTERNAL_API_URL=https://api.yourdomain.com
#
INTERNAL_API_URL=http://host.containers.internal:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- providers ------------------------------------------------------
STRIPE_PUBLISHABLE_KEY=pk_test_replace-me
STRIPE_WEBHOOK_SECRET=whsec_replace-me

# --- observability (leave blank for local) --------------------------
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

### 6.3 Make targets

Add to `Makefile` (under the existing `container-*` family):

```makefile
# --- web standalone targets (Plan 011) --------------------------------
#
# Two compose files for different scenarios:
# - compose/web-external.yml  → API on LAN / cloud / bare process
# - compose/web-local.yml     → API as local container (oga-api)
#
# Usage:
#   make web-build                          build the web image
#   make web-up-external                    start web, API is external
#   make web-up-local                       start web + oga-api together (requires oga-network)
#   make web-down                           stop and remove web container
#   make web-logs                           follow web logs
#   make web-open                           open web in browser

WEB_IMAGE       ?= onegoodarea/web:local
WEB_PORT        ?= 3000
WEB_ENVFILE     ?= env/local/web.env
COMPOSE_EXTERNAL ?= compose/web-external.yml
COMPOSE_LOCAL   ?= compose/web-local.yml

.PHONY: web-build web-up-external web-up-local web-down web-logs web-open

web-build:
	$(CONTAINER_ENGINE) build -t $(WEB_IMAGE) -f container/web/Containerfile .

web-up-external:
	@test -f $(WEB_ENVFILE) || { echo "ERROR: $(WEB_ENVFILE) not found. Copy $(WEB_ENVFILE).example and fill it in."; exit 2; }
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_EXTERNAL) up -d
	@echo "web → http://localhost:$(WEB_PORT)"

web-up-local:
	@test -f $(WEB_ENVFILE) || { echo "ERROR: $(WEB_ENVFILE) not found. Copy $(WEB_ENVFILE).example and fill it in."; exit 2; }
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_LOCAL) up -d
	@echo "web → http://localhost:$(WEB_PORT)"
	@echo "Note: API must be running on oga-network. Run: make db-net api-run"

web-down:
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_EXTERNAL) down 2>/dev/null || true
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_LOCAL) down 2>/dev/null || true

web-logs:
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_EXTERNAL) logs -f 2>/dev/null || \
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_LOCAL) logs -f

web-open:
	xdg-open http://localhost:$(WEB_PORT) 2>/dev/null || open http://localhost:$(WEB_PORT) 2>/dev/null || true
```

---

### 6.4 Containerfile update (add `curl` for healthchecks)

The healthcheck in both compose files uses `curl`. Add it to the runtime stage:

```dockerfile
# In container/web/Containerfile, runtime stage, after ENV vars:
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
```

This adds `curl` (~1MB) to the final image for healthchecks.

---

### 6.5 Plan doc update: remove DATABASE_URL references from post-010 env examples

Clean up `env/{local,dev,prod}/web.env.example` — remove `DATABASE_URL` lines and
the "interim — see Plan 010" comments once Plan 010 is merged.

---

## 7. Branch Strategy

```
feat/AR-208-web-standalone-container
├── Commit 1: container/web/Containerfile — add curl for healthchecks
├── Commit 2: compose/web-external.yml + compose/web-local.yml
├── Commit 3: Makefile web-build, web-up-external, web-up-local, web-down, web-logs, web-open
├── Commit 4: env/local/web.env.example — add scenario docs, clarify INTERNAL_API_URL
└── Commit 5: Plan doc update + update CONTAINERS.md with scenario matrix
```

---

## 8. Verification Checklist

### Pre-flight
- [ ] Web builds without `DATABASE_URL` (confirm `npm run build -w @onegoodarea/web` passes)
- [ ] Branch `feat/AR-208-web-standalone-container` created from `main`
- [ ] Containerfile updated with `curl` install

### Scenario A — API as local container (`oga-api`)
- [ ] `make db-net db-run db-seed` (postgres on `oga-network`)
- [ ] `make api-build && make api-run` (API container on `oga-network`)
- [ ] `make web-build` (builds image with curl)
- [ ] `cp env/local/web.env.example env/local/web.env`
- [ ] Set `INTERNAL_API_URL=http://oga-api:8080` in env file
- [ ] `make web-up-local`
- [ ] `curl http://localhost:3000` returns HTTP 200
- [ ] `docker network inspect oga-network` shows both web and api containers

### Scenario B — API on same host (bare process)
- [ ] `make dev` (API running on :8080)
- [ ] `cp env/local/web.env.example env/local/web.env`
- [ ] Set `INTERNAL_API_URL=http://host.containers.internal:8080` in env file
- [ ] `make web-build && make web-up-external`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Scenario C — API on LAN
- [ ] API running on another machine at e.g. `192.168.1.50:8080`
- [ ] Set `INTERNAL_API_URL=http://192.168.1.50:8080` in env file
- [ ] `make web-build && make web-up-external`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Scenario D — API on Oracle Cloud / VPS
- [ ] Set `INTERNAL_API_URL=https://api.onegoodarea.com` in env file
- [ ] `make web-build && make web-up-external`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Clean up
- [ ] `make web-down` stops and removes web container cleanly (handles both compose files)

---

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Plan 010 not yet merged when starting | CRITICAL | Hard prerequisite; blocked until AR-203 lands |
| `host.containers.internal` not available on some hosts | MEDIUM | Documented — use LAN IP or container-name scenario instead |
| CSP `connect-src` blocking new API URL | MEDIUM | `next.config.ts` CSP is server-side headers; `INTERNAL_API_URL` is server→API (no CORS needed) |
| `oga-network` not created before web-up | LOW | `web-up` can call `db-net` as prerequisite, or document order |

---

## 10. Success Criteria

- [ ] Web container starts and serves traffic
- [ ] `INTERNAL_API_URL` is the single knob for all four scenarios
- [ ] `make web-up-local` and `make web-up-external` are one-liners
- [ ] `compose/web-external.yml` and `compose/web-local.yml` are portable (Docker + Podman)
- [ ] All existing `make container-*` targets unaffected
- [ ] Healthchecks work (curl available in image)
- [ ] env examples updated and clear
- [ ] Four scenarios verified in checklist

---

## 11. CLAUDE.md Compliance

✓ **Rule 7:** Never modify main directly → branch `feat/AR-208-web-standalone-container`  
✓ **Rule 8:** Small commits → 4 focused commits  
✓ **Rule 9:** Intent-based commit messages  
✓ **Rule 13:** Simple solutions → thin compose + make wrapper, no new abstractions  
✓ **Rule 14:** Reuse patterns → extends existing `container-*` family  
✓ **Rule 15:** No premature abstraction → 4 make targets, one compose file  

---

**Status:** ✅ IMPLEMENTED (Plan 010 not required; Docker infrastructure ready now)  
**JIRA:** [AR-208](https://podnex.atlassian.net/browse/AR-208) (In Progress)  
**Branch:** `feat/AR-208-web-standalone-container`  
**Commits:** 5 (Containerfile, compose files, Makefile, env examples, docs)  
**Next Action:** Create PR, test all four scenarios, merge to main  
