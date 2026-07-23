# Authentication

OneGoodArea supports four auth modes. Most public endpoints use API keys; session JWT covers the customer dashboard; anonymous (no credential) is scoped to a small allow-list for the Scalar playground; Stripe-signed payloads and a CRON shared-secret cover those two specific endpoints.

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
make scripts-bootstrap-test-key ARGS="--email api-test@onegoodarea.local --plan sandbox"
```

It creates or updates a local credentials user, gives them an API-enabled sandbox plan, creates a personal org, and prints a fresh `oga_...` key.

### IP allowlist (Levers AR-200)

A key may have `allowed_ip_cidrs` set. If non-empty, request IPs outside the allowlist return **403 `ip_not_allowed`** (distinct from 401 invalid-key). Read your key's current allowlist via `GET /v1/me.key.allowed_ip_cidrs`.

### Auto-generated playground keys (AR-595, Plan 059.3)

If a logged-in visitor to the Scalar playground (`/playground`) has no API key of their own, the web app auto-provisions one on their behalf so "Try it" works immediately — no dashboard visit required. These keys:

- Are marked `auto_generated = true` internally.
- Expire at the end of the day (UTC) they were created — `validateApiKey` treats an expired key exactly like a revoked one.
- Are subject to the same tier quota as any other key of that tier, including the shared free-tier global backstop (see [`ERRORS.md`](./ERRORS.md#tier-quotas)).
- Are **rejected with 403 `auto_generated_key_not_allowed`** on `/me`, `/keys`, `/admin`, `/stripe` (see below) — a throwaway key can never touch account, key-management, or billing state. Create a real key via `POST /keys` to use those endpoints.

If the visitor already has a real key, none is auto-created — its plaintext can't be retrieved (only the hash is stored), so the playground just leaves the auth field for them to fill in themselves.

## Anonymous (playground only, AR-594, Plan 059.2)

A small allow-list of routes — currently `POST /v1/query` — accept requests with **no `Authorization` header at all**, so a first-time visitor can try the API before creating an account. This is opt-in per route, not a general bypass: every other endpoint still 401s exactly as before.

An anonymous caller resolves to the `anonymous` tier, rate-limited per IP (see [`ERRORS.md`](./ERRORS.md#tier-quotas)) plus the shared global free-tier backstop. Anonymous calls are never captured as training data, and `?bundle=` on an anonymous `/v1/query` call returns **422 `no_org_context`** (bundles are an org feature — no account, no bundle).

## Session JWT (BFF bridge)

Customer dashboard surfaces (`/dashboard/*`, `/settings/*`, `/keys/*`) use NextAuth sessions on apps/web. apps/web mints a short-lived HS256 JWT signed with `AUTH_SECRET` and proxies to apps/api, which verifies it via `verifySessionToken()`.

The shared `AUTH_SECRET` env var must match between apps/web and apps/api.

**Since AR-596 (Plan 059.4)**, `/me`, `/keys`, `/admin`, and `/stripe` also accept a normal API key (bearerAuth) as an alternative to the session JWT — self-service, scoped to the caller's own account, and what makes these routes testable from the Scalar playground. Session JWT is tried first; a Bearer value that isn't a valid session JWT is checked as an API key next. `/admin` additionally requires the caller to be flagged superuser either way. An auto-generated playground key is rejected on all four regardless of which auth path validated it (see above).

`POST /keys/playground` (the endpoint the playground itself calls to provision a key) is the one exception — it stays session-JWT-only. It's a server-to-server call the web app makes on behalf of the current browser session, not something an external API-key holder would call.

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
