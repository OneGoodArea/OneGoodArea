# ADR 0029 — Levers: custom signal bundles (per-org whitelists)

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-195; depends on
  [[adr-0027-levers-foundation]] (org tenancy primitives) and
  [[adr-0028-levers-org-crud]] (org CRUD endpoints).

## Context

The first two Levers commits made tenancy a real surface: every user
has an org; orgs can be created, named, shared. But none of the actual
data layer was scoped per org — `/v1/area` returned the full taxonomy
to every caller, `/v1/areas` would rank by any signal, `/v1/query`
plans could reference any key.

Positioning v3 names "configurable scoring" and "fully configurable
per client" as the half this epic delivers. The first concrete config
Lever is **named per-org whitelists of signal keys** ("bundles") that
scope what a caller sees when they pass `?bundle=<id>`.

## Decision

### Schema (one new table)

```sql
CREATE TABLE IF NOT EXISTS signal_bundles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  signal_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, slug)
);
CREATE INDEX signal_bundles_org_idx ON signal_bundles (org_id);
```

- `org_id` is a soft FK to `orgs.id` — no DB-level constraint, same
  pattern as the rest of the Levers schema. Application enforces.
- `UNIQUE (org_id, slug)` so two bundles in the same org can't share a
  slug; slugs across orgs can repeat (each org has its own namespace).
- `signal_keys` is a Postgres `TEXT[]`. The Neon driver surfaces it as
  a JS `string[]`. Application validates entries against the active
  `SUPPORTED_SIGNALS` taxonomy at write time; the DB doesn't enforce a
  CHECK because the taxonomy evolves (new derived signals land every
  Intelligence increment).

### 5 endpoints under `/v1/orgs/:id/bundles`

| Method | Path | Guard | Notes |
|--------|------|-------|-------|
| POST   | `/v1/orgs/:id/bundles`              | api-key + owner   | 400 on unknown signal keys; 409 on slug collision |
| GET    | `/v1/orgs/:id/bundles`              | api-key + member  | List org's bundles |
| GET    | `/v1/orgs/:id/bundles/:bundleId`    | api-key + member  | Get one (404 if cross-org or unknown) |
| PATCH  | `/v1/orgs/:id/bundles/:bundleId`    | api-key + owner   | Rename / re-slug / replace signal_keys (any subset) |
| DELETE | `/v1/orgs/:id/bundles/:bundleId`    | api-key + owner   | Remove |

Membership is checked BEFORE the body is parsed for mutations — same
no-enumeration pattern as the org endpoints in ADR 0028.

### `requireApiAccessWithOrg` + `resolveBundleForCaller`

The first commit that needs org context inside a handler. Two pieces:

- **`requireApiAccessWithOrg`** — variant of `requireApiAccess` that
  re-issues `validateApiKey` once to recover `orgId` from the api-key
  row. orgId straight from the key (post-AR-193 backfill, every key
  has one). 30+ existing endpoints that don't need org context keep
  using `requireApiAccess` unchanged.
- **`resolveBundleForCaller`** — pure-ish helper that turns
  `?bundle=<id>` into `string[] | undefined`. Returns
  `{ok: true, allowed: undefined}` when no bundle was requested (no
  filter applied); resolves an undefined orgId via a lazy first-owner
  lookup ONLY when a bundle WAS requested (so the test mocks for non-
  bundle endpoints don't need to mock the fallback SQL).

### Filtering semantics on three product endpoints

| Endpoint | When bundle absent | When bundle present |
|----------|---|---|
| `GET /v1/area`   | Returns full profile (unchanged)              | Response `signals[]` filtered to bundle's whitelist; `meta.sources` recomputed from the filtered signals |
| `GET /v1/areas`  | Returns full ranking (unchanged)              | The requested `signal` MUST be in the bundle (otherwise 422 `bundle_signal_not_allowed`). Filter is a gate, not a projection — `/v1/areas` ranks by ONE signal so there's nothing to project |
| `POST /v1/query` | Plan runs as today (unchanged)                | Plan's referenced signal keys must ALL be in the bundle (422 `bundle_signal_not_allowed` with the disallowed keys + the plan echoed). The plan runs first; the gate fires on the executed plan so NL-derived plans are validated the same way as programmatic ones |

`get_area` and `score_area` plan ops reference zero signal keys in
their params (they return all signals / compute a score over the full
engine respectively). The plan-level 422 doesn't fire for them; the
underlying `/v1/area` response IS filtered by bundle when the caller
fetched `/v1/area` directly with `?bundle=`. (Bundle filtering inside
`/v1/query` get_area responses is deferred — needs executor coupling.)

### Pure plan-signal extraction

`extractSignalKeysFromPlan(plan)` walks the typed `QueryPlan` and
returns every referenced signal key, in the plan's order:

- `rank_areas` singular → `[params.signal]`
- `rank_areas` compound → `params.signals.map(s => s.key)`
- `find_peers` → `params.signals ?? []` (signals[] is optional; when
  the executor falls back to all-target-normalized, the plan-level
  gate has nothing to check)
- `find_insights` / `find_forecast` → `[params.signal_key]`
- `get_area` / `score_area` → `[]`

This is the heart of the /v1/query gate. `planSignalsOutsideBundle`
composes it with a `Set` membership check; tests cover all five plan
shapes.

## Consequences

**Positive**

- **First "configurable per client" Lever live.** An InsureTech MGA
  can ship an `underwriting_v1` bundle and a scoped key; their
  pipeline only sees the signals they want, no chaff.
- **Opt-in, not opt-out.** Callers who don't pass `?bundle=` get
  byte-identical responses to today. Zero risk of silent narrowing.
- **Same loop as Foundation + Org CRUD:** orgs.id FK, Zod contracts,
  `.strict()` everywhere, owner-only mutations, last-org-membership
  gate on reads.
- **Plan-level gate** on /v1/query means bundles compose with NL
  queries too — a customer can give Claude/Sonnet a question, the
  planner picks signals, and the gate catches any plan that wandered
  out of the bundle.
- **Telemetry:** four new `trackEvent` calls
  (`api.bundle.created/updated/deleted` + existing `api.area.profiled`
  / `api.areas.queried` / `api.query.executed` now include a `bundle`
  field when set). Existing meter pipeline absorbs them.
- **Test coverage:** 21 new unit tests on pure helpers + 3 integration
  tests on /v1/area.

**Negative / accepted**

- `/v1/query` get_area + score_area responses don't filter per-bundle
  (they return all signals / compute over the full engine). This is
  a real gap — a customer could bypass their bundle by routing
  through /v1/query's get_area. Acceptable for v1: the typical
  configured-customer pipeline calls /v1/area directly. Closing this
  gap requires executor coupling (response-shape filtering inside
  the executor based on a bundle context). Deferred to a follow-up.
- The `signal_keys` TEXT[] column has no CHECK constraint. A malformed
  write (`signal_keys = ['fake']`) would persist. The application
  layer guards this at write time via `findUnknownSignalKeys`, but a
  raw SQL UPDATE could bypass. Acceptable: SQL access is gated to
  ops, and the read path doesn't fail on unknown keys (it just
  filters with no matches).
- No API-key → bundle binding yet (no `api_keys.bundle_id` column).
  The caller passes `?bundle=` explicitly each time. Persistent
  key→bundle binding is a small follow-up; this commit keeps the
  surface clean.
- No bundle-scoped metering (Stripe quotas per bundle). Today's
  meter still pivots on user/org. Bundle-scoped metering is a billing
  commit, not a Levers commit.
- The `extractSignalKeysFromPlan` switch is exhaustive over the v1
  plan grammar; new plan ops MUST add a case (TypeScript's
  exhaustiveness check enforces). When a new op lands (e.g.
  `find_anomaly`), the case is mandatory; this is a feature.

## Alternatives considered

- **Bundle as a header (`X-Bundle-Id`) instead of `?bundle=`.**
  Rejected — query param is auditable in URL-shaped logs and works in
  curl without bash gymnastics. A header could be added later as a
  redundant alias.
- **Bundle as an API-key property (`api_keys.bundle_id`) — every key
  IS a bundle.** Considered, deferred. That's how you'd hand a
  scoped key to a downstream pipeline without changing the call
  shape. Small follow-up after this commit ships; doesn't change
  the schema, just adds a column + plumbing.
- **`signal_keys jsonb` with structured per-key metadata** (display
  weight, override, etc.). Rejected — first commit keeps it a plain
  whitelist. Per-key metadata is the *presets* commit (#4), where
  weighted custom scoring lives.
- **Reject the WHOLE request with 422 if `?bundle=` is set on /v1/area
  AND the bundle has signal_keys = `[]`.** Considered, rejected. An
  empty bundle returns an empty signals[] array — no special-case;
  the caller asked for "nothing" and got "nothing". Better than
  surprising them with a 422.
- **Per-bundle quotas at request time.** Rejected for this commit —
  see Negative above. Lives in billing.
- **Plan-level gate fires BEFORE planning (block the LLM).**
  Considered but rejected: the planner doesn't see the bundle, so
  pre-planning enforcement would require teaching the planner about
  the bundle (more prompt, more risk of hallucinated keys). Post-plan
  validation is the simpler invariant: the bundle is the source of
  truth, the planner is best-effort.
