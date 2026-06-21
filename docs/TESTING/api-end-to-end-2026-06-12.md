# API end-to-end test — 2026-06-12

**Why:** real-world validation of every public API endpoint against production from the `ptengelmann@gmail.com` account before the app.ts split. Catch contract drift, broken endpoints, slow paths, missing typed errors NOW so the refactor has a regression net.

**Setup:**
- API base: `https://onegoodarea.onrender.com` (Render prod)
- Auth: real `oga_*` key from ptengelmann@gmail.com (business plan, owner of personal org `org_user_1772941953664_qber`)
- Test plane: live prod database (Neon)
- Date: 2026-06-12

**Legend:**
- ✅ works as expected, matches contract
- ⚠️ works but drifted from contract / slow / shape off
- ❌ broken / wrong / missing
- 🚧 dependency-blocked
- ⏭️ deliberately skipped (destructive or out of scope)

---

## 🚨 TOP-LEVEL FINDINGS (read first)

1. **Render prod is STALE.** The deploy on `onegoodarea.onrender.com` is behind `main`. Concrete proof:
   - `POST /v1/webhooks/<id>/rotate-secret` returns **404 "Route not found"** — AR-283 (merged days ago) is NOT live.
   - `POST /v1/orgs/<id>/methodology` returns **404 "Route not found"** at both POST and PATCH — the mutation endpoint either uses a different verb in the deployed build, or hasn't shipped.
   - `POST /v1/query` with `get_area` and a **place name** (e.g. `area: "Manchester"`) returns **500** — would expect 200 (single-hit place) or 422 ambiguous_location (multi-hit). This is the AR-267 codepath; with the latest code it should never 500 — points at a stale deploy that has an old executor calling code that no longer exists, OR a runtime error in `geocodeAreaStrict`.

2. **🚨 SECURITY: `POST /v1/orgs/<id>/members` accepts arbitrary `user_id` without verifying it exists.** I posted `user_id: "nonexistent_user"` and got **201 `{"ok": true}`** — the row was actually persisted in `org_members`. Could be used to pollute org membership with fake users, or potentially escalate (if a future feature trusts `org_members.user_id` as a valid `users.id` for cross-table joins). Endpoint should FK-validate against `users` or return 404.

3. **🚨 LATENCY: invalid place-name resolution paths are slow.**
   - `GET /v1/area?postcode=BAD` — **15.5s** (falls back to a place search and reverse-geocode chain)
   - `POST /v1/score area=BAD` — **30.4s**
   - These would time out for any real integration. Place-name fallback for clearly-invalid inputs needs early rejection.

4. **⚠️ Date format drift.** `created_at` / `updated_at` on org-related endpoints return `Date.toString()` output (e.g. `"Fri Jun 12 2026 17:28:15 GMT+0000 (Coordinated Universal Time)"`) instead of ISO-8601 strings. Other endpoints (reports, portfolios) return clean ISO. Inconsistent across the surface.

5. **⚠️ Bundle scoping is by API-key org, not URL-path org.** `POST /v1/score?bundle=<slug>` looks up the bundle in the API key's owning org, regardless of which org the slug belongs to. Documented behaviour — but worth surfacing.

---

## 0. Smoke / pre-flight

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/health` | GET | 200 | 0.20s | ✅ `{"status":"ok"}` |
| `/v1/meta` | GET | 200 | 0.19s | ✅ `{service: "onegoodarea-api", phase: "1-reports-vertical", intents: [moving, business, investing, research]}` |
| `/v1/me` (unauth) | GET | 401 | 0.14s | ✅ Proper error message |
| `/v1/me` (auth) | GET | 200 | 1.36s | ✅ plan=`business`, generation=`v1`, engine=`2.0.2`, owner of `org_user_1772941953664_qber`. ⚠️ 1.36s is slow for a session-style endpoint — likely Render cold-start |

---

## 1. Account + meta

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/v1/me` | GET | 200 | 1.36s | ✅ (as above) |
| `/me/reports` | GET | 200 | 0.29s | ✅ Returns paginated list — multiple reports from 2026-04 to 2026-05 |
| `/me/activity` | GET | 401 | 0.18s | ⚠️ Session-auth only; not for API-key callers. Should arguably 403 or return a typed `session_auth_required` code. |
| `/usage` | GET | 401 | 0.17s | ⚠️ Session-auth only (same as above) |
| `/watchlist` | GET | 401 | 0.15s | ⚠️ Session-auth only (same as above) |
| `/keys` | GET | 401 | 0.15s | ⚠️ Session-auth only (same as above) |
| `/keys/usage` | GET | 401 | 0.16s | ⚠️ Session-auth only (same as above) |
| `/report/:id` | GET | 401 | 0.17s | ⚠️ Session-auth only (same as above) |

---

## 2. Signals + area data

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `GET /v1/area?postcode=M1+1AE` | GET | 200 | 1.55s | ✅ Full AreaProfile, all signals, engine=2.0.2 |
| `GET /v1/area?postcode=BAD` | GET | 200 | **15.5s** | 🚨 SHOULD BE 400 — silently falls back to a random Scotland coordinate (place-search ranks "Bad" somewhere). Honest error contract violated. |
| `GET /v1/signals/crime?postcode=M1+1AE` | GET | 200 | 1.08s | ✅ |
| `GET /v1/signals/property?postcode=SW1A+1AA` | GET | 200 | 0.93s | ✅ |
| `GET /v1/areas?signal=crime.total_12m&limit=3` | GET | 200 | 1.35s | ✅ Returns 3 ranked LSOAs |

---

## 3. Scoring

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `POST /v1/score area=M1+1AE preset=moving` | POST | 200 | 1.20s | ✅ score=69, dimensions=5 (safety_crime / schools / transport / amenities / cost) |
| `POST /v1/score area=SW1A+1AA preset=investing` | POST | 200 | 1.02s | ✅ score=20, dimensions=4 (price_growth / rental_yield / commercial / fundamentals) |
| `POST /v1/score area=BAD preset=moving` | POST | 200 | **30.4s** | 🚨 SHOULD BE 400 — accepted invalid place name, returned score=50 with confidence 0.4 on EVERY dimension (so it silently defaulted everything). Should reject. |
| `POST /v1/batch {areas:[...], preset:...}` | POST | 400 | 0.19s | ⚠️ Body shape wrong — wants `{items: [{area, intent}]}`. `intent` not `preset`. Legacy field name. |
| `POST /v1/batch {items: [{area, intent}]}` | POST | 400 | 0.20s | ⚠️ Validation still failed with "Each item must be { area: string, intent: string }" — needs further investigation, possibly intent enum mismatch |
| `POST /v1/score?bundle=<slug>` (own bundle) | POST | 404 | 0.28s | ⚠️ "Bundle not found in your org" — slug was in TEST org but API key is tied to PRIMARY org. Documented behaviour but surface it. |

---

## 4. Intelligence — query plane (AR-264)

### Programmatic mode (`{plan}`)

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `get_area area="M1 1AE"` (postcode) | 200 | 1.03s | ✅ plan_source=`client`, full profile |
| `get_area area="Manchester"` (place name, unambiguous) | **500** | 0.29s | 🚨 SHOULD BE 200 — single-hit place, executor should resolve and dispatch to getAreaProfile. AR-267 codepath breaking. |
| `get_area area="Brixton"` (place name, ambiguous) | **500** | 0.24s | 🚨 SHOULD BE 422 `ambiguous_location` with candidates. AR-267 ambiguity handling not surfacing. |
| `compare_areas areas=["M1 1AE","EC1A 1BB"]` | 200 | 1.21s | ✅ Both slots resolved, side-by-side |
| `rank_areas signal=deprivation.imd_decile limit=3` | 200 | 2.26s | ✅ Top 3 most-deprived LSOAs returned |
| `score_area area="SW1A 1AA" preset="investing"` | 200 | 0.94s | ✅ score=20 (matches `/v1/score`) |
| `find_peers target={postcode:"M1 1AE"}` | 200 | 0.77s | ✅ Resolves postcode, returns peers |
| `find_peers target={area:"Manchester"}` (place name) | **500** | 0.23s | 🚨 Same place-name bug as get_area |
| `find_insights signal_key=crime.total_12m_peer_relative_z` | 200 | 0.33s | ✅ Top z-score LSOAs returned |
| `find_forecast target={postcode:"M1 1AE"}` | 200 | 0.24s | ✅ 6-point projection. ⚠️ Very wide confidence band (lower≈139k, upper≈528k for a ~334k projection) — suggests low r² on this fit |

### NL mode (`{question}`)

| Question | Status | Latency | Result |
|---|---|---|---|
| `"tell me about M1 1AE"` (postcode) | 200 | 3.11s | ✅ planner emits `get_area`, plan_source=`nl` |
| `"most deprived areas in Manchester"` | 200 | 2.00s | ✅ planner emits `rank_areas` with `lad=E08000003` (Manchester), perfect |
| `"tell me about Brixton"` | **500** | 1.66s | 🚨 Should be 422 ambiguous_location. Same root cause as programmatic place-name path. |
| `"give me crime data for Brixton"` | **500** | 2.09s | 🚨 Same |

**NL mode VERDICT:** planner LLM works (translates simple questions correctly). Executor crashes for any plan resolving a non-postcode area.

---

## 5. Portfolios

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/portfolios` | 200 | 0.29s | ✅ Empty list initially |
| `POST /v1/portfolios {name}` | 201 | 0.33s | ✅ Returns `{id, name, area_count: 0}` |
| `POST /v1/portfolios/:id/areas {areas: ["M1 1AE"]}` | 400 | 0.20s | ⚠️ Body shape — wants `{areas: [{area: "M1 1AE"}]}`. Element shape is `{area: string}`, not bare string. |
| `GET  /v1/portfolios/:id` | 200 | 0.24s | ✅ Full record with `areas: []` |
| `POST /v1/portfolios/:id/changes` | 200 | 0.29s | ✅ Returns `{areas_checked: 0, material_count: 0, changes: []}` — empty diff |
| `POST /v1/portfolios/:id/enrich` | ⏭️ | — | Skipped — would generate real reports on each area (charge usage) |
| `DELETE /v1/portfolios/:id` | 200 | 0.25s | ✅ `{deleted: true}` |

---

## 6. Orgs — my orgs

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/orgs` | 200 | 0.28s | ✅ Returns user's primary org. ⚠️ `created_at` as `Date.toString()` not ISO |
| `GET  /v1/orgs/:id` | 200 | 0.24s | ✅ |
| `POST /v1/orgs {name}` | 201 | 0.24s | ✅ Created test org `org_1781285295447_naar12`. ⚠️ NO `DELETE /v1/orgs/:id` endpoint exists — test org cannot be cleaned up via API. **Cleanup task: delete row manually via SQL.** |
| `PATCH /v1/orgs/:id {display_name}` | 200 | 0.25s | ✅ Persisted |
| `PATCH /v1/orgs/:id {logo_url}` | 200 | 0.25s | ✅ Persisted (AR-284 deployed — column exists) |

---

## 7. Orgs — children (bundles, presets, cohorts, members, invitations, methodology)

### Bundles

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `POST /v1/orgs/:id/bundles` | 201 | 0.39s | ✅ Created |
| `GET  /v1/orgs/:id/bundles` | 200 | 0.25s | ✅ |
| `PATCH /v1/orgs/:id/bundles/:bid` | 200 | 0.24s | ✅ Rename persisted |
| `DELETE /v1/orgs/:id/bundles/:bid` | 200 | 0.24s | ✅ |
| `GET /v1/orgs/:id/bundles/:slug` | 404 | 0.23s | ⚠️ Lookup by slug returns 404 even for own bundle — the `:bundleId` segment is matched as ID, not slug. AR-274 backend changes might not be fully live? Or by-slug is only on `/v1/score?bundle=` |

### Presets

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `POST /v1/orgs/:id/presets {preset: "investing"}` | 400 | 0.26s | ⚠️ Body shape — wants `base_preset` not `preset`. Error message helpfully lists the enum. |
| `POST /v1/orgs/:id/presets {base_preset: "investing", weights}` | 201 | 0.70s | ✅ |
| `GET  /v1/orgs/:id/presets` | 200 | 0.25s | ✅ |
| `DELETE /v1/orgs/:id/presets/:pid` | 200 | — | ✅ |

### Cohorts

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `POST /v1/orgs/:id/cohorts {name, geo_codes}` | 201 | 0.24s | ✅ |
| `GET  /v1/orgs/:id/cohorts` | 200 | 0.22s | ✅ |
| `DELETE /v1/orgs/:id/cohorts/:cid` | 200 | 0.21s | ✅ |

### Members

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/orgs/:id/members` | 200 | 0.26s | ✅ |
| `POST /v1/orgs/:id/members {user_id, role}` | **201** | 0.25s | 🚨 **SECURITY** — accepted `user_id: "nonexistent_user"` and inserted the row. Should validate FK to `users` table. |
| `DELETE /v1/orgs/:id/members/:userId` | 200 | — | ✅ Successfully removed the bogus member |
| `PATCH /v1/orgs/:id/members/:userId` | ⏭️ | — | Skipped — no other members to test against |

### Invitations

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/orgs/:id/invitations` | 200 | 0.23s | ✅ Returns pending invites on primary org (1 row, narister@yahoo.com.br) |
| `POST /v1/orgs/:id/invitations` | ⏭️ | — | Skipped — would send a real email |
| `DELETE /v1/orgs/:id/invitations/:invitationId` | ⏭️ | — | Skipped — no test invite to safely revoke |

### Methodology

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/orgs/:id/methodology` | 200 | 0.23s | ✅ `{engine_version: null, pinned: false}` |
| `PATCH /v1/orgs/:id/methodology` | **404** | 0.18s | 🚨 "Route not found" — mutation endpoint either not registered, or uses a different verb |
| `POST  /v1/orgs/:id/methodology` | **404** | 0.22s | 🚨 Same — try other verbs? Or feature not deployed? |

---

## 8. Webhooks

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET  /v1/webhooks` | 200 | 0.38s | ✅ Empty list |
| `POST /v1/webhooks {url: http://localhost...}` | 400 | 0.21s | ✅ Properly rejected non-HTTPS — "Webhook URL must use HTTPS" |
| `POST /v1/webhooks {url: https://example.com/oga-e2e, events}` | 201 | 0.22s | ✅ Returns id + secret (one-time reveal) |
| `GET  /v1/webhooks` (after create) | 200 | 0.22s | ✅ Shows subscription, secret hidden |
| `POST /v1/webhooks/:id/rotate-secret` | **404** | 0.14s | 🚨 "Route not found" — **AR-283 NOT deployed.** |
| `DELETE /v1/webhooks/:id` | 200 | 0.22s | ✅ `{status: "revoked"}` |

---

## 9. Widget

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `GET /widget?postcode=M1+1AE&intent=moving` (auth) | 404 | 0.18s | ✅ "No cached data available for this location. Generate a report at https://www.onegoodarea.com first." Helpful error. |

---

## 10. Reports

| Endpoint | Status | Latency | Result |
|---|---|---|---|
| `POST /v1/report` | ⏭️ | — | Skipped — would generate real report, charge usage |
| `GET /report/:id` (session) | 401 | 0.17s | Session-only |
| `GET /me/reports` | 200 | 0.29s | ✅ Returns paginated history |

---

## 11. Cleanup state

- ✅ Test portfolio: DELETED
- ✅ Test webhook: REVOKED via DELETE
- ✅ Test bundles (x2): DELETED
- ✅ Test preset: DELETED
- ✅ Test cohort: DELETED
- ✅ Bogus org member: REMOVED via DELETE
- ⚠️ Test org `org_1781285295447_naar12`: **STILL EXISTS** — no `DELETE /v1/orgs/:id` endpoint. Manual SQL cleanup needed:
  ```sql
  DELETE FROM org_members WHERE org_id = 'org_1781285295447_naar12';
  DELETE FROM orgs        WHERE id     = 'org_1781285295447_naar12';
  ```

---

## 12. Skipped / out-of-scope

| Endpoint | Why |
|---|---|
| `POST /auth/register` | Would create a throwaway account in prod |
| `POST /auth/reset-password` | Mutates session |
| `POST /auth/forgot-password` | Sends an email |
| `POST /auth/resend-verification` | Sends an email |
| `POST /settings/password` | Would force re-auth |
| `POST /settings/delete-account` | Destructive on the test account |
| `POST /stripe/*` | Would mutate Stripe state |
| `POST /cron/rescore` | Cron-only |
| `POST /stripe/webhook` | Stripe-signed; can't fake |
| `POST /track` | Tracking pixel; no return value to assert |
| `POST /v1/report` | Would generate a real report + charge usage |
| `POST /v1/portfolios/:id/enrich` | Would generate real reports on each area |
| `POST /v1/orgs/:id/invitations` | Would send a real email to a real address |
| `POST /v1/invitations/:token/accept` | No test invitation to accept |

---

## 🎯 ACTION ITEMS (sorted by priority)

| # | Severity | Item | Where |
|---|---|---|---|
| 1 | 🚨 SEC | `POST /v1/orgs/:id/members` accepts arbitrary `user_id` without validation — could pollute org membership / be abused | `apps/api/src/app.ts` POST /v1/orgs/:id/members handler |
| 2 | 🚨 P0  | Render prod is on a stale deploy — at minimum AR-283 (rotate-secret) is missing | Render dashboard — check last deploy + redeploy from main |
| 3 | 🚨 P0  | `/v1/query` returns 500 for ANY get_area/find_peers with a place name (non-postcode) input — masks AR-267 ambiguous_location entirely | Investigate after deploy refresh; if still broken, `geocodeAreaStrict` is throwing uncaught |
| 4 | 🚨 P1  | `GET /v1/area?postcode=BAD` silently accepts (15s) — same for `POST /v1/score area=BAD` (30s). Validate input postcode shape before falling back to place search. | `apps/api/src/modules/signals/data-sources/postcodes.ts` + `area-profile.ts` |
| 5 | ⚠️ P2  | Date format drift — orgs return `Date.toString()`, others ISO. Pick one. | `apps/api/src/modules/orgs/index.ts` |
| 6 | ⚠️ P2  | `POST /v1/orgs/:id/methodology` returns 404 — mutation surface missing or different verb | Check `apps/api/src/app.ts` |
| 7 | ⚠️ P2  | No `DELETE /v1/orgs/:id` endpoint — leaves test orgs orphaned. Sets a low ceiling for self-service org management. | `apps/api/src/app.ts` |
| 8 | ⚠️ P3  | `find_forecast` r² on M1 1AE / property.median_price is low → very wide confidence band (lower 139k, upper 528k for 334k projection). Forecast doc should surface r²<X warning. | renderer side; surfaces in `/dashboard/intelligence` if AR-264 ever rebuilt for workbench |
| 9 | ⚠️ P3  | `POST /v1/batch` body shape uses legacy `{items: [{area, intent}]}` with `intent` instead of `preset` — drift from rest of API | `apps/api/src/app.ts` POST /v1/batch handler |

---

_Test run performed by Claude Code, signed in as ptengelmann@gmail.com, against prod 2026-06-12 ~17:30 UTC._
