# Plan: AR-458 — Full Playground Test Coverage (Tiered Rate Limits)

**Branch (plan phase):** `plan/AR-458-playground-tests`
**Implementation branch:** `test/AR-458-playground-rate-limit-tests` (created from this plan)
**Depends on:** AR-464 (DONE) — 3-tier playground rate limiter `checkPlaygroundLimits`.
**Status:** implemented (covered by worktree `ar-817-amenities-warm-cache`, WIP)

## Goal

AR-458 asks to "test all functionalities provided on /playground" and document
bugs as JIRA tickets. AR-464 added the tiered limiter; this plan covers testing
**100% of the tiers and scenarios** (the "1%" in the brief was a typo for 100%).

Three deliverables:

1. **Vitest unit** — extend `apps/api/tests/modules/playground/rate-limit.test.ts`
   to cover every tier + cross-tier ordering + boundary + env overrides.
2. **Vitest integration** — new `apps/api/tests/routes/playground.test.ts`
   exercising `/playground/token` and `/playground/proxy` end-to-end via
   `app.inject` (Fastify in-process), mocking only the DB + upstream so no
   network/Neon needed.
3. **E2E** — new `e2e/playground/` smoke that runs against the **container**
   stack and uses the AR-464 `make scripts-reset-playground-limit` target to
   clear the IP tier between cycles.

Plus: a **tickets-draft file** listing every bug found, reviewed with the user
BEFORE any JIRA is created.

## Current State (verified)

- `apps/api/src/modules/playground/rate-limit.ts` — 3 tiers:
  - Tier 1 cookie: `tc >= PLAYGROUND_COOKIE_TOTAL` (default 30) → `cookie_total`;
    `isNlCall && nc >= PLAYGROUND_COOKIE_NL` (default 3) → `cookie_nl`. No I/O.
  - Tier 2 per-IP daily: `rateLimit("playground:ip:{ip}", {max:60, window:24h})`
    → `ip_daily` with `retry_after`. Skipped if `ip` null. DB error = falls through.
  - Tier 3 global daily: `rateLimit("playground:global", {max:5000, window:24h})`
    → `global_daily` with `retry_after`. DB error = **fail-closed** (`global_daily`).
- `apps/api/src/routes/playground.ts` — `POST /playground/token` and
  `POST /playground/proxy`. Proxy returns 429 + `Retry-After` on limit.
- Existing unit test: `tests/modules/playground/rate-limit.test.ts` (mocks
  `rateLimit`). Covers: under-limit, cookie caps, IP cap, IP DB-fail fallthrough,
  null IP skip, global cap, global DB-fail closed. **No boundary (N vs N+1), no
  env-override for IP/global, no `retry_after` exactness, no route-level tests.**
- AR-464 scripts exist: `scripts/reset-playground-rate-limit.mjs`,
  `build/targets-scripts.mk` → `make scripts-reset-playground-limit` (dry-run +
  `--confirm`), `make scripts-bootstrap-test-key`.
- Whitelist endpoints (`whitelist.ts`): only `POST /v1/query` is `isNl:true`;
  all others are non-NL. Body/response size caps present.

## Known bug (candidate ticket, NOT yet filed)

In `/playground/proxy` response (playground.ts:229,231), `calls_remaining` /
`nl_calls_remaining` recompute limits via `parseInt(process.env.PLAYGROUND_* ?? default)`
at **response time**, instead of using the effective limit applied during the
check. Effects:
- Override of `PLAYGROUND_COOKIE_TOTAL`/`PLAYGROUND_COOKIE_NL` is ignored in the
  returned remaining counts (the check uses them, the response doesn't).
- If `tc`/`nc` were derived from a session minted under different limits, the
  remaining math is inconsistent.
A Vitest integration test will assert the response `session.calls_remaining`
equals `limit - tc` using the SAME effective limit. Filed only after the
tickets-draft file is reviewed.

---

## Deliverable 1 — Unit tests (extend existing file)

File: `apps/api/tests/modules/playground/rate-limit.test.ts`

Add cases (keep existing, add):
- **Cookie boundary**: `tc = cookieTotal-1` passes; `tc = cookieTotal` fails
  `cookie_total`. Same for `nc` with `isNlCall:true` at `cookieNl-1`/`cookieNl`.
- **Cookie NL isolation**: NL cap reached blocks only NL calls; non-NL still
  succeeds (already present — keep, strengthen with boundary).
- **Tier ordering**: with both cookie ok and IP ok but global failing →
  `global_daily` (proves order). With cookie ok, IP failing → `ip_daily`
  returned before global is evaluated (assert global `rateLimit` NOT called when
  IP fails — i.e. first failing tier wins).
- **IP env override**: `PLAYGROUND_IP_DAILY=2` with IP mock failing on 3rd call
  → `ip_daily`. `PLAYGROUND_GLOBAL_DAILY=2` → `global_daily`.
- **Retry-After correctness**: when IP/global fails, `retry_after` ≈
  `ceil((now + window) - now)` within a small delta (>0 and ≤ window).
- **null ip skips tier2**: already present — keep; add assertion that tier3
  identifier is exactly `playground:global`.
- **IP db-error resilience**: tier2 rejects → still ok via tier3 (present — keep).
- **global db-error fail-closed**: present — keep.

## Deliverable 2 — Integration tests (new file)

File: `apps/api/tests/routes/playground.test.ts`
Pattern from `tests/routes/system.test.ts`: `buildApp()` + `app.inject`, mock
`@/infrastructure/db/client` (sql) and `rateLimit` (route imports rate-limit through
the module — mock `@/modules/playground/rate-limit.checkPlaygroundLimits` so we can
force each failure reason deterministically). Set required env:
`PLAYGROUND_COOKIE_SECRET` (32+), `PLAYGROUND_API_KEY`, `TURNSTILE_SECRET_KEY`
absent (stub mode), `API_INTERNAL_URL`/`PORT` not needed (upstream fetched —
mock `globalThis.fetch` for the proxy forward to avoid real network).

Cases:
1. **POST /playground/token** — 200, returns `session_id`, sets `Set-Cookie`
   `oga_playground`, `turnstile_stub:true` when Turnstile unconfigured.
2. **proxy without session cookie** — 401 `no_session`.
3. **proxy disallowed endpoint** (e.g. `POST /v1/admin`) — 400
   `endpoint_not_whitelisted`.
4. **proxy body too large** vs `maxBodyBytes` — 413 `body_too_large`.
5. **proxy tier1 cookie_total** — mock `checkPlaygroundLimits` →
   `{ok:false, reason:"cookie_total"}`; expect 429, `code:"rate_cookie_total"`,
   `Retry-After` absent.
6. **proxy tier2 ip_daily** — mock returns `reason:"ip_daily", retry_after:600`;
   expect 429, `code:"rate_ip_daily"`, `Retry-After: "600"`.
7. **proxy tier3 global_daily** — mock `reason:"global_daily", retry_after:120`;
   expect 429, `Retry-After: "120"`.
8. **proxy success path** — mock check ok, mock `fetch` returning 200 with JSON;
   expect 200, envelope `{endpoint, upstream_status, latency_ms, response,
   session}`. Assert `Set-Cookie` is re-issued (counters incremented).
9. **proxy success updates cookie counters** — feed a signed session cookie with
   `tc=0`, after success the returned `Set-Cookie` decodes to `tc=1`.
10. **BUG test (Deliverable bug)**: with `PLAYGROUND_COOKIE_TOTAL=5` set, session
    `tc=3`, mock check ok + fetch 200, assert response
    `session.calls_remaining === 2` (5-3), NOT 27 (30-3). This catches the
    at-response-time env recompute bug.
11. **non-2xx upstream does NOT consume quota** — mock check ok, fetch returns 400;
    assert no new `Set-Cookie` with incremented counters (quota only on 2xx).
12. **upstream fetch throw / 502** — expect 502 `upstream_error`.
13. **missing PLAYGROUND_API_KEY** — 503 `playground_key_missing`.

## Deliverable 3 — E2E (container smoke)

New: `e2e/playground/playground.e2e.ts` (follow existing e2e harness pattern —
check `e2e/` for baseUrl/runner conventions).
- Run the full container stack (`make` up) or point at running API.
- Flow: `make scripts-bootstrap-test-key` to mint a test key + set
  `PLAYGROUND_API_KEY`. Get a token via `POST /playground/token`. Loop
  `POST /playground/proxy {method,path:"/v1/area?postcode=..."}` to drive:
  - cookie tier: exhaust 30 calls, assert 429 `rate_cookie_total`, then issue a
    **new token** (cookie rotation) and confirm 429 `rate_ip_daily` kicks in
    (proves tier2 anti-rotation).
  - between IP cycles run `make scripts-reset-playground-limit ARGS="--ip <ip>
    --confirm"` to clear `playground:ip:{ip}` rows, proving the AR-464 reset
    script works end-to-end.
  - NL sub-cap: call `POST /v1/query` 3x → 429 `rate_cookie_nl`; non-NL calls
    keep working.
- Assert rate-limit response headers (`Retry-After`, `X-RateLimit-*`) present.

## Deliverable 4 — Tickets draft (review before JIRA)

File: `docs/PLANS/AR-458-playground-test-tickets.md`
Lists, per finding: title, severity, reproduction (test name or manual steps),
file:line, and proposed JIRA summary. Currently the only candidate is the
`calls_remaining`/`nl_calls_remaining` response bug (playground.ts:229-231).
User reviews this file; only then are JIRAs created (under the current sprint).

## Out of scope

- Changing the limiter logic (only AR-464's; we test it).
- Changing the `calls_remaining` bug — test + ticket only, fix is a separate ticket.
- Performance / load testing.

## Verification

- `cd apps/api && npm test` — all new + existing playground tests green.
- `npm run typecheck` — clean.
- E2E: `make` container up + run `e2e/playground` smoke; reset script exercised.
- Coverage: playground route + rate-limit modules included; thresholds in
  vitest.config.ts not violated.
