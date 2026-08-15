# Plan 081 — Fix 8 failing API test-suite endpoints + test-suite hygiene (Sprint 9)

## Purpose
Fix the 8 endpoints that fail in `scripts/api-test-suite.sh` against the local
stack (verified: `source scripts/setup-test-tokens.sh && ./scripts/api-test-suite.sh localhost:8080`
→ 0 skipped, 76 passed, 8 failed), wire the missing Stripe env vars into the
local compose stack **and** every env.example / real `.env` file, fix the test
suite's cosmetic skipped-counter bug, and create one Jira Bug per item (assigned
to Marcos Rossini, AR Sprint 9) transitioned to Done on merge.

- Jira: one Bug (AR-xxx…) per failing item, project AR, sprint "AR Sprint 9"
  (`customfield_10020`, sprint id 265), assignee `712020:03328287-a2d2-4234-b463-3c07e302b799`
  (Marcos Rossini).
- Branch: `fix/api-test-suite-failures` off `main` → PR → merge to `main`.
  After merge, `git merge main` into the AR-817 worktree so the user's branch
  (`ar-817-amenities-warm-cache`) carries the fixes forward.
- Status: **IN PROGRESS**.

## The 8 failures and root causes

1. **`POST /stripe/webhook` → 500 "Webhook secret not configured"** — local
   compose api service injects no `STRIPE_WEBHOOK_SECRET`
   (`apps/api/src/modules/billing/webhook-handler.ts:69-71`).
2. **`POST /stripe/portal` → 500** — local compose api service injects no
   `STRIPE_SECRET_KEY`; `getStripeClient()` throws "Neither apiKey nor
   config.authenticator provided" (`stripe-client.ts:23-24`).
3. **`GET /usage` → 500 serialization error** — superuser gets `limit: Infinity`
   from `canMakeApiCall` (`apps/api/src/modules/usage/index.ts:185`) sent raw at
   `apps/api/src/routes/me.ts:646`; contract `UsageCheckResponseSchema`
   (`packages/contracts/src/usage.ts:7`) is `z.number().nullable()`.
4. **`DELETE /settings/delete-account` → 500** — multi-statement
   `BEGIN;…;COMMIT;` sent as one template literal (`apps/api/src/routes/auth.ts:38-46`);
   the Neon HTTP driver rejects "multiple commands into a prepared statement".
   Fix: `sql.transaction([...])` (supported by `@neondatabase/serverless`).
5. **`GET /me/activity` + `GET /admin/analytics` → 500** — neon-compat-proxy
   converts booleans to `t/f` but leaves JSONB as a live JS object
   (`services/neon-compat-proxy/server.js:88-96`); the driver's `JSON.parse`
   then sees `"[object Object]"`. Fix: `JSON.stringify` JSONB (OIDs 114/3802).
6. **`GET /admin/traffic-analytics` → `day` null** — `date_trunc('day')::date`
   returns a JS Date via pg; the proxy passes it through and the driver's DATE
   parser (OID 1082) expects `YYYY-MM-DD`, not the ISO string it receives.
   Fix: format DATE OID 1082 values as `YYYY-MM-DD` in the proxy.
7. **`PUT /v1/orgs/org_123/methodology` → 500** — test sends `{"version":"2"}`
   but `SetMethodologyPinRequestSchema` requires `engine_version`
   (`packages/contracts/src/methodology.ts:23-25`); additionally
   `org-methodology.ts:64` marks `supported_versions` REQUIRED on the 400
   schema, so Fastify's default validation error body fails serialization.
   Fix both: test payload → `{"engine_version":"1.0.0"}`; make
   `supported_versions` optional in the 400 schema.
8. **Summary "Skipped: 76" counter bug (cosmetic)** — when all tokens present,
   `SKIPPED` still counts the 8 admin tests because the admin block bumps
   `SKIPPED+=8` only when the token is missing, but `TOTAL` never includes the
   admin block's 8 either. See below for the precise counter fix.

## Changes

### A. Stripe env wiring
- `compose/compose.yml` api service: add
  `STRIPE_SECRET_KEY: sk_test_mock`, `STRIPE_WEBHOOK_SECRET: whsec_test_mock`,
  `STRIPE_API_BASE_URL: http://stripe-mock:12111`; add `stripe-mock` to the api
  service's `depends_on` (service_healthy) and give `stripe-mock` the minimal
  profile already used for local `make stack-up` (or document it in the full
  profile path — verify how the stack is booted and pick the path that makes the
  suite green against localhost:8080).
- `env/dev/api.env.example`: already has `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` — add `STRIPE_API_BASE_URL` doc line.
- `env/local/api.env.example`: add `STRIPE_API_BASE_URL` and test-key values.
- Real gitignored files (`.env.local.test`, `env/local/api.env` if present)
  updated in place — do NOT commit secrets; only mock/test values.

### B. `GET /usage` Infinity
- `apps/api/src/routes/me.ts:646`: map `limit: usage.limit === Infinity ? null : usage.limit`
  (same guard as `me.ts:614`).

### C. delete-account transaction
- `apps/api/src/routes/auth.ts:38-46`: replace the multi-statement string with
  `await sql.transaction([...])` containing the five `sql`\`…\`` statements.

### D. neon-compat-proxy row mapping (`server.js:88-96`)
- In the row mapper, add: for `dataTypeID === 114 || dataTypeID === 3802`
  (JSON/JSONB) `JSON.stringify(val)`; for `dataTypeID === 1082` (DATE) format as
  `YYYY-MM-DD`. Keep the existing boolean `t`/`f` conversion.

### E. methodology
- `scripts/api-test-suite.sh:193`: `{"version":"2"}` → `{"engine_version":"1.0.0"}`.
- `apps/api/src/routes/org-methodology.ts:64`: `supported_versions` → `.optional()`.

### F. test-suite counter hygiene
- Make the admin block call `test_endpoint` for all 8 (already does when the
  token is present) and have the missing-token path bump `SKIPPED` per-endpoint
  via the same `test_endpoint` mechanism, or adjust the summary to compute
  `Skipped = Total - Passed - Failed`. Prefer the latter (single source of truth).

## GIT workflow
- Create `fix/api-test-suite-failures` from `main` (in a worktree or branch —
  see worktree-selection; likely a branch, changes are small).
- Commits (one per fix, referenced by Jira key):
  1. `fix(stripe): wire mock Stripe env into local compose api stack (AR-xxx)`
  2. `fix(usage): normalize Infinity limit to null in /usage (AR-xxx)`
  3. `fix(auth): use sql.transaction for delete-account (AR-xxx)`
  4. `fix(proxy): stringify JSONB + format DATE in neon-compat-proxy (AR-xxx)`
  5. `fix(orgs): accept engine_version body; relax 400 supported_versions (AR-xxx)`
  6. `test(suite): fix methodology payload + skipped counter (AR-xxx)`
  7. `chore(env): document STRIPE_API_BASE_URL in env examples (AR-xxx)`
- Push; open PR via GitHub MCP; title `Fix 8 failing API test-suite endpoints (Sprint 9)`.
- On merge: transition all created Jira Bugs → Done (status 10056).
- Carry forward: `git -C .worktrees/AR-817-amenities-warm-cache merge main`.

## Verification
- `make app-lint` (host) or container-equivalent.
- `make app-typecheck`.
- `make api-test-container` (unit tests, container).
- Full suite: `source scripts/setup-test-tokens.sh && ./scripts/api-test-suite.sh localhost:8080`
  → expect 0 skipped, 84 passed, 0 failed (76 + 8 admin, or 76 total if admin
  block counts separately — record actual).
- `git log --oneline -10` shows commits authored by Marcos Rossini
  (git author must be set, not AI).

## Acceptance criteria
- [ ] Suite runs 0 skipped / 0 failed against the local stack.
- [ ] Each fix is its own commit referencing its Jira key.
- [ ] Jira Bugs created (AR Sprint 9, assignee Marcos Rossini) and transitioned to Done.
- [ ] `main` carries the fixes; AR-817 worktree updated via `git merge main`.
- [ ] Stripe vars present in compose + env.example files; no secrets committed.
