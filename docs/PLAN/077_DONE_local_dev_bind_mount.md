# 077 — Local dev stack with bind-mounted source (AR-774)

## Purpose

Add a dev mode that runs the app in containers but reads code from **host bind
mounts** (hot-reload via `tsx watch` / `next dev`) instead of a copy baked into
the image — so we can test in dev against the local stack without rebuilding
images on every edit.

## Jira

- Story: **AR-774** — Local dev stack with bind-mounted source
  (`make stack-dev-*`). Implemented directly on the story (no sub-tasks).

## Hard constraint

- No change to existing prod-mirror (`stack-up-*`, `build-*-image`) or test
  (`make *-test-container`, `compose.test.yml`) behavior. Purely additive surface.

## Approach

1. `container/api/Containerfile`: add a `deps` stage (mirrors
   `container/web/Containerfile` deps stage): manifests + `npm install` only,
   **no source COPY, no bundle**. Rebase the existing `build` stage to
   `FROM deps`. Runtime stage untouched.
2. New `compose/compose.dev-bind.yml` (rides on `compose.yml` +
   `compose.override.yml`):
   - `api`: `build.target: deps`, image `onegoodarea/api-dev:local`,
     `command: sh -c "npm run migrate -w @onegoodarea/api && npm run dev -w @onegoodarea/api"`,
     volumes `../apps/api:/app/apps/api` + `../packages/contracts:/app/packages/contracts`.
   - `web`: `build.target: deps`, image `onegoodarea/web-dev:local`,
     `NODE_ENV: development`, `command: npm run dev -w @onegoodarea/web -- -H 0.0.0.0`,
     volumes `../apps/web:/app/apps/web` + `../packages/contracts:/app/packages/contracts`.
3. `build/compose.mk`: add `COMPOSE_DEV_BIND` + `CTR_COMPOSE_DEV`
   (base + override + dev-bind).
4. `build/stack.mk`: add `stack-dev-up` (full profile, detached,
   `BUILD_FLAG`-aware), `stack-dev-down`, `stack-dev-logs`.
5. Update `docs/OPERATIONS/LOCAL-CONTAINERS.md`.

## Steps / commits (one commit per unit, authored by the driving human)

1. `refactor(api): add deps stage and rebase api build on it (AR-774)` —
   `container/api/Containerfile`.
2. `feat(compose): add compose.dev-bind.yml bind-mount dev stack (AR-774)` —
   `compose/compose.dev-bind.yml`.
3. `feat(make): add stack-dev-* targets for bind-mount dev stack (AR-774)` —
   `build/compose.mk` + `build/stack.mk`.
4. `docs(containers): document dev bind-mount stack (AR-774)` —
   `docs/OPERATIONS/LOCAL-CONTAINERS.md`.

## Gate / acceptance criteria

- `docker compose -f compose.yml -f compose.override.yml -f compose.dev-bind.yml config -q` is valid.
- `make stack-dev-up BUILD_FLAG=--build` boots postgres, neon-proxy, api (8080),
  web (3000) + mocks from **host source**.
- Editing `apps/api/src/**` and `apps/web/**` hot-reloads via `tsx watch` /
  `next dev` with **no image rebuild**.
- Existing `make api-test-container`, `make build-api-image` still pass after
  the `FROM deps` refactor.
- `make stack-dev-down` tears down cleanly.

## Caveats (to document)

- A host-local `apps/api/node_modules` (from a host `npm install`) would shadow
  the image's hoisted deps — usually absent since npm workspaces hoist to root.
- `apps/web/.next` is written into the host dir (gitignored).
- Adding a new dependency requires rebuilding the dev image (node_modules come
  from the image).

## Git / Jira

- Worktree: `.worktrees/AR-774-local-dev-bind-mount`, branch
  `feat/AR-774-local-dev-bind-mount` (off `main`). Never commit on `main`.
- Commits: one per logical step above.
- Jira: AR-774 `In Progress` (assigned to AR Sprint 8) → when PR opened, link PR
  in issue → on merge, transition to Done and rename this plan to
  `077_local_dev_bind_mount_DONE.md`.
