# 077 — Containerize the signal-refresh pipeline for local dev parity

**Purpose:** Mirror the `.github/workflows/signal-refresh.yml` cron pipeline as a local, containerized refresh so local dev runs the exact same steps (migrate → refresh:\* → derive:signals → normalize:signals → refresh:peers → derive:signals → normalize:signals → timeseries:append) against the compose stack (postgres + neon-compat-proxy). Cron untouched.

**Linked Jira:**
- Story: AR-766 (OneGoodArea)

## Approach — hot-reload via bind mount

The `refresh` image is a thin TOOLING image: `FROM node:22-slim` + `apt-get install curl unzip` + workspace manifests + `npm install` (devDeps, so tsx is available). **NO source COPY.** At runtime the compose service bind-mounts the host repo root at `/app` so source edits hot-reload without rebuilding; `/app/node_modules` is an ANONYMOUS volume that keeps the image's Linux deps (devcontainer pattern); a named `refresh-cache` volume persists the ~1.6GB police.uk `latest.zip` + extraction across runs.

Local env: `DATABASE_URL=postgres://oga_user:oga_test_password_local@postgres:5432/oga_local`, `NEON_FETCH_ENDPOINT=http://neon-proxy:55433/sql`.

## Steps (one Jira task + one commit each)

1. **Containerfile `refresh` stage** — append a `refresh` stage to `container/api/Containerfile` (curl + unzip, workspace manifests, full `npm install`, no source COPY). `.dockerignore` already excludes `.github`; the orchestrator reaches `retry.sh` via the bind mount.
2. **Orchestrator script** — add `apps/api/scripts/signal-refresh.sh` mirroring cron step order; reuses `.github/scripts/retry.sh`; downloads/unzips police.uk `latest.zip` into `$REFRESH_CACHE_DIR` (default `/cache`) reusing a cached extraction when present.
3. **Compose service** — add `signal-refresh` to `compose/compose.yml` (profile `refresh`; `target: refresh`; volumes `..:/app`, `/app/node_modules` anon, `refresh-cache:/cache`; depends_on postgres + neon-proxy healthy; local env).
4. **Make targets** — `signal-refresh` (`compose run --rm`) and `signal-refresh-build` in `build/stack.mk`.
5. **Docs** — add a "Run locally" section to `docs/OPERATIONS/SIGNAL-REFRESH.md`; add the service to `docs/OPERATIONS/LOCAL-CONTAINERS.md` (services + stack-targets tables).

## Git workflow

- Worktree: `.worktrees/AR-766-refresh-container`, branch `feat/AR-766-refresh-container` (already created; `main` untouched).
- Commits (one per step above), imperative subject, per git-standards:
  1. `chore(containers): add tooling-only refresh stage to api Containerfile`
  2. `chore(refresh): add containerized signal-refresh orchestrator`
  3. `chore(compose): add signal-refresh service with hot-reload bind mount`
  4. `chore(make): add signal-refresh and signal-refresh-build targets`
  5. `docs(operations): document containerized signal-refresh`
- Push branch, open PR to `main`, link PR in AR-766, transition Jira to Closed on merge.

## Verification (containers)

- `make signal-refresh-build` — image builds.
- `make stack-up-min` (postgres + neon-proxy healthy), then `make signal-refresh` — full pipeline runs end-to-end against the LOCAL DB via the proxy.
- Parity vs cron: step order matches `signal-refresh.yml`; `source_snapshots` rows written for each source.
- Hot-reload: edit a source file in `apps/api/src`, re-run `make signal-refresh` WITHOUT rebuild, confirm the change is picked up.
- `make app-lint` + `make app-typecheck`.

## Open decisions (ask user)

- Break AR-766 into Jira subtasks (one per step) vs keep single story.
- Crime cache freshness: reuse cached archive indefinitely (rm volume to force) vs re-download on a schedule/staleness check.
- SELinux `:z` label on the `..:/app` bind mount (repo has a `fix/postgres-selinux-bind-mount` precedent) — verify at runtime.

## Rollback

- `git revert <sha>` per commit; the change is additive (new stage/service/targets/docs), no production path touched.
