# Endpoints by Product

Complete catalog of the HTTP surface, about **104 handler registrations**
across the route modules in `apps/api/src/routes/`, grouped by the four
products plus cross-cutting Levers, webhooks, Stripe, auth, account and
platform.

**Auth modes:** **API** (Bearer token), **Session** (JWT cookie),
**Public** (none), **CRON** (Bearer `CRON_SECRET`).

**Dark flag:** the four product families (Signals, Scores, Monitor,
Intelligence) sit behind `signalsApiEnabled` (env `OGA_SIGNALS_API`) and
return 404 when disabled.

---

## Signals (3)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/area?postcode=…` | API | Full signal profile for one area |
| GET | `/v1/signals/:category?area=…` | API | Category-scoped subset |
| GET | `/v1/areas?signal=…&country=…` | API | Cross-area filter + rank |

**Gate:** flag + `requireApiAccessWithOrg`.

---

## Scores (1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/score` | API | `{area, preset \| weights \| preset_id}` deterministic composite |

**Gate:** flag + `requireApiAccessWithOrg`.

---

## Monitor (8)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/portfolios` | API | Create a portfolio |
| GET | `/v1/portfolios` | API | List caller's portfolios |
| GET | `/v1/portfolios/:id` | API | One portfolio + member areas |
| DELETE | `/v1/portfolios/:id` | API | Delete a portfolio |
| POST | `/v1/portfolios/:id/areas` | API | Bulk add tracked areas (max 100) |
| POST | `/v1/portfolios/:id/enrich` | API | Full signal enrichment for every area |
| POST | `/v1/portfolios/:id/changes` | API | Diff vs baseline, fires webhooks |
| GET | `/v1/portfolios/:id/changes` | API | Read-only diff, no webhooks (AR-399) |

**Gate:** flag + `requireApiAccess` / `requireApiAccessWithOrg`.

---

## Intelligence (4)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/query` | API | Typed query plane (programmatic OR natural language) |
| POST | `/v1/peers` | API | k-NN over normalized signals; default k=20 |
| POST | `/v1/insights` | API | Anomaly screening by peer-relative z-score |
| POST | `/v1/forecast` | API | Linear projection for one (signal, area) |

**Gate:** flag + `requireApiAccessWithOrg`.

---

## Webhooks (4)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/webhooks` | API | Create subscription (`signal.changed`, …) |
| GET | `/v1/webhooks` | API | List active subscriptions |
| DELETE | `/v1/webhooks/:id` | API | Revoke subscription |
| POST | `/v1/webhooks/:id/rotate-secret` | API | Rotate the signing secret |

---

## Levers: Org Management (31)

All via `authenticateEither` (session bridge token OR API key + org
membership).

### Org CRUD (5)

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/orgs` | Create org; caller becomes owner |
| GET | `/v1/orgs` | List orgs caller is a member of |
| GET | `/v1/orgs/:id` | Fetch org by ID (404 if not a member) |
| PATCH | `/v1/orgs/:id` | Update metadata / white-label (admin+) |
| DELETE | `/v1/orgs/:id` | Delete org (owner; personal org rejected, AR-399) |

### Members + Invitations (8)

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/orgs/:id/members` | List members + roles |
| POST | `/v1/orgs/:id/members` | Add member (admin+) |
| PATCH | `/v1/orgs/:id/members/:userId` | Change role (owner-guard rules) |
| DELETE | `/v1/orgs/:id/members/:userId` | Remove member |
| POST | `/v1/orgs/:id/invitations` | Invite by email |
| GET | `/v1/orgs/:id/invitations` | List pending invitations |
| DELETE | `/v1/orgs/:id/invitations/:invitationId` | Revoke an invitation |
| POST | `/v1/invitations/:token/accept` | Accept an invitation |

### Bundles (5)

`POST/GET /v1/orgs/:id/bundles`, `GET/PATCH/DELETE …/:bundleId`. Per-org
signal-key whitelists (admin+ to mutate).

### Presets (5)

`POST/GET /v1/orgs/:id/presets`, `GET/PATCH/DELETE …/:presetId`. Per-org
saved scoring weights over a base preset (admin+ to mutate).

### Cohorts (5)

`POST/GET /v1/orgs/:id/cohorts`, `GET/PATCH/DELETE …/:cohortId`. Per-org
peer candidate sets (admin+ to mutate).

### Methodology (3)

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/orgs/:id/methodology` | Fetch methodology pin (if set) |
| PUT | `/v1/orgs/:id/methodology` | Pin an engine version (owner) |
| DELETE | `/v1/orgs/:id/methodology` | Clear the pin (owner) |

---

## Entitlement (1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/me` | API | Plan + entitlements + org branding + key allowlist |

---

## API Keys (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/keys` | Session | List caller's API keys |
| GET | `/keys/usage` | Session | Detailed key usage analytics |
| POST | `/keys` | Session | Create a key (requires API plan access) |
| DELETE | `/keys/:id` | Session | Revoke a key |
| PATCH | `/keys/:id` | Session | Toggle `training_optout` |

---

## Account Dashboard (17)

Session-authenticated user account management.

| Method | Path | Notes |
|---|---|---|
| GET | `/me/activity` | Recent activity feed |
| GET | `/me/is-superuser` | Superuser check |
| GET | `/me/webhooks` | List webhooks (dashboard) |
| POST | `/me/webhooks` | Create webhook (dashboard) |
| DELETE | `/me/webhooks/:id` | Delete webhook |
| POST | `/me/webhooks/:id/rotate-secret` | Rotate webhook secret |
| GET | `/me/portfolios` | List portfolios (dashboard) |
| GET | `/me/score-usage` | Score usage summary |
| GET | `/me/org` | Caller's org |
| PATCH | `/me/org` | Update org (dashboard) |
| PATCH | `/me/profile` | Update profile |
| GET | `/usage` | API usage dashboard |
| GET | `/dashboard` | Dashboard aggregate |
| GET | `/settings/subscription` | Current subscription + plan |
| GET | `/watchlist` | List saved areas |
| POST | `/watchlist` | Save an area |
| DELETE | `/watchlist/:id` | Remove a saved area |

---

## Auth (11)

Public credential flows plus two session settings actions. IP
rate-limited where public.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Register + send verification |
| POST | `/auth/login` | Public | Credentials login |
| POST | `/auth/resend-verification` | Public | Re-send verification (throttled) |
| POST | `/auth/forgot-password` | Public | Request reset (throttled, always 200) |
| POST | `/auth/reset-password` | Public | Complete reset with token |
| POST | `/auth/magic-link/request` | Public | Request a magic link |
| GET | `/auth/check-email` | Public | Check email availability |
| POST | `/auth/check-email` | Public | Check email availability |
| POST | `/auth/oauth-callback` | Public | OAuth provider callback |
| POST | `/settings/password` | Session | Change password (credentials only) |
| DELETE | `/settings/delete-account` | Session | Permanently delete user + data |

---

## Admin (7)

Superuser-only analytics (session).

`GET /admin/analytics`, `/admin/traffic-analytics`, `/admin/audience`,
`/admin/usage`, `/admin/revenue`, `/admin/mcp-adoption`,
`/admin/training-corpus`.

---

## Stripe (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/stripe/webhook` | Public | Signature-verified webhook |
| POST | `/stripe/portal` | Session | Redirect to customer portal |
| POST | `/stripe/checkout` | Session | New subscription or plan swap |
| POST | `/stripe/cancel` | Session | Cancel at period end |
| POST | `/stripe/addon-checkout` | Session | MCP add-on purchase |

---

## System, Health & Tracking (5)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | Public | Liveness probe (`{status:"ok"}`) |
| GET | `/v1/meta` | Public | Service metadata + supported intents |
| POST | `/track` | Public | Analytics pageview (never fails) |
| GET | `/cron/rescore` | CRON | Re-score top UK postcodes |
| GET | `/cron/training-retention` | CRON | Purge expired training rows |

---

## Playground (2)

Anonymous demo tunnel, deliberately not under `/v1`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/playground/token` | Public | Turnstile check, issues signed 24h cookie |
| POST | `/playground/proxy` | Public | Whitelisted `/v1/*` proxy, rate-limited |

---

## Removed

- `GET /v1/widget` removed 2026-06-29 (AR-379, plan/030). Cache
  infrastructure deleted; a future embeddable surface will be a clean
  rebuild on the v2 signal-first stack.
- The legacy report API (`/v1/report`, `/v1/batch`, `/report`,
  `/me/reports`, `/report/:id`) was removed in the AR-324 epic.

---

## Summary

| Category | Count |
|---|---|
| Signals | 3 |
| Scores | 1 |
| Monitor | 8 |
| Intelligence | 4 |
| Webhooks | 4 |
| Levers (Orgs) | 31 |
| Entitlement | 1 |
| API Keys | 5 |
| Account Dashboard | 17 |
| Auth | 11 |
| Admin | 7 |
| Stripe | 5 |
| System, Health & Tracking | 5 |
| Playground | 2 |
| **TOTAL** | **104** |

**Last updated:** July 8, 2026 | Verified against `apps/api/src/routes/*.ts` on branch `docs/fix-doc-drift`.
