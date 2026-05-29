# Plan 008: Production containerization (cross-platform parity, no compose in prod)

## Objective
Implement a production-only container strategy where:
- Linux users run with **Podman** (and optionally Docker), Windows/macOS users run with **Docker**.
- `make` and container commands behave the same way on all platforms.
- There is **one image per deployable unit**: `web`, `api`, and future `postgres`.
- Environment variables are split cleanly by environment (`local`, `dev`, `prod`) and by service.
- **No production compose usage** (compose remains local/dev only).

## Operating constraints from `CLAUDE.md`
- Never change `main`/`master` directly.
- Use dedicated branch(es) first, with small isolated commits per logical change.
- Prefer minimally invasive changes and existing repo patterns before introducing new abstractions.
- Be explicit about assumptions and uncertainty; avoid claiming completion without evidence.

## Current baseline (repo)
- Existing production container build file (`Dockerfile`) builds/runs **API only** at repo root.
- Existing Makefile has Docker-only API local targets.
- Existing compose file is development/local-test oriented (`container-compose.yml`, `Containerfile.dev`).
- Env docs and samples are not yet split into a multi-service production-oriented layout.

## Implementation plan

### 1) Runtime abstraction layer (same UX across OS)
1. Introduce a shared make include (`build/container.mk`) that defines:
   - `CONTAINER_ENGINE` (`podman` on Linux by default, `docker` elsewhere, overridable)
   - `CONTAINER_COMPOSE` (`podman compose` or `docker compose`) for local/dev only
2. Make all container targets call only these variables (never hardcode `docker`).
3. Keep target names identical across environments (e.g., `container-build-*`, `container-run-*`, `container-stop-*`).

### 1.1 Git management plan (required)
1. Start from a dedicated branch (e.g., `feat/prod-container-parity`), never `main`/`master`.
2. Split implementation into reviewable commits:
   - commit A: runtime abstraction + make portability
   - commit B: api/web image separation
   - commit C: env split structure + examples
   - commit D: git hygiene (`**/node_modules` ignored + untracked, `next-env.d.ts` tracked in Next.js workspace files)
   - commit E: docs updates + checklist
3. Use intent-based commit messages (no generic “fix/update”).
4. No destructive git actions without explicit approval.
5. Dependency and generated-file policy:
   - Ignore and untrack `node_modules` at every level (`/node_modules`, `**/node_modules`).
   - Do not preserve `node_modules` in git (including repo root), even if npm workspaces hoist installs to root.
   - Do not ignore `next-env.d.ts`; track it for each active Next.js app (currently `apps/web/next-env.d.ts`).

### 2) One image per deployable unit
1. **Container layout (locked):** `container/<service>/Containerfile` for each deployable unit. Centralised + symmetric + OCI-native naming (Docker + Podman both honour `Containerfile`):
   - `container/api/Containerfile` — built from `apps/api` + `packages/contracts` source (`git mv` of the existing root `/Dockerfile`)
   - `container/web/Containerfile` — built from `apps/web` source (NEW)
   - `container/postgres/Containerfile` — based on `postgres:16-alpine` (NEW; thin layer for config/env conventions only)
2. Each image is independently buildable + runnable; no inter-image runtime dependency baked at image build time.
3. Provider-native runtime wiring (Render dockerfilePath, future Cloud Run/Fly image refs) reads these paths.

#### Web image — explicitly for parity, NOT to replace Vercel
The `container/web/Containerfile` exists for **test compatibility + cross-platform parity** (local prod-mirror, CI image build validation, future backup-hosting option). **`apps/web` continues to deploy on Vercel as primary**; this plan does not migrate off Vercel. Image uses Next.js `output: 'standalone'` so the container is lean (~40MB layer over node base) regardless of where it eventually runs.

#### Postgres image — explicitly for parity, NOT to replace Neon
The `container/postgres/Containerfile` exists for **test compatibility + cross-platform parity** (ephemeral local postgres that matches prod conventions for integration tests + offline dev). **Neon remains the production database**; this plan does not introduce a self-hosted prod postgres. The image is config-only (env conventions, no schema bootstrap baked in) — schema / DAL / migration / seed responsibilities live with plans 009 + 010.

### 3) Production run model (no compose)
1. Use direct engine commands for production lifecycle (build/run/stop/logs) per service.
2. Keep each unit independently operable:
   - `api`
   - `web`
   - (future-ready) `postgres`
3. Keep deployment integration provider-agnostic (OCI image build/push + provider-native runtime wiring).

### 4) Environment variable split (per env + per service)
1. Add env templates under `env/`:
   - `env/local/api.env.example`, `env/local/web.env.example`, `env/local/postgres.env.example`
   - `env/dev/api.env.example`, `env/dev/web.env.example`, `env/dev/postgres.env.example`
   - `env/prod/api.env.example`, `env/prod/web.env.example`, `env/prod/postgres.env.example`
2. Define a strict ownership matrix in docs:
   - shared vars (if any)
   - service-only vars
   - secret vs non-secret
3. Update make/runtime scripts to load env files by `ENV=<local|dev|prod>` and service.

### 5) Make interface (portable and deterministic)
1. Add production-focused targets, e.g.:
   - `make container-build ENV=prod SERVICE=api|web`
   - `make container-run ENV=prod SERVICE=...`
   - `make container-stop ENV=prod SERVICE=...`
   - `make container-logs ENV=prod SERVICE=...`
2. Ensure identical command surface on Linux/macOS/Windows (via GNU Make + runtime abstraction).

### 6) Documentation and operational guardrails
1. Update `docs/DEPLOY.md` with the new production container workflow.
2. Add a dedicated `docs/CONTAINERS.md` with:
   - OS runtime rules (Linux=Podman default, macOS/Windows=Docker default)
   - exact make commands
   - env file structure and secret handling guidance
3. Document image naming/tagging convention per deployable unit.
4. Add a required verification checklist file: `docs/PROD-CONTAINER-CHECKLIST.md`.

### 7) Verification matrix
1. Linux: verify all targets with Podman and with Docker.
2. macOS/Windows path: verify Docker commands and make targets remain identical.
3. Validate independent startup of web/api images and per-service runtime checks (no compose).

### 8) Assurance ("insurance") plan
1. Add a deterministic post-change checklist file: `docs/PROD-CONTAINER-CHECKLIST.md`.
2. Checklist must include:
   - preflight checks (runtime detected, branch safety, required env files present)
   - image build checks per service
   - runtime smoke checks (`/health`, service boot logs, port bind, required env presence)
   - rollback steps (stop container, retag/restore previous image, restart)
   - cross-platform parity checks (same `make` entrypoints on Linux/macOS/Windows)
3. Add a short “known failure modes” section and exact remediation commands.

## Decisions locked (2026-05-29)
1. **API image path:** `container/api/Containerfile`. `git mv` from the existing root `/Dockerfile`. Best practice for multi-service monorepos (centralised + symmetric + OCI-native naming that Docker + Podman both honour).
2. **Web image runtime:** Next.js `output: 'standalone'` mode. Lean image (~40MB layer over node base) + fast cold start. Image exists for parity / test compatibility — `apps/web` continues to deploy on Vercel as primary.
3. **Postgres image:** Thin wrapper around `postgres:16-alpine` at `container/postgres/Containerfile`. Config conventions only (env shape, healthcheck contract). For parity / test compatibility — Neon remains the production database. **Schema, DAL, migrations, seeds are all explicitly out of scope here** — they belong to plans 009 + 010.
4. **Branching:** ONE branch (`feat/prod-container-parity`), multiple small reviewable commits per the per-commit-group split in §1.1. Never stacked branches.

## Deliverable boundaries (this plan)

**In scope** — production container workflow, cross-platform parity, three-image layout (`container/{api,web,postgres}/Containerfile`), env split, Makefile portability, docs, and a concrete verification checklist.

**Out of scope — explicitly NOT this plan:**
- Production compose
- Local/dev runtime refactor
- Replacing Vercel as the production runtime for `apps/web`
- Replacing Neon as the production database
- Database schema / migrations / seeds / data load (plan 009)
- Data Access Layer / repository pattern / in-process DAL boundaries (plan 009)
- Web → API HTTP migration of `apps/web/src/lib/*` callers (plan 010)
- Any change to `apps/api`'s runtime behaviour beyond moving its container build file

The postgres + web images here are for **parity + test compatibility** — they sit alongside the production Vercel/Neon surfaces, they do not displace them. Plans 009 + 010 own the displacement work.
