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

### 6.1 `compose/web-only.yml`

A single-service compose file for running the web container standalone.
The API URL is injected via env file; no API or DB service defined.

```yaml
# compose/web-only.yml -- Run the web container standalone.
# The API can be running anywhere; set INTERNAL_API_URL accordingly.
#
# Usage:
#   cp env/local/web.env.example env/local/web.env   # fill in INTERNAL_API_URL
#   docker compose -f compose/web-only.yml --env-file env/local/web.env up -d

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

> **Note on networking:**
> When `INTERNAL_API_URL=http://oga-api:8080` (API as local container),
> add `networks: [oga-network]` to the web service and declare `oga-network: external: true`.
> When the API is on LAN or cloud, no network config is needed.

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
# These wrap compose/web-only.yml for fast local web-container workflows.
#
#   make web-build               build the web image (local tag)
#   make web-up API_URL=<url>    start web container pointing at API_URL
#   make web-down                stop and remove the web container
#   make web-logs                follow web container logs
#   make web-open                open the web app in a browser (Linux/macOS)

WEB_IMAGE   ?= onegoodarea/web:local
WEB_NAME    ?= oga-web
WEB_PORT    ?= 3000
WEB_ENVFILE ?= env/local/web.env
COMPOSE_WEB ?= compose/web-only.yml

.PHONY: web-build web-up web-down web-logs web-open

web-build:
	$(CONTAINER_ENGINE) build -t $(WEB_IMAGE) -f container/web/Containerfile .

web-up:
	@test -f $(WEB_ENVFILE) || { echo "ERROR: $(WEB_ENVFILE) not found. Copy $(WEB_ENVFILE).example and fill it in."; exit 2; }
	@if [ -n "$(API_URL)" ]; then \
	  INTERNAL_API_URL=$(API_URL) $(CONTAINER_ENGINE) compose -f $(COMPOSE_WEB) up -d; \
	else \
	  $(CONTAINER_ENGINE) compose -f $(COMPOSE_WEB) up -d; \
	fi
	@echo "web → http://localhost:$(WEB_PORT)"

web-down:
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_WEB) down

web-logs:
	$(CONTAINER_ENGINE) compose -f $(COMPOSE_WEB) logs -f

web-open:
	xdg-open http://localhost:$(WEB_PORT) 2>/dev/null || open http://localhost:$(WEB_PORT) 2>/dev/null || true
```

---

### 6.4 Networking update for `container-run SERVICE=web`

When `INTERNAL_API_URL` uses an API container name (e.g. `oga-api`), the web
container must join `oga-network`. Add an optional `NETWORK` override to
`container-run`:

```makefile
# in container-run:
container-run: container-guard
	@test -f $(ENV_FILE) || { echo "ERROR: $(ENV_FILE) not found."; exit 2; }
	$(CONTAINER_ENGINE) run -d --rm --name $(C_NAME) \
	  -p $(PORT_HOST):$(PORT_CONT) \
	  --env-file $(ENV_FILE) \
	  $(if $(NETWORK),--network $(NETWORK),) \
	  $(IMAGE)
```

Usage: `make container-run ENV=local SERVICE=web NETWORK=oga-network`

---

### 6.5 Plan doc update: remove DATABASE_URL references from post-010 env examples

Clean up `env/{local,dev,prod}/web.env.example` — remove `DATABASE_URL` lines and
the "interim — see Plan 010" comments once Plan 010 is merged.

---

## 7. Branch Strategy

```
feat/AR-208-web-standalone-container
├── Commit 1: compose/web-only.yml (web-only compose file)
├── Commit 2: Makefile web-* targets + NETWORK opt-in for container-run
├── Commit 3: env/{local,dev,prod}/web.env.example — remove DATABASE_URL, add scenario docs
└── Commit 4: Plan/docs update + CONTAINERS.md scenario matrix
```

---

## 8. Verification Checklist

### Pre-flight
- [ ] Plan 010 (AR-203) merged and on `main`
- [ ] Web builds without `DATABASE_URL` (confirm `npm run build -w @onegoodarea/web` passes)
- [ ] Branch `feat/AR-208-web-standalone-container` created from `main`

### Scenario A — API as local container
- [ ] `make db-net db-run db-seed` (postgres up)
- [ ] `make api-build && make api-run` (API container on `oga-network`)
- [ ] `make web-build`
- [ ] `make web-up API_URL=http://oga-api:8080`  ← API_URL with container name
- [ ] Web container joins `oga-network` (verify `docker network inspect oga-network`)
- [ ] `curl http://localhost:3000` returns HTTP 200

### Scenario B — API on same host (bare process)
- [ ] `make dev` (API running on :8080)
- [ ] `make web-up API_URL=http://host.containers.internal:8080`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Scenario C — API on LAN
- [ ] API running on another machine at e.g. `192.168.1.50:8080`
- [ ] `make web-up API_URL=http://192.168.1.50:8080`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Scenario D — API on Oracle Cloud / VPS
- [ ] `make web-up API_URL=https://api.onegoodarea.com`
- [ ] `curl http://localhost:3000` returns HTTP 200

### Clean up
- [ ] `make web-down` stops and removes the web container cleanly
- [ ] `make container-stop ENV=local SERVICE=web` still works unchanged

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

- [ ] Web container starts and serves traffic with zero `DATABASE_URL` set
- [ ] `INTERNAL_API_URL` is the single knob for all four scenarios
- [ ] `make web-up API_URL=<url>` is the one-liner workflow
- [ ] `compose/web-only.yml` is portable (Docker + Podman)
- [ ] All existing `make container-*` targets unaffected
- [ ] env examples updated and clear

---

## 11. CLAUDE.md Compliance

✓ **Rule 7:** Never modify main directly → branch `feat/AR-208-web-standalone-container`  
✓ **Rule 8:** Small commits → 4 focused commits  
✓ **Rule 9:** Intent-based commit messages  
✓ **Rule 13:** Simple solutions → thin compose + make wrapper, no new abstractions  
✓ **Rule 14:** Reuse patterns → extends existing `container-*` family  
✓ **Rule 15:** No premature abstraction → 4 make targets, one compose file  

---

**Status:** Planning complete, blocked on AR-203 (Plan 010)  
**JIRA:** [AR-208](https://podnex.atlassian.net/browse/AR-208)  
**Next Action:** Implement after Plan 010 (AR-203) merges to main  
