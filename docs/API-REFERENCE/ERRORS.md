# Errors

OneGoodArea returns JSON error bodies with a consistent shape. Many errors carry a typed `code` you can program against — list below.

## Response shape

```json
{
  "error": "Short human message",
  "code": "typed_code_optional"
}
```

For business-rule violations (422) the body may also include extra context:

```json
{
  "error": "Plan references signals not in bundle: crime.total_12m.",
  "code": "bundle_signal_not_allowed",
  "plan": { … the executed plan … }
}
```

## Typed error codes

| HTTP | Code | Where it comes from |
|---|---|---|
| 401 | (none — plain text) | Missing / invalid / revoked api key |
| 403 | `ip_not_allowed` | Per-key IP allowlist gate (AR-200) |
| 403 | `admin_required` | Mutation requires admin+ role (AR-199) |
| 403 | `owner_required` | Compliance-grade mutation requires owner (AR-199) |
| 403 | `cannot_grant_owner` | Admin tried to add an `owner`-role member (AR-199) |
| 403 | `cannot_remove_owner_as_admin` | Admin tried to remove an `owner`-role member (AR-199) |
| 403 | (no code) | Plan doesn't allow API access — upgrade required |
| 409 | (no code) | Slug collision on org / bundle / preset / cohort create |
| 409 | (no code) | Last-owner guard — can't remove the last owner of an org |
| 422 | `bundle_signal_not_allowed` | Caller passed `?bundle=` and the requested signal isn't in it |
| 422 | `preset_id_conflict` | `preset_id` passed alongside explicit `preset` / `weights` (mutually exclusive) |
| 422 | `unknown_weight_keys` | Saved-preset weights reference dimension keys not in the chosen `base_preset`'s dim set |
| 422 | `unsupported_engine_version` | Methodology pin PUT with an engine version outside the supported window |
| 422 | `no_org_context` | Caller has no resolvable org for an org-scoped feature; also returned to an anonymous caller who passes `?bundle=` on `/v1/query` — bundles require an account (AR-594, Plan 059.2) |
| 422 | `llm_error` | Anthropic provider construction / call failed during NL planning |
| 403 | `auto_generated_key_not_allowed` | `/me`, `/keys`, `/admin`, `/stripe` reject an auto-provisioned playground key (AR-595/596, Plan 059.3/4) — create a real one at `/keys` |
| 429 | (no code) | Tier quota exceeded (see [Tier quotas](#tier-quotas) below); `X-RateLimit-*` + `Retry-After` headers are set |
| 500 | (none) | Genuine server error — Sentry should capture |

## Tier quotas

Rate limits are per-tier, not a flat per-key number (AR-593/594, Plan 059). Every 401/429-eligible request resolves to one tier and is checked against that tier's quota:

| Tier | Quota | Who |
|---|---|---|
| `anonymous` | 5 req / 60s, per IP | No `Authorization` header at all — only on the routes that allow it (currently `POST /v1/query`) |
| `logged_in` / `basic` | 30 req / 60s, per key | Signed-in, no paid plan |
| `high_tier` | 120 req / 60s, per key | Paid plan |
| `engineering` / `superuser` | Unlimited | Staff (user_type ∈ {engineering, superuser}) |

**Global free-tier backstop:** `anonymous` and `logged_in`/`basic` traffic additionally shares one daily ceiling (`5000/day` by default) across *all* callers in those tiers combined — a cost backstop, checked only after a request's own per-identifier quota already passed. `high_tier`/`engineering`/`superuser` (via `user_type`) never touch it. A 429 here looks identical to a normal quota 429 (no distinct code), but the `error` message says "Free-tier global daily limit reached".

## Validation errors

400 responses for malformed bodies. Body shape varies by source — for Zod schemas, the first failing issue's message + path. Example:

```json
{
  "error": "name: At least one of name, slug, or signal_keys must be provided."
}
```

## See also

- [`AUTHENTICATION.md`](./AUTHENTICATION.md) — auth-related errors
- [`docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`](./ENDPOINTS-BY-PRODUCT.md) — the full endpoint × auth × dark-flag matrix
