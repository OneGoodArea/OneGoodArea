# Plan 043: Branded /playground Developer Surface (Scalar + demo key)

> Child story of epic **AR-441** (Playground → /playground Scalar surface).
> Depends on Plan 046 (synced spec). The demo-key tier quota comes from Plan 044
> but is NOT a hard gate here — the one-click preset degrades gracefully until 044
> lands. Companion plans: 045, 046, 048, 049, 050.

## Purpose (one sentence)

Build an auto-maintained, branded developer surface where prospects can read
public API docs and run live "Try it out" calls at `/playground`, replacing the
custom `/playground` proxy with a spec-driven Scalar renderer — low-code, never
drifting from routes (because Plan 046 keeps the spec in sync).

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-498** — "Branded /playground developer surface (Scalar + demo key)".
  One branch `feat/AR-498-developer-surface`. Planning branch:
  `plan/developer-surface-swagger`.
- This plan is ONE story (not an epic). Steps are subtasks of AR-498, each a
  commit on the branch (see Plan 047):

| Step | Subtask | Maps to | Branch |
|---|---|---|---|
| A.1 | AR-505 | Add "Use demo key" preset to /playground module | `feat/AR-498-developer-surface` |
| A.2 | AR-506 | /developers surface (hero, Try-it-out, quickstart, pricing) | `feat/AR-498-developer-surface` |
| A.4 | AR-507 | Preserve renderers guard (/playground Scalar + raw spec) | `feat/AR-498-developer-surface` |
| A.5 | AR-508 | Developer-surface tests | `feat/AR-498-developer-surface` |

Order of implementation (step-by-step): AR-505 (A.1) → AR-506 (A.2) ∥ AR-507
(A.4) → AR-508 (A.5). Each step is a commit; the branch opens one PR, CI green
before merge. (The legacy custom-proxy retirement that was A.3 was extracted to
Plan 050.)

## Execution

Develop in a git worktree (Plan 047). Wave 3 — depends on Plan 046 (synced
spec). One branch (`feat/AR-498-developer-surface`); each step is a commit. CI
green before merge. The legacy custom proxy is retired by Plan 050 (not here).

---

## Context / current state (verified)

- API `/docs` = Fastify **Swagger UI** (spec at `/docs/json`, raw `/openapi.json`).
  To be RETIRED by Plan 050 (Scalar-only decision).
- Web `/openapi` = **Scalar** (`@scalar/api-reference-react`), fed by
  `/api/openapi-spec` -> `onegoodarea.onrender.com/docs/json`. Plan 050 moves this
  page to `/playground` and deletes the `/openapi` route. Scalar is the single
  renderer.
- Web `/docs` = marketing API docs page (design-v2/docs). PRESERVED.
- Custom `/playground` proxy + React UI exists (`routes/playground.ts`,
  `modules/playground/*`, `apps/web/.../playground/*`). Deleted by Plan 050; this
  plan renders Scalar at `/playground` instead.
- Rate limits enforced server-side in `shared/auth-api.ts -> requireApiAccess()`
  (per-key sliding window + monthly quota). Renderers are just clients sending
  `Authorization: Bearer <key>` -> inherit enforcement unchanged.

## Renderer decision (Scalar vs Swagger — point a)

Both consume the SAME `/openapi.json`; interchangeable front-ends. **Decision:
Scalar only.** The branded surface renders Scalar at `/playground`. The Scalar
page currently at `/openapi` is moved there by Plan 050; the `/openapi` page route
is deleted. API `/docs` Swagger UI is RETIRED (Plan 050) — Scalar is the single
renderer. "Swagger takes over playground" is realized by pointing the
`/playground` route at the Scalar renderer fed by the OpenAPI spec.

## Decisions (from user points 5/6/7)

- **Scalar only**: retire API `/docs` Swagger UI + delete web `/openapi` page
  route (Plan 050). Keep `@fastify/swagger` (spec generator) + Scalar at
  `/playground`.
- **Preserve** the `/api/openapi-spec` BFF (serves the raw spec to Scalar).
- **Spec renderer takes over `/playground`**: `/playground` becomes a branded
  wrapper around the Scalar renderer with a one-click demo key. The custom proxy
  is deleted by Plan 050.

---

## Steps

### A.1 - Branded /playground wrapper + demo-key preset (AR-505)
- Render the Scalar renderer inside the site shell at `/playground` (the
  `developer-surface` module, see Plan 050). Keep brand chrome, CSS variables,
  fonts.
- Add "Use demo key" one-click preset (demo key = `PLAYGROUND_API_KEY`, bounded by
  Plan 044 tier quota once it lands; degrade gracefully before 044 ships).

### A.2 - /developers surface (optional superset) (AR-506)
- Marketing + reference: hero, Try-it-out (the renderer), quickstart (curl/SDK),
  pricing/limits. Reuses the synced spec (Plan 046).

### A.4 - Preserve renderers guard (AR-507)
- Assert `/playground` (Scalar) + the raw OpenAPI spec (`/api/openapi-spec` and the
  api raw spec route) still resolve post-change. Swagger UI + `/openapi` page route
  are gone (Plan 050) — do NOT assert they exist.

### A.5 - Tests (AR-508, see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written**
- `main`: ❌ never edited directly (PR-only CI). Implementation on
  `feat/AR-498-developer-surface` inside a git worktree.

**Branch protection**
- Before the first PR, verify `main` protection (review + required CI checks) via
  GitHub MCP; if the `get_branch_protection` capability is unavailable in this
  environment, fall back to `gh` CLI / the GitHub web UI and record the result.
  If protection/checks are missing, stop and report.
- Own PR per worktree; CI green before merge.

**Pre-implementation checks**
1. Repo tree clean; on `main` before `git worktree add`.
2. Plan 046 merged (spec synced). Plan 044 (demo-key quota) is NOT a hard gate —
   the demo-key preset degrades gracefully until 044 lands.
3. `compose/compose.test.yml` builds + stack up:
   `podman compose -f compose/compose.test.yml up -d --build`.

**Test execution model (containers, fire away)**
- Unit: vitest inside `api-test` / `web-test` containers.
- E2E: node/curl script against `api-test` over compose network (playground
  wrapper loads renderer; demo-key call + 429 past cap).
- Integration (on-demand before final merge): combined suite on
  `integ/tier-developer-surface`.
- Tear down: `podman compose -f compose/compose.test.yml down`.

**Rollback / abort**
- Independently revertible. No destructive action without explicit confirm.

---

## Test Gates

**BEFORE coding**
- 046 merged (synced spec). Stack up.

**AFTER coding (must pass in container)**
- **Unit:**
  - `/openapi.json` valid + all public routes present (relies on Plan 046).
  - Web route tests: `/playground` + `/api/openapi-spec` still resolve.
- **E2E (against `api-test` + `web-test`):**
  - Playground wrapper page loads the Scalar renderer inside the branded shell.
  - "Use demo key" → a real `/v1/area` call returns production-shaped JSON (not
    mocked); repeated past the demo cap returns 429 (Plan 044 quota, once landed).
- **Preservation:** `/playground` (Scalar) + raw OpenAPI spec render the fuller
  spec. Swagger UI + `/openapi` page route must NOT exist (Plan 050).

---

## Dependencies
- **Plan 046** (spec sync) — must land first or in parallel; this story consumes
  the accurate spec.
- **Plan 044** (tiers + demo-key quota) — the "Use demo key" cap lives there; not a
  hard gate for 043 (preset degrades gracefully).
- **Plan 050** — establishes the `developer-surface` module + mounts Scalar at
  `/playground` that this story wraps/brands.

## Risks
- Renderer never pixel-perfect brand — mitigated by themed shell.
- Demo-key abuse — mitigated by Plan 044 tier quota + existing global/IP caps.

## Out of scope
- Tier->LLM routing (Plan 044); user flags (Plan 045); schema sync (046);
  single-source Zod (048); Scalar branding lockdown (049); custom-proxy retirement
  + independent module (050).
