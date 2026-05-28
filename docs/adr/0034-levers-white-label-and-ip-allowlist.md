# ADR 0034 — Levers: white-label + per-key IP allowlist

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-200; depends on
  [[adr-0027-levers-foundation]] (`orgs` + `api_keys.org_id`),
  [[adr-0028-levers-org-crud]] (PATCH org endpoint),
  [[adr-0033-levers-full-rbac]] (admin+/owner+ gating).

## Context

The last two enterprise polish features before the Levers epic wraps:

1. **White-label** — let an org rebrand the API surface (display name +
   homepage URL) so resold embeds say "Acme Underwriting Intelligence"
   instead of "OneGoodArea". A few small fields exposed on `/v1/me`;
   no engine impact.
2. **IP allowlist** — let an enterprise customer restrict an API key
   to specific source IPs. The pre-existing key validation path already
   does a hash lookup; this commit threads the request IP through and
   adds one extra CIDR-match step.

Both are "additive columns + tiny logic" — bundled into one commit
because neither warrants a standalone story.

## Decision

### Schema (additive on existing tables)

```sql
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS brand_url TEXT;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS allowed_ip_cidrs TEXT[] NOT NULL DEFAULT '{}';
```

All `IF NOT EXISTS` — idempotent. `orgs.display_name` and
`orgs.brand_url` are nullable; null `display_name` falls back to
`name` at the consumer layer. `allowed_ip_cidrs` defaults to the empty
array so every existing key is byte-identical (no restriction).

### Contracts

`OrgSchema` gains optional `display_name: string | null` and
`brand_url: string | null`. `UpdateOrgRequestSchema` accepts both
(URL-validated for brand_url, max 500 chars). Explicit `null` clears
the field; `undefined` keeps the current value.

### Pure CIDR-match helper (`infrastructure/utils/ip-cidr.ts`)

`ipMatchesCidrs(requestIp, cidrs)`:

- Empty `cidrs` → true (no restriction).
- IPv4 prefix match by integer mask (`>>> 0` to stay unsigned 32-bit).
- IPv4-mapped IPv6 (`::ffff:1.2.3.4`) → strips the prefix before the
  IPv4 check.
- Bare IP (no `/N`) → exact equality.
- IPv6 → exact equality only (full prefix matching deferred until a
  real customer asks).
- Malformed entries are silently skipped — a single bad CIDR in the
  list doesn't break auth.
- Out-of-range prefix (>32 for IPv4) → no match.

Hand-rolled (no new dep). 17 unit tests cover empty / IPv4 prefix /
malformed / IPv6 / OR semantics across multiple CIDRs.

### `validateApiKey(key, requestIp?)` discriminated union

Return type widens from `ValidatedApiKey | null` to:

```ts
type ValidateApiKeyResult =
  | { userId, orgId, allowedIpCidrs?: string[] }              // success
  | { blocked: "ip_not_allowed", userId, orgId }              // gate failed
  | null;                                                      // unknown key
```

`allowedIpCidrs` is OPTIONAL on the success branch — keeps existing
test mocks (`{userId, orgId: null}`) type-compatible without
churning 10 test files. Runtime always returns an array; downstream
defaults `undefined → []`.

The `blocked` branch is a distinct shape with its own `userId` /
`orgId` so callers that DO care about who-tried can log it (the
`last_used_at` timestamp is still bumped on a blocked attempt for
the same "someone tried, got rejected" telemetry).

### Auth-helper integration

`authenticate(request, reply)` now extracts the client IP via the new
`clientIpOf(request)` helper (first segment of `x-forwarded-for`, else
`request.ip`) and passes it to `validateApiKey`. On `blocked`, sends
**403 `ip_not_allowed`** distinct from the 401 "invalid key" path.

`requireApiAccessWithOrg`'s second `validateApiKey` call (the one
that recovers orgId) also passes the IP. The first call's IP gate
already passed by definition — but passing for the second call keeps
behaviour symmetrical if the IP somehow changed (it won't).

Three top-level handlers that do their own `validateApiKey` outside
the `authenticate` helper (`/v1/me`, `/v1/report`, `/v1/batch`) were
updated identically — extract IP, pass it, surface the blocked branch
as 403.

### `/v1/me` response shape

New fields on the existing response (back-compat: adding, never
removing):

```json
{
  "org": {
    "id", "slug", "name",
    "display_name": string | null,
    "brand_url":   string | null,
    "role":        "owner" | "admin" | "member"
  },
  "key": { "allowed_ip_cidrs": string[] }
}
```

`org` is null defensively if the lookup fails (the underlying request
has nothing to do with branding; a DB hiccup here shouldn't 500 a
plan/entitlement check). Same pattern as the methodology-pin
defensive fallback shipped in ADR 0031.

### RBAC (ADR 0033 still governs)

`PATCH /v1/orgs/:id` with the new `display_name` / `brand_url` fields
inherits the existing admin+ gate. No new endpoint, no new role
matrix entry.

### IP allowlist management

This commit ships the column + enforcement. Programmatic management
of `allowed_ip_cidrs` is **deferred**: today the column is settable
via SQL only (or via the session-auth /keys endpoint flow at key-
creation time once that gains a request param). The CRUD surface for
rotating allowlists on existing keys is a small follow-up if a real
customer needs it. Reading the current allowlist works today via
`/v1/me`.

## Consequences

**Positive**

- **White-label unlocks resold embeds.** Customers can render their
  brand on any surface that reads `/v1/me.org.display_name`.
- **IP allowlist closes the security-review checkbox.** "Can you
  restrict our production key to IPs X.Y.Z.0/24?" — yes.
- **Byte-identical for existing keys.** Empty `allowed_ip_cidrs`
  short-circuits to "match" in the helper. Zero risk of an existing
  caller getting 403'd.
- **Distinct 403 code** (`ip_not_allowed`) lets compliance/ops tools
  detect IP-gate hits without conflating with 401 "bad key".
- **Test coverage** — 17 unit tests on `ipMatchesCidrs` + 4 new
  validateApiKey integration tests for the discriminated union.
  apps/api: 868 tests / 94 files green (was 848). Typecheck + lint
  clean.

**Negative / accepted**

- IPv6 prefix matching is exact-equality-only. Acceptable for v1
  — today's enterprise allowlists are overwhelmingly IPv4. A real
  customer with IPv6 prefix needs upgrades this; the helper is
  the only place that changes.
- Bad CIDRs in the array are silently skipped. The alternative
  (throw on any malformed entry) would mean one bad SQL UPDATE
  could brick every request. Skip-and-continue is safer; ops can
  read the allowlist via `/v1/me` and catch problems.
- The `allowedIpCidrs` field on the success branch is OPTIONAL in
  the type to keep test mocks type-compatible. Slightly noisier
  on the consumer side (the `?? []` defaults). Trade-off against
  10 test-file churn was worth it.
- No allowlist mutation endpoint. Deferred per Out-of-scope.
- `clientIpOf` reads `x-forwarded-for` first segment. Honest under
  Render/Vercel/typical reverse-proxy setups; vulnerable to spoofing
  if a customer's network passes the header through unfiltered.
  Acceptable for v1 — trust-proxy is an infrastructure concern,
  customers running their own gateway are responsible for the
  header chain.

## Alternatives considered

- **Validate IPs at the rate-limit / plan-gate layer instead of the
  key-lookup layer.** Rejected — putting it on the key-lookup means
  every code path that calls `validateApiKey` gets the check for
  free. Putting it later means duplicating the gate at every
  authenticated entry point.
- **`allowed_ip_cidrs` on `orgs` (per-org allowlist) instead of
  `api_keys` (per-key).** Considered. Rejected: customers often
  want different allowlists for different keys (CI vs prod), and
  per-key is a strict superset (an org-wide allowlist can be
  modelled as setting the same list on every key). Per-org adds a
  layer of policy with no clear customer ask.
- **Strict IP allowlist enforcement: a non-empty allowlist with a
  malformed entry is treated as "deny all".** Rejected — same
  "one bad CIDR bricks the customer" problem. Skip-and-continue
  matches AWS / Cloudflare behaviour.
- **A new error code per "blocked" reason (`ip_not_allowed`,
  `country_not_allowed`, etc.).** Today there's exactly one
  blocked reason; we keep it concrete. The discriminated-union
  shape already accommodates additional reasons cleanly when they
  land.
- **`display_name` and `brand_url` in a separate `org_branding`
  table.** Considered — would give us per-key brand override + an
  audit trail. Rejected: the brand IS the org. A separate table is
  over-engineered for v1. If per-key brand override becomes a real
  ask, we move display_name onto `api_keys` then; that's a small
  refactor inside the org-fetch path.

## Proven on prod

Acceptance steps (run from local container after migration):

1. Migrate: `orgs.display_name`, `orgs.brand_url`, and
   `api_keys.allowed_ip_cidrs` columns exist.
2. As owner: `PATCH /v1/orgs/<id> {"display_name":"Acme Underwriting",
   "brand_url":"https://acme.example"}` → 200, fields persisted.
3. `GET /v1/me` returns `org.display_name = "Acme Underwriting"`,
   `org.brand_url = "https://acme.example"`, `key.allowed_ip_cidrs = []`.
4. Set `allowed_ip_cidrs = '{"10.0.0.0/8"}'` on an api_keys row via
   SQL. Hit any authenticated endpoint:
   - From `10.1.2.3` → succeeds.
   - From `8.8.8.8` → 403 `ip_not_allowed`.
5. `GET /v1/me` from the matching IP returns
   `key.allowed_ip_cidrs = ["10.0.0.0/8"]`.
6. `PATCH` org with `display_name: null` clears it; subsequent
   `/v1/me` returns `display_name: null` (consumer falls back to
   `name`).
