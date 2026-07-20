# Plan 050: Retire custom playground & establish independent /playground Scalar module

## Purpose (one sentence)

Delete the legacy custom `/playground` proxy and establish a totally independent
`developer-surface` module (web **and** api) rendering Scalar at `/playground`;
the OpenAPI spec *data* is preserved.

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-504** — "Retire custom playground & establish independent
  /playground Scalar module". One branch `feat/AR-504-playground-retire-surface`.
  Planning branch: `plan/playground-retire-surface`.
- This plan is ONE story. Steps are subtasks of AR-504, each a commit on the
  branch (see Plan 047):

| Step | Subtask | Maps to |
|---|---|---|
| 50.1 | AR-535 | Delete legacy custom playground |
| 50.2 | AR-536 | Independent developer-surface module (web + api) |
| 50.3 | AR-537 | Mount Scalar at /playground; delete /openapi route |
| 50.4 | AR-538 | Repoint internal /openapi links → /playground |
| 50.5 | AR-539 | Update tests/guards |
| 50.6 | AR-540 | Tests |

## Execution

Develop in a git worktree (Plan 047). Wave 1b — after Plan 046 (synced spec to
render accurately). Depends on **046 only**; does NOT need 044 (the demo-key
preset is a Plan 043 enhancement). One branch; each step a commit.

---

## Context / current state (verified) — files to delete

- Web: `apps/web/src/app/playground/page.tsx`,
  `apps/web/src/app/design-v2/playground/*` (client.tsx, playground.css,
  turnstile-widget.tsx), `apps/web/src/app/api/playground/*` (token/route.ts,
  proxy/route.ts).
- API: `apps/api/src/routes/playground.ts`,
  `apps/api/src/modules/playground/*` (whitelist, turnstile, session, rate-limit).
- Env: drop `PLAYGROUND_*` (cookie secret, caps, Turnstile); keep
  `PLAYGROUND_API_KEY` as demo key.
- Scalar renderer currently at `apps/web/src/app/openapi/page.tsx` — moved to
  `/playground`; the `/openapi` **page route is deleted** (Scalar needs the
  OpenAPI *spec data*, not the `/openapi` page route).

---

## Steps

### 50.1 — Delete legacy custom playground
Remove all files listed above + drop `PLAYGROUND_*` env (keep `PLAYGROUND_API_KEY`).

### 50.2 — Independent developer-surface module
- **web:** `apps/web/src/modules/developer-surface/` — Scalar React wrapper +
  branded shell + styles; a thin `app/playground/page.tsx` renders it.
- **api:** `apps/api/src/modules/developer-surface/` — owns the OpenAPI spec
  generation config + raw spec route (moved out of `app.ts`); self-contained;
  **no swagger-ui** (Scalar-only decision).

### 50.3 — Mount Scalar at /playground; delete /openapi route
Thin `app/playground/page.tsx` renders the module; **DELETE**
`app/openapi/page.tsx` (no alias/redirect). Spec data kept (api raw spec +
web BFF `/api/openapi-spec`).

### 50.4 — Repoint internal /openapi links → /playground
Update links in `/docs`, `/docs/api-reference`, footer, etc. to `/playground`.

### 50.5 — Update tests/guards
Remove `POST /playground/proxy` & `/playground/token` tests; repoint 046/043
preservation guards to `/playground` + raw spec.

### 50.6 — Tests (see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written** — `main`: ❌ never edited directly. Implementation on
`feat/AR-504-playground-retire-surface` inside a git worktree.

**Branch protection (via GitHub MCP)** — verify `main` protection before first PR;
own PR; CI green before merge.

**Pre-implementation checks** — repo clean; Plan 046 merged; test stack up.

**Rollback / abort** — independently revertible (own branch/PR). Deletion is the
only irreversible step; guarded by its own commit + CI gate.

---

## Test Gates

**AFTER coding (must pass)**
- `/playground` loads Scalar inside the branded shell.
- `/openapi` page route returns 404; `POST /playground/proxy` & `POST
  /playground/token` return 404; `modules/playground/*` removed.
- Raw OpenAPI spec still served; internal links point to `/playground`.

---

## Risks
- Transitional route collision: `/playground` is both the old proxy (deleted) and
  the new Scalar surface — sequence 50.1 before 50.3 within the branch.

## Out of scope
- Tier logic (044); branding/CTA lockdown (049); spec sync (046/048).
