# Plan 018-A: Finish the app.ts route extraction — execution addendum (AR-286)

## 0. Relationship to plan 018

This is an **execution extension** of `plan/018_app_ts_split_ar286.md`. Plan 018 (strategy, target shape, per-file inventory, shared-helper mandate) is unchanged and remains the source of truth for *what* the split looks like. This file records *where execution actually stands*, the *decisions taken on 2026-06-21*, and the *exact action sequence* to finish. Where it conflicts with section 9 of 018, this file's sequencing wins.

- **Jira issue:** AR-286 (same)
- **Branch:** `feat/AR-286-app-ts-split` (head `839b9fb`)
- **Reviewer:** Marcos

---

## 1. Verified state (audited 2026-06-21)

A first bulk-extraction attempt (script-based) ran after PR 1 landed. PR 1 is good; the route extraction is half-done and needs targeted repair + wiring.

| Item | State |
|---|---|
| PR 1 — `shared/` | ✅ **Done & committed (`839b9fb`).** `shared/{auth-api,auth-session,auth-either,bundles,http,errors}.ts` git-tracked; `app.ts` imports from them (5 import lines). |
| `routes/` directory | Exists, **untracked (`??`)**. 18 files, each exports exactly one `registerXRoutes`. |
| Typecheck | `npx tsc --noEmit` → **6 errors, all in `routes/api-keys.ts`**. The other 17 route files compile clean. The original status summary's "missing imports across many files" / "`/admin/audience` route-end failures" are **stale** — only `api-keys.ts` is broken. |
| `routes/api-keys.ts` | **Corrupted.** Syntax-broken (TS1128/TS1005/TS1472) and contains the **wrong routes**: copies of `/usage`, `/dashboard`, `/settings/subscription` (belong to `me.ts`) and `/stripe/addon-checkout` (belongs to `stripe.ts`). **Missing all 4 real api-keys routes.** Those 4 wrong routes already exist correctly in `me.ts`/`stripe.ts`, so nothing is lost by deleting them here. |
| Route-set diff | `app.ts` 94 ↔ `routes/` 94. Identical set **except** the api-keys contamination (4 dupes present, 4 real `/keys*` absent). |
| `app.ts` | **Still owns all 94 routes inline; imports/registers nothing from `routes/`.** Current 4,606 LOC. The extraction is pure duplication right now — **nothing is wired**. |

Real `/keys*` handler locations in `app.ts` (for the verbatim lift): `/keys/usage` GET **3401**, `/keys` GET **3622**, `/keys` POST **3636**, `/keys/:id` DELETE **3655**.

---

## 2. Decisions (2026-06-21, Pedro)

1. **Sequencing → two batched passes (per plan 018).** Honor the PR2/PR3 split. Wiring is all-or-nothing *per route* (every module-registered route must be deleted from `app.ts` in the same change), so batch A and batch B are two surgical passes on `app.ts`, not one big delete.
2. **`api-keys.ts` repair → verbatim lift + clean imports only.** Handler bodies copied byte-for-byte from `app.ts`; only the import block / dead types (`CountRow`, etc.) are tidied to match what the 4 handlers actually use.
3. **Verification → typecheck + lint + `printRoutes` + full e2e smoke.** The e2e curl sweep from `docs/TESTING/api-end-to-end-2026-06-12.md` is the final regression net (verbatim moves are otherwise unproven by typecheck alone).
4. **Commits → per logical step**, on `feat/AR-286-app-ts-split`. **Commit only — no push.** No destructive ops.
5. **Stack for e2e → `make stack-up-full`** (minimal + mocks, includes the AR-322 stripe-mock) so `/stripe/*` routes resolve deterministically without live keys. `stack-up-min` would leave Stripe routes hitting nothing.

---

## 3. Action sequence

**Step A — Repair `routes/api-keys.ts`** (the only broken file)
- Delete the corrupted body (stripe/me code spliced in).
- Verbatim-lift the 4 real handlers from `app.ts` (3401 / 3622 / 3636 / 3655) into `registerApiKeysRoutes(app)`.
- Rederive the import block for those handlers; drop dead types.
- Gate: `make app-typecheck` → 0 errors. → **commit.**

**Step B — Batch A wiring** (`system, auth, me, api-keys, reports, stripe, webhooks, admin`)
- Add `import { registerXRoutes }` + `registerXRoutes(app)` for batch A only; leave batch B inline.
- Delete batch A's inline `app.X(...)` blocks from `app.ts` (mandatory — else `FST_ERR_DUPLICATE_ROUTE` on boot). Remove imports left unused.
- Gate: `make app-typecheck`, `make app-lint`, and a host-side `buildApp().printRoutes()` check (no container) showing batch A via modules + batch B inline, **94 routes once each**. → **commit.**

**Step C — Batch B wiring** (remaining 10: `signals, scoring, portfolios, orgs, org-members, org-bundles, org-presets, org-cohorts, org-methodology, intelligence`)
- Wire + delete inline as in Step B. `app.ts` lands at ~150 LOC.
- Gate: typecheck, lint, `printRoutes` = **94 once each**. → **commit.**

**Step D — Full e2e smoke** (final regression net)
- `make build-api-image` → `make stack-up-full` → run the `docs/TESTING/api-end-to-end-2026-06-12.md` curl sweep → `make stack-down-full`.
- Gate: same status codes / response shapes as the doc. If the WSL container engine is unreachable, stop and report rather than guess.

---

## 4. Mapping to plan 018 section 9

- Section 9 PR 1 → done.
- Step A + Step B together = section 9 **PR 2** (batch A).
- Step C = section 9 **PR 3** (batch B).
- Section 9 PR 4 (test relocation) is unchanged and still follows.

---

_Author: Claude Code, 2026-06-21. Audited current branch `feat/AR-286-app-ts-split` (head `839b9fb`); decisions captured from Pedro's answers same day. No code changed while writing this plan._
