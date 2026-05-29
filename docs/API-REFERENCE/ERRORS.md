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
| 422 | `no_org_context` | Caller has no resolvable org for an org-scoped feature |
| 422 | `llm_error` | Anthropic provider construction / call failed during NL planning |
| 429 | (no code) | Per-key rate limit — 30/min by default |
| 500 | (none) | Genuine server error — Sentry should capture |

## Validation errors

400 responses for malformed bodies. Body shape varies by source — for Zod schemas, the first failing issue's message + path. Example:

```json
{
  "error": "name: At least one of name, slug, or signal_keys must be provided."
}
```

## See also

- [`AUTHENTICATION.md`](./AUTHENTICATION.md) — auth-related errors
- [`docs/ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) §6 — the full endpoint × auth × dark-flag matrix
