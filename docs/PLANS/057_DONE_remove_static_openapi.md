# Plan 057: Remove static openapi.json

## Purpose

Delete the hand-crafted legacy `apps/web/public/openapi.json` file. The playground has never read it — it fetches the spec from the live backend via `/api/openapi-spec` BFF. Remove the stale artifact and all references to it.

## JIRA

- **Epic:** AR-561 — Remove static openapi.json
- **Stories** (one per step):

  | Step | Story | Working title |
  |---|---|---|
  | 57.1 | AR-568 | Delete apps/web/public/openapi.json |
  | 57.2 | AR-569 | Rewrite openapi.test.ts to fetch from BFF |
  | 57.3 | AR-570 | Update docs referencing the static file |
  | 57.4 | AR-571 | Add 404 or redirect for /openapi.json path |

- **Planning branch:** `plan/056-057-058-playground-openapi-response-schemas`
- **Implementation branches:** `feat/AR-561-remove-static-openapi` per story
- **Sprint:** AR Sprint 7

## Context

`apps/web/public/openapi.json` was created in April 2026 as a hand-crafted OpenAPI 3.0 spec before `@fastify/swagger` existed. It has since drifted — tests reference it but the live spec is now generated from route schemas. The playground has never consumed this file; it fetches from `/api/openapi-spec` which serves the live spec.

## Steps

### 57.1 — Delete the file

```bash
rm apps/web/public/openapi.json
```

### 57.2 — Rewrite openapi.test.ts

**File:** `apps/web/tests/unit/openapi.test.ts`

- Replace `fs.readFileSync` with a fetch to `/api/openapi-spec` (or the live backend)
- Keep all existing assertions but point them at the live spec
- Alternatively, move tests to the API test suite where they can test the live `/api/openapi-spec` endpoint directly

### 57.3 — Update docs

- Search for references to `public/openapi.json` or `/openapi.json` in all docs files
- Update any plan files, READMEs, or internal docs that mention the static file
- If no references exist beyond the test file, this step is a no-op

### 57.4 — Add 404 or redirect

- If anything still hits `/openapi.json`, add a redirect (301 → `/api/openapi-spec`) or a 404 in Next.js config
- Check if any external partners or docs link to the static file

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Something depends on the static file path | Add redirect as safety net |
| Tests break if backend isn't running during web tests | Fetch from BFF with fallback; or move assertions to API test suite |
| CI pipeline references the file | Audit all CI configs and Dockerfiles |

## Validation

- [ ] `apps/web/public/openapi.json` deleted
- [ ] `openapi.test.ts` rewritten and passing without the static file
- [ ] Zero references to `public/openapi.json` in repository
- [ ] `npm test` passes
- [ ] `/playground` still works (fetches spec from backend)
