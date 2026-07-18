# Plan 044 (EPIC B — single epic): Unified Tier / Quota / LLM-Routing Layer

> This plan is ONE epic. No nested epics. Depends on Plan 045 (user tier flags,
> the column `resolveTier` reads). Child/dependent plan: 045. Feeds EPIC A (043)
> via the demo-key tier quota.

## Purpose (one sentence)

Introduce a standalone, reusable `rate-limit`/tier module that owns a config
catalog mapping each tier to its quota and LLM provider/model, and is queried by
callers (API gate, LLM engine, future modules) who obey its verdict — so tiers
are configurable, grow/shrink safely, and drive both rate limits and AI routing.

## JIRA

One EPIC: **EPIC-B** (created at implementation time, key `AR-XXX`). Planning
branch: `plan/tier-quota-llm-routing`.

**Child JIRAs — each is a story, each gets its own branch.** The epic plans them;
implementation creates them one by one, step-by-step. Branch naming:
`feat/<JIRA-KEY>-<slug>`, branched from `main` (or from the prior merged child
where a step depends on another). One worktree per child JIRA (see Plan 047).

| Child JIRA | Title | Maps to step | Branch | Depends on |
|---|---|---|---|---|
| AR-B1 | Add TIERS catalog + `resolveTier(ctx)` | B.1 | `feat/AR-B1-tiers-catalog-resolver` | Plan 045 (tier col) |
| AR-B2 | Promote rate-limit into reusable module (`checkQuota`) | B.2 | `feat/AR-B2-ratelimit-module` | AR-B1 |
| AR-B3 | Wire API gate to tier quota | B.3 | `feat/AR-B3-gate-tier-quota` | AR-B2 |
| AR-B4 | LLM provider/model routing by tier | B.4 | `feat/AR-B4-llm-tier-routing` | AR-B1 |
| AR-B5 | Config deployment (env/JSON loadable) | B.5 | `feat/AR-B5-tier-config-deploy` | AR-B1 |
| AR-B6 | Tier/quota/LLM tests | B.6 | `feat/AR-B6-tier-tests` | AR-B2, AR-B3, AR-B4 |

Order of implementation (step-by-step): AR-B1 → AR-B2 → (AR-B3 ∥ AR-B4 ∥ AR-B5)
→ AR-B6. Each child PR goes through CI (lint/typecheck/test in containers) and is
merged before the next dependent child starts (or rebased onto the merged child).

## Execution

Develop in git worktrees (see Plan 047). Wave 2 — depends on Plan 045 (tier
col). Each child JIRA is its own worktree/branch. Feeds EPIC A (043), which
consumes its demo-key quota.

---

## Context / current state (verified)

- Rate limiting today: `infrastructure/rate-limit.ts` (Neon-backed sliding
  window, generic `rateLimit(identifier, {max, windowSeconds})`) + per-key gate
  in `shared/auth-api.ts` `requireApiAccess()`.
- Quotas: `modules/usage/index.ts` `canMakeApiCall()` reads `PLANS[plan].
  apiCallsPerMonth` + `overageMode` from `billing/plans.ts`. Superuser = DB flag
  `is_superuser` + `SUPERUSER_EMAILS`.
- LLM selection today: `modules/engine/ai/index.ts` `getAiProvider()` returns a
  single global provider (`mock` | `anthropic`); model is ONE global env var
  `ANTHROPIC_MODEL` (read in `anthropic-provider.ts`). **No tier->provider/model
  mapping exists.** Adding OpenAI later means a new provider class + a router.
- Tiers (6, may grow/collapse): anonymous, logged_in, basic, high_tier,
  engineering, superuser.
- Test stack: `compose/compose.test.yml` (ephemeral `oga_test`).

---

## Key design decisions (from user)

1. **New `TIERS` catalog** (first-class config), decoupled from `billing/plans.ts`.
   Tiers are an explicit enum with their own quota + LLM routing, deployed as
   config that can change without a code deploy.
2. **Standalone, reusable rate-limit module** that *owns* the tier->quota/provider
   decision. Other modules (API gate, LLM engine, future) **query** it and
   **obey** its decision — no module decides limits for itself. Tier quota is the
   ONLY mechanism the module owns.
3. **Config-based LLM routing:** tier -> {provider, model}. Pluggable providers so
   OpenAI can be added later. Centralized in `engine/ai`.
4. Rate-limiting is independent and reusable across many modules.

---

## User-facing tier exposure (point b, see Plan 045)

`tier` is a `users` column readable by the user **themselves** via a self-scoped
endpoint (mirror existing `/me/is-superuser`), never leaked to other callers or
in self-signup writes.

---

## Proposed shape

### TIERS catalog (config, e.g. `modules/tiers/config.ts` or env-loaded JSON)
```
TIERS = {
  anonymous:    { quota: {max, window}, llm: {provider:"anthropic", model:"haiku-..."} },
  logged_in:    { quota: ...,            llm: {provider:"anthropic", model:"sonnet-..."} },
  basic:        { quota: ...,            llm: {provider:"anthropic", model:"haiku-..."} },
  high_tier:    { quota: ...,            llm: {provider:"anthropic", model:"sonnet-..."} },
  engineering:  { quota: {unlimited},    llm: {provider:"anthropic", model:"opus-..."} },
  superuser:    { quota: {unlimited},    llm: {provider:"any",       model:"opus-..."} },
}
TIER_ORDER = ["anonymous","logged_in","basic","high_tier","engineering","superuser"]
```
- Tier resolution: anonymous (no key) -> logged_in/basic/high_tier (from plan
  mapping) -> engineering (tier col, Plan 045) -> superuser (`is_superuser`,
  overrides). Single `resolveTier(ctx)`.

### Reusable rate-limit module (`modules/rate-limit/*`)
- Promote/extend `infrastructure/rate-limit.ts` into a module with:
  - `checkQuota(tier, identifier)` -> `{ allowed, remaining, reset, reason }`
    (THE owned quota mechanism).
  - `decideLlm(tier)` -> `{ provider, model }` (routing read).
- Callers NEVER compute limits themselves; they call `checkQuota` and obey.

### LLM router (`modules/engine/ai`)
- `getAiProviderForTier(tier)` resolves provider+model from the catalog.
- Provider abstraction so OpenAI (future) slots in without touching callers.
- `anthropic-provider.ts` / future `openai-provider.ts` implement `AiProvider`.

---

## Steps

### B.1 - Define TIERS catalog + `resolveTier(ctx)`
- New `modules/tiers/` with config + resolver. Engineering reads the `tier`
  column from Plan 045; superuser from `is_superuser`.

### B.2 - Promote rate-limit into reusable module owning quota decisions
- `modules/rate-limit/` wraps `infrastructure/rate-limit.ts`; exposes
  `checkQuota(tier, identifier)` returning a verdict. API gate + future modules
  query it and obey.

### B.3 - Wire API gate to tier quota
- `requireApiAccess()` (and the demo-key path from EPIC A) asks the tier module
  for the caller's quota instead of the inline `canMakeApiCall` logic. Keeps
  `billing/plans.ts` as the billing source but routes tier decisions through the
  new module.

### B.4 - LLM provider/model routing by tier
- `getAiProviderForTier(tier)` selects provider+model from catalog.
- Refactor `engine/ai/index.ts` + `anthropic-provider.ts` to take tier; add
  provider interface so OpenAI can be added later. Planner/executor pass tier
  through (today it's call-site global).

### B.5 - Config deployment
- Catalog loadable from env/JSON so quota + model can change without redeploy.
- Document each tier's quota + model in the developer surface (EPIC A) + ADR.

### B.6 - Tests (see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written**
- `main`: ❌ never edited directly (PR-only CI). Implementation on
  `feat/AR-XXX-tier-quota-llm-routing` inside a git worktree.

**Branch protection (via GitHub MCP)**
- Before the first PR, verify `main` protection (review + required CI checks) via
  GitHub MCP (`mcp__github__get_branch_protection` on
  `OneGoodArea/OneGoodArea@main`); if absent, stop and report.
- Own PR per worktree; CI green before merge.

**Pre-implementation checks**
1. Repo tree clean; on `main` before `git worktree add`.
2. Plan 045 merged (tier column exists) OR rebased onto `integ` branch that
   includes 045.
3. `compose/compose.test.yml` builds + stack up:
   `podman compose -f compose/compose.test.yml up -d --build`.

**Test execution model (containers, fire away)**
- Unit: vitest inside `api-test` container.
- E2E: node/curl script against `api-test` over compose network (demo key → 429
  past cap; LLM routes to correct model).
- Integration (on-demand before final merge): combined suite on
  `integ/tier-developer-surface`.
- Tear down: `podman compose -f compose/compose.test.yml down`.

**Rollback / abort**
- Independently revertible. If quota proves unsafe, EPIC A's A.3 is held (custom
  proxy stays) until cap verified. No destructive action without explicit confirm.

---

## Test Gates

**BEFORE coding**
- TIERS catalog + `resolveTier` unit-isolated (mock DB); Plan 045 merged/rebased.

**AFTER coding (must pass in container)**
- **Unit:**
  - `resolveTier` returns correct tier for each identity state: anonymous (no
    key), logged_in/basic/high_tier (plan mapping), engineering (tier col),
    superuser (`is_superuser` overrides everything).
  - `checkQuota` allows within quota, denies past it, returns
    `{allowed, remaining, reset, reason}` per tier.
  - **Sole-owner gate:** a lint/assert test confirms no route module computes its
    own limit — every caller invokes `checkQuota` and obeys the verdict.
  - `decideLlm` returns correct `{provider, model}` per tier; superuser =
    `{provider:"any", model:"opus-..."}`.
- **E2E:**
  - Demo API key (anonymous tier) → repeated calls eventually return 429 with
    tier reason; header `Retry-After` present.
  - An LLM-backed call (e.g. `/v1/query`) routes to the model the caller's tier
    maps to (assert via mock provider recording the model requested).
- **Regression:** existing `requireApiAccess` plan-gate + `canMakeApiCall`
  behaviour preserved for non-tier paths.

---

## Risks
- Tier<->plan mapping drift: keep `billing/plans.ts` as billing truth; tiers are a
  routing/quota overlay, not a replacement.
- Engineering tier source: confirmed via Plan 045 `tier` column.
- LLM cost: basic tier on haiku, superuser on opus — verify cost envelope.

## Out of scope
- Swagger UI embedding (EPIC A); OpenAPI sync (Plan 046); user-flag writes (Plan 045).
