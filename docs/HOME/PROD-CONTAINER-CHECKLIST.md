# Production container checklist

Run this top-to-bottom before merging any change that touches the
container surface (`container/**`, `build/container.mk`, `Makefile`
container targets, `render.yaml`, `env/**`). Fail-fast at the first NO.

> See [`CONTAINERS.md`](../ARCHITECTURE/CONTAINERS.md) for the workflow itself + the
> decision record in [`adr/0035-prod-container-parity.md`](../adr/0035-prod-container-parity.md).

## Preflight

- [ ] On a non-`main` branch (CLAUDE.md rule 7).
- [ ] `make container-info` prints the expected engine for the host OS
      (Linux=Podman, macOS/Windows=Docker), or an explicit
      `CONTAINER_ENGINE=...` override is in use.
- [ ] The relevant `env/<env>/<service>.env` file exists (copy from the
      `.example` and fill in). `make container-run` will fail-fast
      otherwise.
- [ ] No production secrets are committed. `git status` shows no
      `env/<env>/<service>.env` (only `.env.example`).

## Per-image build

For each `(ENV, SERVICE)` combination you intend to ship:

- [ ] `make container-build ENV=<env> SERVICE=api` succeeds and produces
      `onegoodarea/api:<env>`.
- [ ] `make container-build ENV=<env> SERVICE=web` succeeds and produces
      `onegoodarea/web:<env>` (Next.js standalone output; parity image).
- [ ] `make container-build ENV=<env> SERVICE=postgres` succeeds and
      produces `onegoodarea/postgres:<env>` (parity image).
- [ ] Both engines verified at least once:
      `CONTAINER_ENGINE=podman make container-build ...` and
      `CONTAINER_ENGINE=docker make container-build ...` both succeed
      on a Linux host (one engine on macOS/Windows is acceptable).

## Runtime smoke

For each `(ENV, SERVICE)`:

- [ ] `make container-run ENV=<env> SERVICE=api` -- `curl http://localhost:8080/health`
      returns `200 OK` within 10 s of startup.
- [ ] `make container-run ENV=<env> SERVICE=web` -- the home route
      responds on its expected port (default 3000) with HTML.
- [ ] `make container-run ENV=<env> SERVICE=postgres` --
      `pg_isready -h localhost -p 5432 -U <POSTGRES_USER>` returns 0
      within 10 s of startup.
- [ ] Boot logs show no missing-env warnings (search for `process.env.`
      references that resolved to `undefined` in the boot sequence).
- [ ] Container binds the expected host port (`docker ps` /
      `podman ps`).
- [ ] `make container-stop ENV=<env> SERVICE=<...>` cleanly stops the
      container (no `Error response from daemon`).

## Cross-platform parity

- [ ] The same `make container-*` invocations succeed on at least one
      Linux + one macOS-or-Windows host (or have CI evidence per the
      "linux" and "windows" runners). No script-shape differences.
- [ ] `docs/ARCHITECTURE/CONTAINERS.md` env file table matches the actual
      `env/<env>/<service>.env.example` contents.

## Provider wiring

- [ ] `render.yaml` `dockerfilePath` points at the current API
      Containerfile (today: `./container/api/Containerfile`).
- [ ] Render auto-deploy from the configured branch succeeds (or the
      Render dashboard build log shows green).
- [ ] Public health endpoint reachable post-deploy:
      `curl https://<host>/health` -> `{"status":"ok"}`.

## Git hygiene

- [ ] `git ls-files | grep node_modules` returns nothing.
- [ ] `git ls-files apps/web/next-env.d.ts` lists the file (tracked).
- [ ] No real env files staged.

## Rollback (when something is wrong)

1. **Stop the affected service:**
   ```bash
   make container-stop ENV=<env> SERVICE=<service>
   ```
2. **Retag + restart the previous image:**
   ```bash
   <engine> tag onegoodarea/<service>:<env>-previous onegoodarea/<service>:<env>
   make container-run ENV=<env> SERVICE=<service>
   ```
3. **For Render:** in the dashboard, "Manual Deploy" -> select the prior
   green commit. (`render.yaml` `autoDeploy: false` keeps you in control
   between approvals.)
4. **Revert the offending commit on the branch:**
   ```bash
   git revert <sha>
   git push
   ```
   Render auto-builds the revert if `autoDeploy: true`; otherwise manual
   trigger.

## Known failure modes + remediation

| Symptom | Likely cause | Fix |
|---|---|---|
| `make container-build` errors at `npm install` with `EUNSUPPORTEDPROTOCOL` or missing optional deps | The lockfile is Windows-generated; `npm ci` fails on Linux | The Containerfiles already use `npm install --no-audit --no-fund`; ensure you did not switch to `npm ci` |
| `make container-run` exits with `ERROR: env/<env>/<service>.env not found` | Forgot to copy the `.example` | `cp env/<env>/<service>.env.example env/<env>/<service>.env` then fill it |
| API container starts but `/health` 502s | `DATABASE_URL` missing or wrong; container could not connect to DB on boot | Check the env file; confirm `?sslmode=require` for Neon |
| Web container starts but pages 500 | `AUTH_SECRET` mismatch between web + api, or missing `INTERNAL_API_URL` | Confirm both match; bring up `api` first |
| `CONTAINER_ENGINE=podman` works on macOS but emits "Warning: cannot find a suitable engine" | Podman machine not started | `podman machine init && podman machine start` |
| Container does not stop on `container-stop` ("no such container") | Container exited on its own; `--rm` removed it | `<engine> ps -a` to confirm; no action needed |

## Sign-off

- [ ] Author has run this checklist end-to-end on at least one
      environment.
- [ ] Reviewer has spot-checked the `(ENV, SERVICE)` matrix that the PR
      touches.
- [ ] Memo / Jira recap posted on the linked AR-* ticket.
