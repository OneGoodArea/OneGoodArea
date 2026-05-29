# ADR 0035 — Production container parity (cross-platform, multi-image, env split)

- **Status:** Accepted
- **Date:** 2026-05-29
- **Context refs:** Plan 008; story AR-201. Sits above
  [[adr-0027-levers-foundation]] and below the (future) plan 009 + plan 010
  ADRs that own DAL/migrations and the apps/web -> apps/api HTTP cutover.

## Context

The pre-existing container setup had three problems for a production-grade
multi-service deployment story:

1. **API-only image at the repo root.** `/Dockerfile` built `apps/api` and
   nothing else. There was no parallel image for `apps/web` (so the same
   workload could not be brought up locally / on a backup host / in a CI
   prod-mirror) and nothing for postgres outside the `container-compose.yml`
   dev stack.

2. **Docker-only Make targets.** The `api-*` targets hardcoded `docker`,
   forcing Linux users onto Docker Desktop (license-encumbered for
   commercial use) instead of the daemonless rootless Podman runtime that
   is the modern Linux default.

3. **Env vars not split by environment or service.** A single
   `apps/web/.env.local` carried everything for both apps and local
   postgres. There was no template tree, no per-service ownership matrix,
   and no clear story for what changes between local/dev/prod.

This ADR captures the production-container shape we want before plan 009
(DAL + migrations) and plan 010 (apps/web -> apps/api HTTP cutover) land
on top.

## Decision

### 1. Runtime abstraction layer

A single Make include (`build/container.mk`) defines:

- `CONTAINER_ENGINE` -- defaults to `podman` on Linux, `docker` elsewhere;
  overridable on the CLI or via env.
- `CONTAINER_COMPOSE` -- derived from the engine (`podman compose` or
  `docker compose`); only used by local/dev targets.

Every container target in the root `Makefile` routes through these
variables. Nothing hardcodes `docker` or `podman`.

### 2. One image per deployable unit

```
container/api/Containerfile        -- git mv from /Dockerfile (API)
container/web/Containerfile        -- NEW (Next.js standalone)
container/postgres/Containerfile   -- NEW (thin postgres:16-alpine wrapper)
```

Centralised + symmetric + OCI-native naming (`Containerfile` is honoured
by both Docker and Podman).

**Parity-only intent for `web` and `postgres`:**

- `apps/web` continues to deploy on **Vercel** as primary. The web image
  exists so the same workload can run locally / on a backup OCI host / in
  prod-mirror CI. Uses Next.js `output: "standalone"` for a lean (~40MB
  layer-over-node) image. Vercel ignores the standalone flag and builds
  its own way, so the production deploy is unaffected.
- **Neon** remains the production database. The postgres image is a thin
  config wrapper (env shape + `pg_isready` healthcheck contract) for
  offline integration tests + parity. Schema / DAL / migrations / seeds
  are explicitly OUT of this ADR; they belong to plan 009.

### 3. Env split (per environment x per service)

```
env/local/{api,web,postgres}.env.example
env/dev/{api,web,postgres}.env.example
env/prod/{api,web,postgres}.env.example
```

Nine templates. Each lists only the vars its service reads. Real
`env/<env>/<service>.env` files are gitignored; only `*.env.example` are
tracked. `env/prod/*.env.example` carry empty values + comments noting
"set in host platform" -- the contract lives in repo, real values never
do.

### 4. Portable Make interface

```
make container-build ENV=<local|dev|prod> SERVICE=<api|web|postgres>
make container-run   ENV=...               SERVICE=...
make container-stop  ENV=...               SERVICE=...
make container-logs  ENV=...               SERVICE=...
```

A `container-guard` prerequisite validates inputs against the allow-lists
before any engine call. Per-service ports + build contexts live in a
matrix in the Makefile.

The legacy `api-build / api-run / api-stop / api-clean` shortcuts stay
(ergonomic + routed through `$(CONTAINER_ENGINE)`).

### 5. No compose in production

`container-compose.yml` + `Containerfile.dev` remain for local/dev only.
The production lifecycle is direct engine invocations per service.

### 6. Git hygiene

- `**/node_modules` ignored at every level.
- `apps/web/next-env.d.ts` tracked per Next.js convention.

## Consequences

Positive:

- Same Make commands work on Linux (Podman), macOS, and Windows. No
  Docker Desktop licence pressure on Linux.
- Each service has a clear, independently buildable image + env contract.
- Prod-mirror smoke testing of `apps/web` or `apps/api` locally is now a
  single Make invocation.
- `render.yaml` points at the new path; deploy pipeline continues to
  build the same image with zero behavioural change.

Negative / trade-offs:

- One more level of directory indentation for image definitions
  (`container/api/Containerfile` vs `/Dockerfile`). Acceptable -- the
  symmetry with `web` + `postgres` pays for it.
- Two additional images now in the build matrix (`web`, `postgres`)
  even though they are not the primary production runtime. Their
  parity-only role is documented in the Containerfile headers + this ADR
  to prevent drift into "let's just deploy from this image" decisions
  that would invalidate the Vercel / Neon production posture.

## Out of scope (explicit)

- Replacing Vercel as the production runtime for `apps/web`.
- Replacing Neon as the production database.
- Database schema / DAL / migrations / seeds (plan 009).
- `apps/web` -> `apps/api` HTTP migration of `apps/web/src/lib/*` callers
  (plan 010).
- Production compose (only dev/local compose is supported).
