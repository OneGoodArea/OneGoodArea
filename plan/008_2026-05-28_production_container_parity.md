# Production containerization plan (cross-platform parity, no compose in prod)

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
- Existing production Dockerfile builds/runs **API only** at repo root (`/Dockerfile`).
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
   - commit D: docs updates + checklist
3. Use intent-based commit messages (no generic “fix/update”).
4. No destructive git actions without explicit approval.

### 2) One image per deployable unit
1. Keep API production image as dedicated artifact (`Dockerfile.api` or keep root Dockerfile but rename/alias clearly).
2. Add dedicated production web image (`Dockerfile.web`) for `apps/web`.
3. Add deployment descriptors with separate service images for `api` and `web`.
4. Define postgres as a separate service contract now (image reference + env contract), without forcing immediate production deployment changes.

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

## Decisions to lock before implementation
1. API image path strategy: keep root `/Dockerfile` as API vs move to `/docker/api/Dockerfile`.
2. Web production container runtime: Next standalone output vs `next start` node runtime.
3. Postgres now: define image/env contract only vs fully runnable target in this phase.
4. Branching scope: one branch for full change vs stacked branches per commit group.

## Deliverable boundaries (this plan)
- **In scope:** production container workflow, cross-platform parity, multi-image layout, env split, docs, and a concrete checklist file for verification.
- **Out of scope for now:** production compose, and local/dev runtime refactor.
