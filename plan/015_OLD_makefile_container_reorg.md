# Plan 015: Makefile + Containers Reorganization

## 1. Jira Integration

- **Jira Issue:** [AR-215](https://podnex.atlassian.net/browse/AR-215)
- **Plan File:** `plan/015_makefile_container_reorg.md`
- **Branch (implementation):** `feat/AR-215-make-containers-reorg`

## 2. Problem

The current workflow mixes native app, per-service container lifecycle, compose scenarios, and legacy shortcuts in one large surface with overlapping commands.

We need:
- A clean non-container target set to build/start the app.
- Container targets to build/run one service or all services.
- Compose-based up/down/logs flows.
- Explicit support for both Docker and Podman.
- Clear applicability boundaries per environment.
- Simple help-first UX.

## 3. Current State Summary (codebase)

- Runtime abstraction already exists in `build/container.mk` (`podman` preferred on Linux, fallback `docker`).
- Root `Makefile` currently contains:
  - native app targets (`setup`, `dev`, `migrate`, checks)
  - generic container targets (`container-build/run/stop/logs`)
  - legacy shortcuts (`api-*`, `db-*`, `web-*`)
- Compose exists in multiple forms:
  - `container-compose.yml` (legacy full local stack with extras like `mailhog`)
  - `compose/web-local.yml` and `compose/web-external.yml`
- Env templates already split by environment and service in `env/{local,dev,prod}`.

## 4. Confirmed Decisions

- **Canonical UX:** one root `Makefile` entrypoint with modular includes.
- **Profiles:**
  - `minimal` = `web + api + postgres + neon-proxy`
  - `full` = `minimal + mailhog` (optional extras)
- **Legacy target policy:** remove old target names in the same change (no compatibility aliases).
- **neon-proxy policy:** always included in `minimal`.

## 5. Proposed Make Target Taxonomy

### Native (no containers)
- `app-install`
- `app-setup-env`
- `app-build`
- `app-start`
- `app-test`
- `app-lint`
- `app-typecheck`

### Image builds
- `image-build SERVICE=<web|api|postgres|neon-proxy>`
- `image-build-all`

### Direct container lifecycle
- `ctr-up SERVICE=<...>`
- `ctr-down SERVICE=<...>`
- `ctr-logs SERVICE=<...>`
- `ctr-up-all`
- `ctr-down-all`

### Compose lifecycle
- `compose-up PROFILE=<minimal|full>`
- `compose-down PROFILE=<minimal|full>`
- `compose-logs PROFILE=<minimal|full>`

### Cleanup & discovery
- `clean-soft`
- `clean-hard` (destructive gate/confirmation required)
- `help`
- `help-containers`
- `container-info`

## 6. Internal File Structure (maintainability)

- Keep root `Makefile` as single entrypoint.
- Modularize internals under `build/`:
  - `build/container.mk`
  - `build/targets-app.mk`
  - `build/targets-images.mk`
  - `build/targets-containers.mk`
  - `build/targets-compose.mk`
  - `build/help.mk`

## 7. Execution Plan

1. Inventory and map existing targets to the new taxonomy.
2. Split target groups into `build/targets-*.mk` includes.
3. Implement native app target family.
4. Implement image one-by-one and all-at-once targets.
5. Implement direct container one-by-one and all-at-once targets.
6. Implement compose profile lifecycle (`minimal`, `full`).
7. Redesign `help` output for concise grouped discoverability.
8. Update docs and migration mapping (old target -> new target).

## 8. Risks & Mitigations

- **Breaking scripts due to immediate removal of legacy targets**  
  Mitigation: update docs in the same PR with an explicit migration table.

- **Profile drift between compose and direct container targets**  
  Mitigation: centralize service/profile matrices in shared make variables/includes.

- **Over-complex command surface**  
  Mitigation: enforce consistent verb model (`build/up/down/logs/clean/help`).

## 9. CLAUDE.md Compliance Notes

- Plan before implementation: satisfied.
- Clarifications gathered before implementation: satisfied.
- Reuse existing abstractions (`build/container.mk`) and keep changes minimal.
- Implementation phase will follow:
  - dedicated branch (with Jira key)
  - small logical commits
  - no direct edits on `main`/`master`.
