# Plan 043 (EPIC A — single epic): Swagger/OpenAPI Developer Surface

> This plan is ONE epic. No nested epics. Depends on Plan 046 (spec sync) and
> EPIC B (Plan 044) for the demo-key tier quota. Child/dependent plans: 045, 046.

## Purpose (one sentence)

Build an auto-maintained, branded developer surface where prospects can read
public API docs and run live "Try it out" calls, replacing the custom
`/playground` proxy with a spec-driven renderer — low-code, never drifting from
routes (because Plan 046 keeps the spec in sync).

## JIRA

One EPIC: **EPIC-A** (created at implementation time, key `AR-XXX`). Planning
branch: `plan/developer-surface-swagger`.

**Child JIRAs — each is a story, each gets its own branch.** Branch naming:
`feat/<JIRA-KEY>-<slug>`. One worktree per child JIRA (see Plan 047).

| Child JIRA | Title | Maps to step | Branch | Depends on |
|---|---|---|---|---|
| AR-A1 | Branded playground wrapper (Scalar + demo key) | A.1 | `feat/AR-A1-playground-wrapper` | Plan 046 (synced spec) |
| AR-A2 | `/developers` surface (marketing + reference) | A.2 | `feat/AR-A2-developers-surface` | AR-A1, Plan 046 |
| AR-A3 | Retire custom playground proxy | A.3 | `feat/AR-A3-retire-playground-proxy` | EPIC-B (AR-B3 demo quota) |
| AR-A4 | Preserve renderers guard (`/docs`,`/openapi`,`/api/openapi-spec`) | A.4 | `feat/AR-A4-preserve-renderers` | AR-A1 |
| AR-A5 | Developer-surface tests | A.5 | `feat/AR-A5-dev-surface-tests` | AR-A1, AR-A3 |

Order of implementation (step-by-step): AR-A1 → AR-A2 ∥ AR-A4 → AR-A3 (waits for
EPIC-B AR-B3 demo-key quota) → AR-A5. Each child PR through CI, merged before the
next dependent child starts.

## Execution

Develop in git worktrees (see Plan 047). Wave 3 — depends on Plan 046 (synced
spec) + EPIC B (044, demo-key tier quota). Each child JIRA is its own
worktree/branch. A.3 (retire custom proxy) is LAST and waits for 044's quota.

---

## Context / current state (verified)

- API `/docs` = Fastify **Swagger UI** (spec at `/docs/json`, raw `/openapi.json`).
- Web `/openapi` = **Scalar** (`@scalar/api-reference-react`), fed by
  `/api/openapi-spec` -> `onegoodarea.onrender.com/docs/json`. (Different renderer
  from Swagger UI — both preserved. Scalar is the better fit for brand embedding.)
- Web `/docs` = marketing API docs page (design-v2/docs). PRESERVED.
- Custom `/playground` proxy + React UI exists (`routes/playground.ts`,
  `modules/playground/*`, `apps/web/.../playground/*`). To be TAKEN OVER by the
  spec renderer (point 7).
- Rate limits enforced server-side in `shared/auth-api.ts -> requireApiAccess()`
  (per-key sliding window + monthly quota). Renderers are just clients sending
  `Authorization: Bearer <key>` -> inherit enforcement unchanged.

## Renderer decision (Scalar vs Swagger — point a)

Both consume the SAME `/openapi.json`; they are interchangeable front-ends.
**Recommendation: use Scalar as the engine** for the branded surface (already in
use at `/openapi`, better theming/brand fit). "Swagger takes over playground"
holds because Scalar reads the same OpenAPI spec. API `/docs` Swagger UI is kept
as-is.

## Decisions (from user points 5/6/7)

- **Preserve** web `/docs` and web `/openapi` routes (and API `/docs` Swagger UI).
- **Preserve** the `/api/openapi-spec` BFF.
- **Spec renderer takes over `/playground`**: retire the custom proxy; `/playground`
  becomes a branded wrapper around the Scalar renderer with a one-click demo key.

---

## Steps

### A.1 - Branded playground wrapper (takes over /playground)
- Render the Scalar renderer inside the site shell at `/playground` (or redirect
  `/playground` -> `/developers`). Keep brand chrome, CSS variables, fonts.
- Add "Use demo key" one-click preset (demo key = today's `PLAYGROUND_API_KEY`,
  bounded by EPIC B tier quota).

### A.2 - /developers surface (optional superset)
- Marketing + reference: hero, Try-it-out (the renderer), quickstart (curl/SDK),
  pricing/limits. Reuses the synced spec (Plan 046).

### A.3 - Retire custom playground proxy
- After A.1 ships+verified: delete `routes/playground.ts` + `modules/playground/*`
  (session/rate-limit/whitelist/turnstile) and `apps/web/.../playground/*` + BFF
  `apps/web/.../api/playground/*`.
- Drop unused `PLAYGROUND_*` env (cookie secret/caps/Turnstile); keep
  `PLAYGROUND_API_KEY` as demo key.

### A.4 - Preserve renderers (no-op / guard)
- Assert `/docs` (Swagger UI), `/openapi` (Scalar), `/api/openapi-spec` still
  work post-change.

### A.5 - Tests (see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written**
- `main`: ❌ never edited directly (PR-only CI). Implementation on
  `feat/AR-XXX-developer-surface` inside a git worktree.

**Branch protection (via GitHub MCP)**
- Before the first PR, verify `main` protection (review + required CI checks) via
  GitHub MCP (`mcp__github__get_branch_protection` on
  `OneGoodArea/OneGoodArea@main`); if absent, stop and report.
- Own PR per worktree; CI green before merge.

**Pre-implementation checks**
1. Repo tree clean; on `main` before `git worktree add`.
2. Plan 046 merged (spec synced) AND EPIC B (044) merged/rebased (demo-key quota
   exists) — A.1/A.2 may start earlier; A.3 MUST wait for 044.
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
- Independently revertible. A.3 (proxy deletion) is the only irreversible-ish
  step and is gated behind 044 quota verification. No destructive action without
  explicit confirm.

---

## Test Gates

**BEFORE coding**
- 046 merged (synced spec) + 044 merged/rebased (demo-key tier quota). Stack up.

**AFTER coding (must pass in container)**
- **Unit:**
  - `/openapi.json` valid + all public routes present (relies on Plan 046).
  - Web route tests: `/docs`, `/openapi`, `/api/openapi-spec` still resolve.
- **E2E (against `api-test` + `web-test`):**
  - Playground wrapper page loads the Scalar renderer inside the branded shell.
  - "Use demo key" → a real `/v1/area` call returns production-shaped JSON (not
    mocked); repeated past the demo cap returns 429 (EPIC B quota).
  - **A.3 gate (only after 044 verified):** `POST /playground/proxy` and
    `POST /playground/token` return 404; `modules/playground/*` removed.
- **Preservation:** `/docs` (Swagger UI) + `/openapi` (Scalar) + `/api/openapi-spec`
  render the fuller spec unchanged.

---

## Dependencies
- **Plan 046** (spec sync) — must land first or in parallel; this epic consumes
  the accurate spec.
- **EPIC B / Plan 044** (tiers + demo-key quota) — the "Use demo key" cap lives there.

## Risks
- Renderer never pixel-perfect brand — mitigated by themed shell.
- Demo-key abuse — mitigated by EPIC B tier quota + existing global/IP caps.

## Out of scope
- Tier->LLM routing (EPIC B); user flags (Plan 045); schema sync (Plan 046).
