# Plan 059: Tiered Playground Access (Scalar Try-It, per-tier auth + quota)

## Purpose

Make Scalar's "Try it" actually work end-to-end for all four tiers
(anonymous, logged-in non-paying, paying, staff), each bound to the quota
and LLM provider/model already defined in `modules/tiers`, with a shared
cost backstop for the free tiers.

## Context (verified, not the old system)

`docs/PLANS/044_EPIC_B_tier_quota_llm_routing.md` and
`045_user_tier_flags.md` already built a full tier taxonomy
(`modules/tiers/index.ts`: `anonymous | logged_in | basic | high_tier |
engineering | superuser`, each with quota + `{provider, model}`), but:

- `checkQuota`/`resolveTier` is only called from `shared/auth-api.ts`
  (API-key routes). No entry point exists for anonymous callers —
  `shared/require-credential.ts` 401s any security-tagged route with no
  `Authorization: Bearer` header at all, so the `anonymous` tier is dead
  code today.
- `decideLlm`/`getAiProviderForTier` (`modules/engine/ai/index.ts`) has
  zero callers — `/v1/query` still uses the single global
  `getAiProvider()`, so tier never actually changes which model/provider
  answers a request.
- `apps/web/src/modules/developer-surface/index.tsx` hardcodes
  `preferredSecurityScheme: "bearerAuth"` with no tier awareness.
- `/me`, `/keys`, `/admin`, `/stripe` declare `security: [{"bearerToken":
  []}]` — a stateless 5-min JWT minted server-to-server from a NextAuth
  session (`modules/auth/session-token.ts`) that a browser-based Scalar
  session can never obtain. These routes are untestable via the
  playground today.

Jira AR-466–472 ("tier-aware rate limit", "BFF auth bridge", etc.) are
correctly marked Done — for a **different, now-deleted** custom
playground (`apps/api/src/routes/playground.ts`,
`apps/web/src/app/design-v2/playground/client.tsx`), retired by AR-504
("Retire custom playground & establish independent /playground Scalar
module"). None of those files exist anymore. The tier/auth bridging was
never rebuilt for the Scalar replacement — that gap is what this plan
closes. These are new stories, not a reopen of AR-466–472.

## JIRA

- **Epic:** AR-441 (Playground) — existing, In Progress.
- **Stories** (one per step below, flat children of AR-441, same pattern
  as AR-498–504 / AR-563–571):

  | Step | Story | Working title |
  |---|---|---|
  | 59.1 | AR-593 | Global free-tier cost backstop in rate-limit module |
  | 59.2 | AR-594 | Anonymous entry path into `resolveTier`/`checkQuota` |
  | 59.3 | AR-595 | Auto-provision end-of-day API key for logged-in users |
  | 59.4 | AR-596 | Gate sensitive routes to real keys; fix bearerAuth/bearerToken split |
  | 59.5 | AR-597 | Wire tier-based LLM routing into `/v1/query` |
  | 59.6 | AR-598 | Tier-aware Scalar auth injection (web) |
  | 59.7 | AR-599 | Tests: quota backstop, anonymous flow, key expiry, tier→LLM, e2e Try-It |
  | 59.8 | AR-600 | Update customer-facing docs (ERRORS.md, AUTHENTICATION.md) |

- **Planning branch:** `plan/059-tiered-playground-access` (no Jira key).
- **Implementation:** one worktree for the whole plan —
  `.worktrees/059-tiered-playground-access` — matching the established
  convention (Plan 044/056 used one worktree per plan, not one per child
  story). Branch `feat/AR-441-tiered-playground-access`. Each story above
  is still its own commit inside that worktree.
- Jira issues created 2026-07-23, status `To Do`, sprint AR Sprint 6.

## Changes from previous playground implementations (read this first, future sessions)

This is the **second** attempt at tier-aware playground auth. Do not
re-derive this from git-blame or Jira status alone — both are misleading
here:

1. **AR-466–472** ("Add tier-aware rate limit config", "Update BFF to
   bridge auth", "Extend playground proxy route for auth", etc.) are
   marked Done and are *not* bugs — they correctly implemented tier
   auth for a **custom-built playground** (`apps/api/src/routes/
   playground.ts`, `apps/api/src/modules/playground/`, `apps/web/src/
   app/design-v2/playground/client.tsx`) that has since been **deleted**
   by AR-504 ("Retire custom playground & establish independent
   /playground Scalar module"). Searching for those file paths today
   will find nothing. Do not resurrect that architecture or treat those
   tickets as a template to copy — the replacement (Scalar) has a
   different shape (no custom proxy route; Scalar talks to the real API
   directly with `securitySchemes`).
2. **What existed before this plan, in the current (Scalar) system:**
   - `modules/tiers/index.ts` already defines the tier catalog, quota,
     and LLM provider/model per tier — but `checkQuota`/`resolveTier`
     was only ever called from `shared/auth-api.ts` for API-key routes.
   - No anonymous entry point existed anywhere — `shared/
     require-credential.ts` 401'd any security-tagged route with no
     `Authorization` header, so playground visitors without a key could
     not call anything, tier-aware or not.
   - `decideLlm`/`getAiProviderForTier` existed but had zero callers —
     tier never influenced which LLM model/provider actually answered a
     request.
   - Scalar's auth panel (`apps/web/.../developer-surface/index.tsx`)
     was hardcoded to `preferredSecurityScheme: "bearerAuth"` with no
     tiering, and `/me`/`/keys`/`/admin`/`/stripe` declared a
     `bearerToken` scheme that only a live NextAuth web session can
     produce — making those four routes untestable from Scalar for
     anyone, including staff.
3. **What this plan changes, concretely:**
   - Adds a real anonymous path (IP-keyed `anonymous` tier) so
     Try-It works with zero credentials on non-sensitive routes.
   - Adds a shared global daily ceiling across `anonymous` +
     `logged_in`/`basic` traffic combined, as a cost backstop — owned by
     the rate-limit module, not any individual route (new behavior, did
     not exist in either the old or current system).
   - Adds auto-provisioned, end-of-day-expiring API keys for logged-in
     users with none, for non-sensitive routes only.
   - Switches `/me`, `/keys`, `/stripe` from `bearerToken` to
     `bearerAuth` so they're actually testable (self-service, own key
     only); `/admin` keeps a superuser check on top. Auto-generated keys
     are explicitly rejected on these four routes.
   - Wires `decideLlm`/`getAiProviderForTier` into `/v1/query` so tier
     actually changes the model/provider used, for the first time.
   - Removes the hardcoded Scalar scheme preference in favor of
     per-session, tier-aware auth injection.
4. **Tier taxonomy is unchanged**: `anonymous | logged_in/basic |
   high_tier | engineering/superuser`, kept exactly as defined in Plan
   044/045 — this plan is wiring, not redesign.

## Key design decisions (from user)

1. Playground API keys are irrelevant to people who already have one —
   they'd call the API directly. Anonymous Try-It is for people who
   don't have a key at all.
2. Anonymous quota is **per-IP** (existing `anonymous` tier default,
   5/60s) — not a single shared bucket, since a shared bucket lets one
   script starve every other visitor with zero effort.
3. **Cost backstop:** in addition to per-IP/per-user quota, there is a
   single **global daily ceiling shared by `anonymous` + `logged_in`/
   `basic` (non-paying) tiers combined**. Paying (`high_tier`) and staff
   (`engineering`/`superuser`) are exempt — they're bounded by their own
   per-account quota instead. This backstop is owned and enforced by the
   rate-limit module itself (`infrastructure/rate-limit.ts` +
   `modules/tiers.checkQuota`), not by any route or caller.
4. Logged-in users: if they already have a real API key, Try-It uses it
   (subject to their tier's normal quota). If not, the system
   auto-creates one, **expiring at end of day**, subject to the same
   quota rules as a real key of that tier.
5. Sensitive/self-management routes (`/me`, `/keys`, `/admin`,
   `/stripe`) must **not** accept an auto-generated throwaway key — only
   a real, deliberately-created key. This also resolves the leftover
   `bearerAuth`/`bearerToken` scheme split on those routes (switch them
   to `bearerAuth`; `/admin` additionally requires superuser).
6. Tier taxonomy/semantics unchanged: `anonymous` = non-logged, `basic`/
   `logged_in` = logged-in non-paying, `high_tier` = paying,
   `engineering`/`superuser` = staff.

## Proposed shape

### Global free-tier backstop (`infrastructure/rate-limit.ts` + `modules/tiers`)
- New identifier bucket, e.g. `"global:free-tier-daily"`, checked via the
  existing `rateLimit(identifier, {max, windowSeconds})` primitive.
- `checkQuota(tier, identifier)` calls the per-identifier check **and**,
  when `tier` is `anonymous`/`logged_in`/`basic`, the shared global
  bucket — deny if either fails. `high_tier`/`engineering`/`superuser`
  never touch the global bucket.
- Config: `RATE_LIMITS.freeTierGlobal = {max, windowSeconds}` next to the
  existing catalog in `infrastructure/config/index.ts`, env-overridable
  like the per-tier `TIER_<TIER>_QUOTA_MAX`.

### Anonymous entry path (`shared/require-credential.ts`)
- Allow-list specific routes (the playground-testable business + AI
  routes) to proceed with no `Authorization` header instead of 401ing.
- On the allow-listed path with no header, `resolveTier` returns
  `anonymous` keyed by request IP; `checkQuota` gates as above.
- Sensitive routes stay off the allow-list — always require a real key.

### Auto-provisioned key (server-side, on docs page / first Try-It call)
- New `api_keys` columns: `auto_generated BOOLEAN NOT NULL DEFAULT FALSE`,
  `expires_at TIMESTAMPTZ` (nullable; NULL = never expires, matches
  existing keys).
- `validateApiKey` treats `expires_at < NOW()` as invalid, same code path
  as `revoked`.
- When a logged-in user with no active key hits the docs surface, the
  web BFF creates one with `auto_generated = true`,
  `expires_at = end-of-day (UTC)`.
- Sensitive-route middleware explicitly rejects `auto_generated = true`
  keys (403, distinct error code) regardless of expiry.

### LLM tier routing (`modules/engine/ai`, `routes/intelligence.ts`)
- `/v1/query` (and any other AI-calling route) resolves tier via the
  same `resolveTier`/`checkQuota` path, then calls
  `getAiProviderForTier(tier)` instead of the global `getAiProvider()`.

### Scalar auth injection (`apps/web/.../developer-surface/index.tsx`)
- Drop the hardcoded `preferredSecurityScheme`.
- Anonymous visitor: no scheme preselected, Try-It works with no auth
  header (routes on the allow-list only).
- Logged-in visitor: web BFF resolves/creates the user's key server-side
  and preloads it into Scalar's `bearerAuth` field.

## Steps

### 59.1 — Global free-tier cost backstop
`infrastructure/rate-limit.ts`, `infrastructure/config/index.ts`,
`modules/tiers/index.ts`.

### 59.2 — Anonymous entry path
`shared/require-credential.ts`, allow-list of routes, IP-keyed
`resolveTier`.

### 59.3 — Auto-provisioned end-of-day API key
Migration for `auto_generated`/`expires_at`, `validateApiKey` expiry
check, web BFF create-if-missing flow.

### 59.4 — Sensitive-route gating + scheme fix
Reject `auto_generated` keys on `/me`, `/keys`, `/admin`, `/stripe`;
switch those routes' declared scheme from `bearerToken` to `bearerAuth`
(`/admin` keeps superuser check on top).

### 59.5 — Tier-based LLM routing wiring
`routes/intelligence.ts` (and siblings) call `getAiProviderForTier`.

### 59.6 — Scalar auth injection (web)
Remove hardcoded scheme; server-side key resolution/injection for
logged-in sessions.

### 59.7 — Tests
Unit: global backstop shared-bucket behavior, anonymous IP resolution,
auto-key expiry + sensitive-route rejection, tier→LLM routing. E2E:
Try-It works per tier against a live container stack (anonymous, basic,
high_tier, superuser), sensitive routes reject auto keys.

### 59.8 — Update customer-facing docs
- `docs/API-REFERENCE/ERRORS.md:43` — the `429` row currently says "Per-key
  rate limit — 30/min by default"; replace with the actual per-tier
  limits plus the new global free-tier-backstop 429 case, once real
  numbers are set in 59.1.
- `docs/API-REFERENCE/AUTHENTICATION.md` — document the new anonymous
  (no-key) path and its limits, and the auto-generated end-of-day key
  behavior for logged-in users without a key. Note `/me`/`/keys`/
  `/stripe` now also accept a normal API key (bearerAuth), not only the
  session JWT bridge.
- Do this update in the same commit as the behavior it documents (59.1–
  59.4), not as an afterthought — each of those steps' commit should
  touch its doc paragraph directly.

## Safeguards & Execution Gates

- `main`: never edited directly. Implementation in one worktree for the
  whole plan, `.worktrees/059-tiered-playground-access`, branch
  `feat/AR-441-tiered-playground-access` (established convention: one
  worktree per plan, not per child story — see Plan 044/056). Each step
  above is still its own commit.
- Tests run in containers per `.claude/rules/containerized-testing.md`
  (Podman preferred, Docker fallback).
- Each step is its own commit; production (`apps/api/src`,
  `apps/web/src`) and test code committed in separate, reviewable units.

## Risks

| Risk | Mitigation |
|---|---|
| Allow-listing anonymous routes exposes something unintended | Allow-list is explicit and additive; sensitive routes are never on it |
| Auto-generated key reused past intent (e.g. scripted abuse) | End-of-day expiry + normal tier quota + global free-tier backstop all still apply to it |
| Global backstop starves legitimate free-tier traffic during a spike | Backstop is a high ceiling (cost control), not the primary limiter — per-IP/per-user quota is still the first gate |
| Scheme switch on `/me`/`/keys`/`/stripe` breaks an existing integration | Grep + update any external docs/SDKs referencing `bearerToken` on these routes before merge |

## Out of scope

- Redesigning the tier taxonomy itself (kept as-is per user decision).
- Billing/plan changes (`billing/plans.ts` stays the source of truth for
  `high_tier` mapping).
- Adding new AI providers beyond the existing Anthropic implementation.
