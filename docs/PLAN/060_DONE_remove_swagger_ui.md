# Plan 060: Remove Swagger UI (`@fastify/swagger-ui`)

## Purpose (one sentence)

Remove `@fastify/swagger-ui` and all Swagger UI artifacts from the project;
Scalar at `/playground` is the sole API documentation renderer and does not
need the Swagger UI playground at `/docs`.

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-608** — "Remove Swagger UI / @fastify/swagger-ui".
  Branch: `feat/AR-608-remove-swagger-ui`.
  Planning branch: `plan/060-remove-swagger-ui`.

## Background

`@fastify/swagger` (OpenAPI spec generator) stays — Scalar at `/playground`
and the web BFF (`/api/openapi-spec`) both consume `/docs/json` which comes
from `@fastify/swagger`. Only `@fastify/swagger-ui` (the Swagger UI playground
served at `/docs`) is being removed. This was already decided in Plan 050
(`no swagger-ui (Scalar-only decision)`).

## Steps

| Step | Subtask | Description |
|---|---|---|
| 60.1 | — | Remove `@fastify/swagger-ui` from `apps/api/package.json` dependencies |
| 60.2 | — | Remove `fastifySwaggerUi` import and registration from `apps/api/src/app.ts` |
| 60.3 | — | Remove `@fastify/swagger-ui/static` copy step from `apps/api/package.json` build script |
| 60.4 | — | Remove `dist/static` copy from `container/api/Containerfile` |
| 60.5 | — | Update comments in `apps/api/src/app.ts` and web docs pages |
| 60.6 | — | Run typecheck + lint in `apps/api` |
| 60.7 | — | Verify `/docs/json` still serves the OpenAPI spec; `/docs` no longer serves Swagger UI |

## Execution

Single branch, single commit per step. No worktree needed (one story, no
parallel waves).

## Out of scope

- `@fastify/swagger` (spec generator) — kept
- `zod-safe-json-schema-transform.ts` — kept (feeds `@fastify/swagger`)
- `openapi-config.ts` — kept (OpenAPI metadata for `@fastify/swagger`)
- `/docs/json` endpoint — kept (Scalar consumes it)
- All OpenAPI test files — kept (they test `/docs/json`, not `/docs` HTML)