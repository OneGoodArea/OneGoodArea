# API end-to-end test — 2026-06-08

**Why:** verify all Phase 1 + Phase 2 endpoints work as expected before building the dashboard on top of them. Catch shape drift, broken endpoints, ADR mismatches NOW so Phase 1 build doesn't fight broken contracts.

**Setup:**
- Local stack via `make stack-up-min` (postgres + neon-proxy + api + web)
- Containers: `compose-postgres-1`, `compose-neon-proxy-1`, `compose-api-1`, `compose-web-1`, `compose-pgadmin-1`
- API base: `http://localhost:8080`
- Web base: `http://localhost:3000`
- pgAdmin: `http://localhost:8888`

**Scope:** 24 endpoints — 15 Phase 1 (auth / account / orgs) + 9 Phase 2 (signal-first products).

**Legend:**
- ✅ works as expected, matches contract
- ⚠️ works but drifted from contract or ADR (details inline)
- ❌ broken / wrong / missing
- 🚧 dependency-blocked (can't test in isolation yet)

---

## 0. Smoke tests (pre-flight)

| Endpoint | Method | Status | Result |
|---|---|---|---|
| `/health` | GET | 200 | ✅ `{"status":"ok"}` |
| `/v1/meta` | GET | 200 | ✅ `{"service":"onegoodarea-api","phase":"1-reports-vertical","intents":["moving","business","investing","research"]}` |
| `/v1/me` (unauth) | GET | 401 | ✅ Correctly rejects with `{"error":"Missing API key. Use: Authorization: Bearer oga_..."}` |
| `localhost:3000` | GET | 200 | ✅ Web serving |
| `localhost:8888` | GET | 302 | ✅ pgAdmin redirecting to login |

**Pre-flight verdict: ALL GREEN.** Stack is healthy. Proceeding to auth flow.

---

## Phase 1 — Auth + account + orgs (15 endpoints)

### Auth flow

#### `POST /auth/register`

_[pending — see findings below as test runs]_

