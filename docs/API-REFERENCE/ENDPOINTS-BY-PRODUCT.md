# Endpoints by Product

Complete catalog of 72 endpoints (73 HTTP operations with CORS) grouped by the four products + cross-cutting Levers + legacy/dashboard report API + webhooks + Stripe + auth + account. 

**Auth modes:** **API** (Bearer token), **Session** (JWT cookie), **Public** (none), **CRON** (Bearer CRON_SECRET).

**Dark-flag:** Routes behind `OGA_SIGNALS_API=true` return 404 when disabled.

---

## Signals (3)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/area?postcode=…` | API | Full signal profile for one area |
| GET | `/v1/signals/:category?area=…` | API | Category-scoped subset |
| GET | `/v1/areas?signal=…&country=…` | API | Cross-area filter + rank |

**Gate:** `requireApiAccessWithOrg` (API key + rate limit + org context).

---

## Scores (1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/score` | API | `{area, preset \| weights \| preset_id}` — deterministic composite |

**Gate:** `requireApiAccess`.

---

## Monitor (7)

Dark-flagged behind `OGA_SIGNALS_API=true`. Return 404 when disabled.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/portfolios` | API | Create a portfolio |
| GET | `/v1/portfolios` | API | List caller's portfolios |
| GET | `/v1/portfolios/:id` | API | One portfolio + member areas |
| DELETE | `/v1/portfolios/:id` | API | Delete a portfolio |
| POST | `/v1/portfolios/:id/areas` | API | Bulk add tracked areas (max 100) |
| POST | `/v1/portfolios/:id/enrich` | API | Full signal enrichment for every area |
| POST | `/v1/portfolios/:id/changes` | API | Diff vs baseline, fires webhooks |

**Gate:** `guardSignals` helper (flag + `requireApiAccess`).

---

## Intelligence (4)

Dark-flagged behind `OGA_SIGNALS_API=true`. Return 404 when disabled.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/query` | API | Typed query plane (programmatic OR natural language) |
| POST | `/v1/peers` | API | k-NN over normalized signals; default k=20 |
| POST | `/v1/insights` | API | Anomaly screening by peer-relative z-score |
| POST | `/v1/forecast` | API | Linear projection for one (signal, area) |

**Gate:** `requireApiAccessWithOrg`.

---

## Levers: Org Management (25)

All require API key auth + org membership.

### Org CRUD (4)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/orgs` | API | Create org; caller becomes owner |
| GET | `/v1/orgs` | API | List orgs caller is member of |
| GET | `/v1/orgs/:id` | API | Fetch org by ID |
| PATCH | `/v1/orgs/:id` | API | Update org metadata (owner-gated) |

### Members (3)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/orgs/:id/members` | API | List members + roles |
| POST | `/v1/orgs/:id/members` | API | Invite member (owner-gated) |
| DELETE | `/v1/orgs/:id/members/:userId` | API | Remove member (owner-gated) |

### Bundles (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/orgs/:id/bundles` | API | Create signal bundle |
| GET | `/v1/orgs/:id/bundles` | API | List bundles in org |
| GET | `/v1/orgs/:id/bundles/:bundleId` | API | Fetch one bundle |
| PATCH | `/v1/orgs/:id/bundles/:bundleId` | API | Update bundle |
| DELETE | `/v1/orgs/:id/bundles/:bundleId` | API | Delete bundle |

### Presets (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/orgs/:id/presets` | API | Create score preset |
| GET | `/v1/orgs/:id/presets` | API | List presets in org |
| GET | `/v1/orgs/:id/presets/:presetId` | API | Fetch one preset |
| PATCH | `/v1/orgs/:id/presets/:presetId` | API | Update preset |
| DELETE | `/v1/orgs/:id/presets/:presetId` | API | Delete preset |

### Methodology (3)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/orgs/:id/methodology` | API | Fetch methodology pin (if set) |
| PUT | `/v1/orgs/:id/methodology` | API | Pin a specific methodology version |
| DELETE | `/v1/orgs/:id/methodology` | API | Clear the methodology pin |

### Cohorts (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/orgs/:id/cohorts` | API | Create cohort |
| GET | `/v1/orgs/:id/cohorts` | API | List cohorts in org |
| GET | `/v1/orgs/:id/cohorts/:cohortId` | API | Fetch one cohort |
| PATCH | `/v1/orgs/:id/cohorts/:cohortId` | API | Update cohort |
| DELETE | `/v1/orgs/:id/cohorts/:cohortId` | API | Delete cohort |

---

## Legacy Report API (6)

### Report Generation & History

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/report` | API | Full report (score + AI narrative) — v1 consumer entry |
| POST | `/v1/batch` | API | Up to `BATCH_MAX_ITEMS` reports per call |
| GET | `/v1/me` | API | Plan + entitlements + org branding + key allowlist |
| GET | `/me/reports` | Session | List caller's recent reports (dashboard) |
| POST | `/report` | Session | Generate report from dashboard (browser); sends email |
| DELETE | `/report/:id` | Session | Delete a specific report |

---

## Webhooks (3)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/webhooks` | API | Create subscription (`signal.changed`, `report.created`, …) |
| GET | `/v1/webhooks` | API | List active subscriptions |
| DELETE | `/v1/webhooks/:id` | API | Revoke subscription |

---

## Stripe (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/stripe/webhook` | Public | Webhook from Stripe (signature verified) |
| POST | `/stripe/portal` | Session | Redirect to Stripe customer portal |
| POST | `/stripe/checkout` | Session | Create checkout session for plan upgrade |
| POST | `/stripe/cancel` | Session | Cancel subscription |
| POST | `/stripe/addon-checkout` | Session | Create checkout for MCP/addon purchase |

---

## Auth: Credentials Flows (4)

Public endpoints for pre-login credential registration & password reset. IP rate-limited.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Register credentials user + send verification email |
| POST | `/auth/resend-verification` | Public | Re-send verification email (3/hour throttle) |
| POST | `/auth/forgot-password` | Public | Request password reset email (3/hour throttle, always 200) |
| POST | `/auth/reset-password` | Public | Complete password reset with token |

---

## Account Dashboard (9)

Session-authenticated endpoints for logged-in user account management.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/usage` | Session | API usage dashboard (requests this month, daily breakdown, keys) |
| GET | `/settings/subscription` | Session | Current subscription + plan details |
| GET | `/keys` | Session | List caller's API keys |
| GET | `/keys/usage` | Session | Detailed API key usage analytics |
| POST | `/keys` | Session | Create new API key (requires API plan access) |
| DELETE | `/keys/:id` | Session | Revoke an API key |
| POST | `/settings/password` | Session | Change password (credentials accounts only) |
| DELETE | `/settings/delete-account` | Session | Permanently delete user + all data (multi-statement transaction) |
| GET | `/watchlist` | Session | List caller's saved areas |
| POST | `/watchlist` | Session | Save an area (postcode + optional label/intent) |
| DELETE | `/watchlist/:id` | Session | Remove an area from watchlist |

---

## Public Health & Tracking (4)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | Public | Liveness probe (returns `{status: "ok"}`) |
| GET | `/v1/meta` | Public | Service metadata + contracts version |
| POST | `/track` | Public | Analytics pageview (device + country + referrer; never fails) |
| GET | `/widget` | Public | Cached area summary for postcode (rate-limited by origin) |

**CORS preflight:**

| Method | Path | Auth | Notes |
|---|---|---|---|
| OPTIONS | `/widget` | Public | CORS preflight for widget |

---

## Cron (1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/cron/rescore` | CRON | Re-score top UK postcodes → report_history; `Bearer CRON_SECRET` auth; `?limit=N` `?dry_run=true` supported |

---

## Summary

| Category | Count |
|---|---|
| Signals | 3 |
| Scores | 1 |
| Monitor | 7 |
| Intelligence | 4 |
| Levers (Orgs) | 25 |
| Legacy Report | 6 |
| Webhooks | 3 |
| Stripe | 5 |
| Auth | 4 |
| Account Dashboard | 9 |
| Health & Tracking | 4 |
| CORS | 1 |
| Cron | 1 |
| **TOTAL** | **73** |

**Last updated:** June 3, 2026 | Verified against `apps/api/src/app.ts`
