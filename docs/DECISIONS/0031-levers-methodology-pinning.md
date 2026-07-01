# ADR 0031 — Levers: per-org methodology pinning

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-197; depends on
  [[adr-0027-levers-foundation]] (org tenancy) +
  [[adr-0028-levers-org-crud]] (org CRUD); extends the AR-131
  `resolveEngineVersion` header-pinning seam shipped with engine v2.

## Context

The AR-131 header `X-Engine-Version` lets a caller pin per-request to
a specific engine version. Useful but lossy: every call must send the
header, and a customer's model risk register needs a higher-level
invariant — "for our org, every response is stamped with version X
until we say otherwise".

This commit is the org-level form of pinning. It's also the foundation
for the v3.0.0 cutover: when scoring math actually changes, an org can
keep stamping v2.x while v3 rolls out, and migrate when their
compliance team has cleared it.

## Decision

### Schema (one new table)

```sql
CREATE TABLE IF NOT EXISTS org_methodology_pins (
  org_id TEXT PRIMARY KEY,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `org_id` is the PK — one row per org. UPSERT on PUT keeps the API
  ergonomic ("set my org's pin to X" is one call, no separate delete-
  then-create dance).
- Soft FK to `orgs.id` — same pattern as the rest of Levers.
- `engine_version` is validated at WRITE time against
  `SUPPORTED_ENGINE_VERSIONS`. Reads trust the value.

### 3 endpoints under `/v1/orgs/:id/methodology`

| Method | Path | Guard | Notes |
|--------|------|-------|-------|
| GET    | `/v1/orgs/:id/methodology`         | api-key + member | Returns `{engine_version: string \| null, pinned: boolean}`. `null` = no pin set. |
| PUT    | `/v1/orgs/:id/methodology`         | api-key + owner  | Body `{engine_version}`. 400 `unsupported_engine_version` if not in `SUPPORTED_ENGINE_VERSIONS`. UPSERT semantics — "set the pin to X". |
| DELETE | `/v1/orgs/:id/methodology`         | api-key + owner  | Clear the pin. Idempotent (200 either way). |

### Resolution precedence (in `resolveEngineVersion`)

The existing function gained an optional second parameter:

```ts
resolveEngineVersion(headerValue: unknown, opts?: { orgPin?: string | null })
```

Precedence:

1. **Explicit valid header** → wins (header-path validation unchanged).
2. **`opts.orgPin`** → applied when no header is sent (validates that
   the pin is still in `SUPPORTED_ENGINE_VERSIONS`; falls through to
   latest if not — see "Defense in depth" below).
3. **`METHODOLOGY_VERSION`** → default.

The org pin only fires on the no-header path. A request with an
explicit `X-Engine-Version` still gets validated against the supported
window the same way as before — a pin can't mask a bad header.

### Endpoint integration

Five product endpoints now stamp `X-Engine-Version` via the new
`effectiveEngineVersionForCaller(orgId, userId)` helper:

- `GET /v1/area`
- `GET /v1/areas`
- `POST /v1/score`
- `POST /v1/query`
- `POST /v1/portfolios/:id/enrich`
- `POST /v1/portfolios/:id/changes`

The helper:

1. Resolves the caller's org (uses `requireApiAccessWithOrg`'s `ctx.orgId`
   when available, else lazy first-owner fallback for legacy keys with
   `org_id = NULL`).
2. Looks up `org_methodology_pins` for that org.
3. Passes the pin (if any) into `resolveEngineVersion`.

If the helper throws (DB hiccup, missing table on a fresh test
environment, etc.) it logs and falls back to `METHODOLOGY_VERSION` —
the pin is opt-in, so a lookup failure must not 500 the product
endpoint.

### Body `engine_version` field stays "what actually ran"

Some endpoints (`/v1/area`, `/v1/score`) carry an `engine_version`
field in the response body. This commit does NOT change those — they
continue to report `METHODOLOGY_VERSION` (the version the engine
actually executed). The PIN is surfaced only on the response HEADER.
This is the AR-131 split honored consistently: "what the auditor
wants stamped" (header) vs "what the engine ran" (body).

When v3.0.0 ships and the two diverge meaningfully, this split is the
seam that lets us run v2 for pinned orgs and v3 for unpinned orgs
from the same Render deployment.

### Pure validation reuses `SUPPORTED_ENGINE_VERSIONS`

`PUT /v1/orgs/:id/methodology` calls `getSupportedEngineVersions()`
from the same module that defines the supported window. ONE source of
truth — adding 2.0.3 to the window automatically makes it pinnable.

### Defense in depth — pin EOL after the fact

If the supported window shrinks (e.g. 2.0.0 ages out) AFTER an org
has pinned that version, two things happen:

1. The DB row stays — we don't delete; an audit might need it.
2. `resolveEngineVersion`'s `resolveFromOrgPin` helper returns null for
   any pin not in the current `SUPPORTED_ENGINE_VERSIONS`, so the
   caller silently falls back to latest. No 500.

A future commit can surface a deprecation event when this happens
(`api.methodology.pin_eol`). For v1 the silent-fallback keeps the
endpoint healthy without breaking compliance teams' setups.

## Consequences

**Positive**

- **Org-level reproducibility.** A compliance team registers their
  org's `engine_version` once; every API call from any of the org's
  keys (without an explicit per-request header) carries that version
  on the response header.
- **Header precedence preserved.** AR-131 callers who explicitly pin
  per-request keep doing so. The org pin only applies on the
  no-header path. Backwards compatible.
- **No body-shape change.** `ScoreResult.engine_version` / `AreaProfile.
  meta.engine_version` continue to report what actually ran. The
  contract test set doesn't budge.
- **Opt-in default.** No pin set = unchanged behavior. Zero risk of a
  silent change for existing customers.
- **Lookup is defensive.** A DB outage on the methodology table can't
  500 every product endpoint — it logs and falls back to latest.
- **Test coverage:** 7 new unit tests on `resolveEngineVersion`'s pin
  precedence + 2 integration tests on /v1/score's header stamping.
  apps/api: 837 tests / 92 files green (was 828). Typecheck + lint
  clean.

**Negative / accepted**

- The body field continues to report `METHODOLOGY_VERSION`. A caller
  watching the body alone won't see the pin reflected. **The pin is
  a HEADER concept by design** — bodies report what ran, headers
  carry the audit anchor. Documented in both engine-version.ts and
  this ADR.
- A pin lookup is one extra SELECT per affected request. The query is
  PK-indexed and trivial; cost is negligible vs. the work each
  endpoint already does (signal fetches, scoring, planner round-trips).
  No caching for v1 — adding it would risk staleness when an owner
  changes the pin.
- The 6 affected endpoints all do the same `effectiveEngineVersionForCaller`
  dance. A middleware would be tidier; deferred (would touch every
  product endpoint anyway, and the inlined call is one line).
- The Intelligence-surface endpoints (`/v1/peers`, `/v1/insights`,
  `/v1/forecast`, `/v1/signals/:category`) still stamp
  `METHODOLOGY_VERSION` directly. Those use `guardSignals` (returns
  just userId, not orgId). Upgrading them to honor the pin is a
  small follow-up. Not blocking — the main scoring surfaces
  (/v1/area, /v1/areas, /v1/score, /v1/query) do honor it.
- No deprecation/recovery signal when a pinned version ages out of
  the supported window. Silent fallback is correct (don't break
  callers) but a future commit should add an event for ops visibility.

## Alternatives considered

- **Validate the pin at READ time.** Rejected — would mean every
  product endpoint could 400 on a stale pin, broken for the caller
  whose admin set it months ago. Validate at write, trust at read,
  defense-in-depth fallback if the supported window has changed.
- **Stamp the pin on the BODY `engine_version` field too.** Considered
  — would tighten the audit story. Rejected for this commit because
  the body field has semantic meaning ("what the engine ran") that
  diverges from "what the org pinned" once v3 ships and they're
  actually different versions. Splitting the meanings now keeps the
  contract honest for that future state.
- **Allow per-key pins.** Rejected for this commit — a customer's
  compliance scope is the ORG, not the key. Adding per-key
  granularity would mean either a separate column on `api_keys` or a
  new join table; both can land later if a real customer asks.
- **POST /v1/orgs/:id/methodology + DELETE.** Considered — verb-wise
  cleaner. Picked PUT + DELETE because the resource is "the org's
  pin" (singular) — PUT is the idiomatic "set to this value" verb
  for singleton subresources.
- **Embed the pin in the api_keys row at CREATION time.** Rejected —
  rebinding (org owner changes pin from 2.0.1 to 2.0.2 because
  compliance approved the new version) would require touching every
  key. Org-level pin = one row, one update.

## Proven on prod

Acceptance steps (run from local container; the migration auto-runs
on Render's next deploy):

1. Migrate runs, `org_methodology_pins` table exists.
2. `PUT /v1/orgs/<id>/methodology {"engine_version": "2.0.1"}` →
   200 with `{engine_version: "2.0.1", pinned: true}`.
3. `POST /v1/score {"area":"M1 1AE", "preset":"research"}` →
   200 with response header `X-Engine-Version: 2.0.1`.
4. `GET /v1/area?postcode=M1%201AE` from the same org → header echoes
   `2.0.1`.
5. With explicit `X-Engine-Version: 2.0.2` request header → response
   header is `2.0.2` (header beats pin).
6. `PUT /v1/orgs/<id>/methodology {"engine_version":"9.9.9"}` →
   400 `unsupported_engine_version`.
7. `DELETE /v1/orgs/<id>/methodology` → 200. Next call: header back
   to `2.0.2` (latest).
8. Non-owner member trying PUT/DELETE → 403.
