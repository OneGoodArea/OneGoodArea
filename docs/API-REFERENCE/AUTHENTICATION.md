# Authentication

OneGoodArea supports three auth modes. Most public endpoints use API keys; session JWT covers the customer dashboard; Stripe-signed payloads and a CRON shared-secret cover those two specific endpoints.

## API key (Bearer token)

```http
GET /v1/area?postcode=M11AE
Authorization: Bearer oga_a1b2c3d4e5f6...
```

- Keys are 24-byte random tokens prefixed `oga_` (legacy `aiq_` keys still validate)
- Stored server-side as SHA-256 hashes — plaintext is never persisted after creation
- Created via the dashboard at `/dashboard/api-keys` → `POST /keys` (session JWT auth)
- Returned ONCE on creation; cannot be recovered after

### Local bootstrap (no UI)

For a disposable local test account + API key, run:

```bash
npm run bootstrap:test-key -w @onegoodarea/api -- --email api-test@onegoodarea.local --plan sandbox
```

It creates or updates a local credentials user, gives them an API-enabled sandbox plan, creates a personal org, and prints a fresh `oga_...` key.

### IP allowlist (Levers AR-200)

A key may have `allowed_ip_cidrs` set. If non-empty, request IPs outside the allowlist return **403 `ip_not_allowed`** (distinct from 401 invalid-key). Read your key's current allowlist via `GET /v1/me.key.allowed_ip_cidrs`.

## Session JWT (BFF bridge)

Customer dashboard surfaces (`/dashboard/*`, `/settings/*`, `/keys/*`) use NextAuth sessions on apps/web. apps/web mints a short-lived HS256 JWT signed with `AUTH_SECRET` and proxies to apps/api, which verifies it via `verifySessionToken()`.

The shared `AUTH_SECRET` env var must match between apps/web and apps/api.

## Stripe-signed webhooks

`POST /stripe/webhook` verifies the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET` over the **raw body bytes** (preserved by the JSON content-type parser). Verified events become entries in `webhook_events` and route to handlers in `apps/api/src/modules/billing/`.

## CRON shared secret

`GET /cron/rescore` requires an `Authorization: Bearer <CRON_SECRET>` header. Set the secret on Render + in the GitHub Actions workflow that triggers the cron.

## RBAC (Levers AR-199)

For org-scoped endpoints, the api key resolves to a `(user_id, org_id)` pair. The caller's role in that org gates mutations:

- **member** — all GET endpoints
- **admin** — adds bundles / presets / cohorts mutations + org rename + non-owner member CRUD
- **owner** — methodology pin + granting ownership + removing owners + last-owner guard

Typed 403 codes returned: `admin_required`, `owner_required`, `cannot_grant_owner`, `cannot_remove_owner_as_admin`.

## See also

- [`ERRORS.md`](./ERRORS.md) — error response shapes
- ADR 0027-0033 — every Levers auth decision
