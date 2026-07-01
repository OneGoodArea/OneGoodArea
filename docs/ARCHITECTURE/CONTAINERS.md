# Containers

How OneGoodArea is packaged + run as OCI images. Same image, same Make
commands, every host OS.

> **Scope.** This doc is the production-container workflow (plan 008).
> Local dev compose (`compose/compose.yml`) is a separate, complementary
> stack -- see [`OPERATIONS/LOCAL-CONTAINERS.md`](../OPERATIONS/LOCAL-CONTAINERS.md).

## TL;DR

```bash
make container-info                                       # what engine + OS am I on?
make container-build ENV=prod  SERVICE=api                # build the API image
make container-build ENV=prod  SERVICE=web                # build the web image (parity)
make container-build ENV=local SERVICE=postgres           # build the postgres image (parity)

make container-run   ENV=local SERVICE=api                # run the API locally
curl http://localhost:8080/health

make container-stop  ENV=local SERVICE=api
make container-logs  ENV=local SERVICE=api
```

## Runtime engine -- one source of truth

`build/container.mk` decides which engine the Makefile invokes:

| Host OS | Default engine | Why |
|---|---|---|
| Linux | **Podman** if installed, otherwise **Docker** | Prefer rootless Podman, but keep Docker as a fallback when that is the only engine present |
| macOS | **Docker** | Docker Desktop is the path of least resistance |
| Windows | **Docker** | Same; works through Docker Desktop or WSL2 |

Override either default on the CLI:

```bash
CONTAINER_ENGINE=docker make container-build ENV=prod SERVICE=api    # force Docker
CONTAINER_ENGINE=podman make container-build ENV=prod SERVICE=api    # force Podman
```

Both engines honour the `Containerfile` filename, so the image
definitions are engine-agnostic.

## Image layout

```
container/
  api/Containerfile          # PRIMARY -- apps/api production image
  web/Containerfile          # PARITY  -- apps/web stays on Vercel as primary
  postgres/Containerfile     # PARITY  -- Neon stays the production DB
```

**API image (`container/api/Containerfile`)** is the canonical
deployable. Render's `render.yaml` references it; the same image runs
on Cloud Run / Koyeb / Fly / any OCI host.

**Web image (`container/web/Containerfile`)** uses Next.js
`output: "standalone"`. It exists for **parity / test compatibility**:
local prod-mirror, CI image build validation, future backup hosting.
`apps/web` continues to deploy on Vercel as primary; Vercel ignores the
standalone flag and builds its own way.

**Postgres image (`container/postgres/Containerfile`)** is a thin
wrapper around `postgres:16-alpine` -- env conventions + `pg_isready`
healthcheck contract. It exists for **parity / integration tests** only;
Neon remains the production database. Schema / DAL / migrations / seeds
are NOT baked into this image (they belong to plan 009).

## Env file layout

```
env/
  local/   { api, web, postgres }.env.example
  dev/     { api, web, postgres }.env.example
  prod/    { api, web, postgres }.env.example
```

Nine templates -- one per (environment x deployable unit). Each lists
only the variables its service reads.

To use one:

```bash
cp env/local/api.env.example env/local/api.env
$EDITOR env/local/api.env
make container-run ENV=local SERVICE=api
```

Real `env/<env>/<service>.env` files are gitignored. Only
`*.env.example` is tracked.

### Ownership matrix (high-level)

| Service | Reads | Notes |
|---|---|---|
| `api` | `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `STRIPE_*`, `RESEND_API_KEY`, `OGA_AI_PROVIDER`, `OGA_EMAIL_PROVIDER`, `OGA_SIGNALS_*`, `CRON_SECRET`, `PORT` | `apps/api/src/infrastructure/config/index.ts` is the typed boundary |
| `web` | `DATABASE_URL` (interim, plan 010), `AUTH_SECRET`, `NEXTAUTH_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_*`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `SENTRY_*`, `PORT`, `HOSTNAME` | `AUTH_SECRET` MUST equal the API's value (JWT bridge) |
| `postgres` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, optional `PGDATA` | DSN reflected in api + web `DATABASE_URL` |

### Secret handling

- **local** -- real local-dev secrets in `env/local/*.env` are fine;
  the file is gitignored.
- **dev** -- Neon dev branch + Stripe TEST keys + Anthropic dev key.
  Filled in `env/dev/*.env` (gitignored), or set on the host platform.
- **prod** -- secrets MUST be set in the host platform (Render
  dashboard, k8s Secret, Cloud Run Secret Manager). The committed
  `env/prod/*.env.example` documents the contract only.

## Make interface

`build/container.mk` provides:

| Target | Effect |
|---|---|
| `make container-info` | Print detected engine + host OS |
| `make container-build ENV=… SERVICE=…` | Build `onegoodarea/<service>:<env>` |
| `make container-run ENV=… SERVICE=…` | Run detached with the matching env file |
| `make container-stop ENV=… SERVICE=…` | Stop the named container |
| `make container-logs ENV=… SERVICE=…` | Follow logs |

A `container-guard` prerequisite validates `ENV in {local,dev,prod}` and
`SERVICE in {api,web,postgres}` before any engine call. Typos fail loudly.

Legacy ergonomic shortcuts also remain:

| Target | Notes |
|---|---|
| `make api-build` | Same as `container-build ENV=local SERVICE=api`, image `onegoodarea/api:local` |
| `make api-run` | Runs on `$(PORT)` (default 8080), env from `$(ENVFILE)` (default `apps/web/.env.local`) |
| `make api-stop` / `make api-clean` | Stop / drop the image |

## Image naming convention

`onegoodarea/<service>:<env>` for the portable targets:

| Service | Env | Image |
|---|---|---|
| api | local | `onegoodarea/api:local` |
| api | dev | `onegoodarea/api:dev` |
| api | prod | `onegoodarea/api:prod` |
| web | local | `onegoodarea/web:local` |
| ... | ... | ... |

Hosts that build from source (Render, Cloud Run via `--source .`) compute
their own image tags; the convention above is for locally-built images.

## Provider wiring

| Host | Wiring | File |
|---|---|---|
| Render | Reads `render.yaml`, builds from `container/api/Containerfile` | `/render.yaml` |
| Cloud Run | `gcloud run deploy --source . --build-pack=NOT_SET` then point at the same Containerfile | See [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) |
| Self-host | `make container-build ENV=prod SERVICE=api`, push to your registry, run with the host's env injection | See [`PROD-CONTAINER-CHECKLIST.md`](../HOME/PROD-CONTAINER-CHECKLIST.md) |

## See also

- [`PROD-CONTAINER-CHECKLIST.md`](../HOME/PROD-CONTAINER-CHECKLIST.md) -- preflight + smoke + rollback steps
- [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) -- per-provider walkthrough
- [`DECISIONS/0035-prod-container-parity.md`](../DECISIONS/0035-prod-container-parity.md) -- the decision record
