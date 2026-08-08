# Plan: Makefile & Container Reorganization
**JIRA:** [AR-216](https://podnex.atlassian.net/browse/AR-216)

## Context

The root `Makefile` has grown organically across Plans 008–011. It is now ~300 lines with overlapping target sets (legacy `api-run` AND portable `container-run ENV= SERVICE=`), inconsistent verb naming (`db-run` vs `web-up-external`), no neon-compat-proxy targets, no "all-at-once" targets, and a manual help block that is already drifting from reality. This plan reorganizes everything for discoverability, maintainability, and consistency — without breaking existing documented workflows.

---

## Recommendation: Makefile + `build/*.mk` Includes

### Why not one big Makefile

The current file is already 300 lines with 3 services. Adding the 4th service (proxy), all-at-once targets, and a proper help system would push it past 500. The include pattern is already in use (`build/container.mk`). Extending it is zero new convention.

Each `.mk` file has one topic. Adding a service = add one file + one include line. Discoverability works because GNU Make's `$(MAKEFILE_LIST)` variable expands to all included files, so `make help` automatically aggregates across all `.mk` files — no manual sync.

---

## File Structure

```
Makefile                   ← orchestrator: includes, non-container targets, all-* targets, help
build/
  container.mk             ← EXISTING: engine detection + NET_NAME/shared constants
  db.mk                    ← NEW: db-* targets (extracted from Makefile)
  api.mk                   ← NEW: api-* targets (extracted + api-logs added)
  web.mk                   ← NEW: web-* targets (extracted + renamed)
  proxy.mk                 ← NEW: proxy-* targets (new, wraps neon-compat-proxy)
  compose.mk               ← NEW: stack-* targets + container-info
compose/
  web-external.yml         ← KEEP as-is
  web-local.yml            ← KEEP as-is
  stack.yml                ← NEW: full-stack compose (db + proxy + api + web, pre-built images)
container-compose.yml      ← LEGACY: do NOT delete — runtime-*.sh scripts hardcode this filename
Containerfile.dev          ← LEGACY: do NOT delete — referenced by container-compose.yml
```

---

## Naming Convention: `<service>-<action>`

Keep existing convention. Aligns with current `db-net`, `db-run`, `api-build` etc. and avoids updating all existing docs.

Unify the **verb**: rename `*-run` → `*-start` and `web-up-*` → `web-start*` for consistency. Provide backward-compat aliases during transition.

---

## Complete Target Set

### Non-container (bare process) — in root `Makefile`

```
setup              install npm deps + scaffold .env.local files
setup-install      npm ci
setup-env          copy .env.example → .env.local if missing
dev                run API in watch mode on :8080
dev-signals        run API with OGA_SIGNALS_API=true
migrate            run pending DB schema migrations
bootstrap-test-key create a disposable test API key
test               run full test suite
typecheck          TypeScript type-check (no emit)
lint               ESLint across all packages
coverage           coverage for all packages
coverage-api       coverage for apps/api only
coverage-web       coverage for apps/web only
coverage-contracts coverage for packages/contracts only
refresh-deprivation   re-ingest deprivation signal data
refresh-property      re-ingest property signal data
refresh-crime         re-ingest crime data (CRIME_ARCHIVE_DIR= required)
```

### DB container — `build/db.mk`

```
db-net     create oga-network bridge network (idempotent)
db-vol     create oga-postgres-data named volume
db-start   start oga-postgres on :55432  [implies db-net + db-vol]
db-stop    stop and remove oga-postgres container
db-clean   db-stop + destroy oga-postgres-data volume (full reset)
db-seed    load framework + baseline seed SQL
db-run     ALIAS → db-start (backward compat)
```

### API container — `build/api.mk`

```
api-build   build onegoodarea/api:local
api-start   run oga-api on :8080, joined to oga-network
api-stop    stop oga-api
api-clean   api-stop + remove image
api-logs    follow oga-api logs
api-run     ALIAS → api-start (backward compat)
```

### Web container — `build/web.mk`

```
web-build         build onegoodarea/web:local
web-start         run oga-web with external API (LAN/host/cloud)
web-start-local   run oga-web with API as local oga-api container
web-stop          stop oga-web
web-clean         web-stop + remove image
web-logs          follow oga-web logs
web-open          open http://localhost:3000
web-up-external   ALIAS → web-start (backward compat)
web-up-local      ALIAS → web-start-local (backward compat)
web-down          ALIAS → web-stop (backward compat)
```

### Proxy container — `build/proxy.mk` (NEW)

```
proxy-build   build onegoodarea/neon-compat-proxy:local
proxy-start   run oga-neon-proxy on :55433, joined to oga-network
proxy-stop    stop oga-neon-proxy
proxy-clean   proxy-stop + remove image
proxy-logs    follow oga-neon-proxy logs
```

Source: `services/neon-compat-proxy/Dockerfile` (already exists).

### All-at-once — root `Makefile`

```
build-all   build db + api + web + proxy images
start-all   start all four containers individually
stop-all    stop all four containers
clean-all   clean all four containers + remove images
```

### Full-stack compose — `build/compose.mk`

```
stack-build   build all images via compose/stack.yml
stack-up      bring up db + proxy + api + web
stack-down    tear down full stack
stack-logs    follow all service logs
stack-reset   stack-down + db-clean + stack-up + db-seed
container-info show detected engine + host OS (moved from container.mk)
```

### Portable per-service matrix — KEEP, hidden from default help

The `container-build ENV=local SERVICE=api` matrix is the documented prod build workflow. Keep all five targets (`container-build`, `container-run`, `container-stop`, `container-logs`, `container-guard`). Remove from `make help` default; add to `make help-advanced`.

---

## Help System: Auto-generated from `## description` comments

Replace manual help block with GNU Make's standard auto-gen pattern:

```makefile
help: ## show this help
	@grep -hE '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
	  | sort \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  %-28s %s\n", $$1, $$2}'
```

Every target gets a `## description` inline comment. `$(MAKEFILE_LIST)` covers all included `.mk` files automatically — help stays in sync structurally.

---

## `compose/stack.yml` Design

New file. Replaces the intent of `container-compose.yml` using current production-grade Containerfiles. Key differences from legacy:

- Uses `container/api/Containerfile`, `container/web/Containerfile`, `container/postgres/Containerfile`, `services/neon-compat-proxy/Dockerfile`
- **Pre-built images only** (no `build:` keys) — images built via `make build-all` first; avoids dual build paths
- Env files from `env/local/*.env` per existing convention
- All services join `oga-network`
- No mailhog (test-only; can be `compose/mailhog.yml` separately if needed)

`container-compose.yml` stays untouched until `apps/web/scripts/runtime-*.sh` and `tests/unit/runtime-env.test.ts` are migrated to use `compose/stack.yml`.

---

## What Does NOT Change

- `build/container.mk` engine detection logic
- `compose/web-external.yml` and `compose/web-local.yml`
- The three existing Containerfiles under `container/`
- `container-compose.yml` and `Containerfile.dev` (LEGACY, kept for test compatibility)
- Any env files under `env/`

---

## Verification

1. `make help` — outputs all targets with descriptions, no manual sync needed
2. `make help-advanced` — shows portable matrix targets
3. `make container-info` — shows detected engine
4. `make db-start && make migrate && make db-seed` — local postgres workflow
5. `make api-build && make api-start` — api container workflow
6. `make web-build && make web-start` — web container (external API mode)
7. `make build-all && make stack-up` — full-stack compose workflow
8. Old aliases still work: `make db-run`, `make api-run`, `make web-up-external`, `make web-down`
