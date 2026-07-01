# ADR 0032 — Levers: per-org peer cohorts (scoped `/v1/peers`)

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-198; depends on
  [[adr-0027-levers-foundation]] (org tenancy) +
  [[adr-0028-levers-org-crud]]; extends
  [[adr-0023-peers-knn]] (`/v1/peers` + `buildPeersSql`).

## Context

`/v1/peers` (ADR 0023) returns the k nearest LSOAs to a target by
Euclidean distance over normalized signal vectors. The candidate set
is everything in `signal_values` (filterable by `country` / `lad`).
Enterprise customers often have a defined universe — their 50-city
pilot footprint, their target region, their watchlist — and want
peers ONLY from within it.

Three obvious shapes:

1. **Per-org peer cohort = subset of LSOAs.** Filter the existing
   global graph at query time. Cheapest.
2. **Per-org materialized graph with the same distance metric.**
   `org_peer_assignments` table + periodic refresh. Faster reads,
   more storage, identical results to (1).
3. **Per-org graph with CUSTOM signal weights** (a different distance
   metric). Different results entirely.

For commit 6 we ship (1). It's the cheapest version that delivers
the customer-visible value ("peers in MY universe"). Materialization
+ custom metrics can land later if a customer needs them.

## Decision

### Schema (one new table)

```sql
CREATE TABLE IF NOT EXISTS peer_cohorts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  geo_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, slug)
);
CREATE INDEX peer_cohorts_org_idx ON peer_cohorts (org_id);
```

- `org_id` is a soft FK to `orgs.id` — same pattern as the rest of
  Levers; application enforces.
- `UNIQUE (org_id, slug)` — slugs namespaced per-org.
- `geo_codes` is a Postgres `TEXT[]` of LSOA codes. Contract caps the
  size at 10,000 entries per cohort (bounded request body).

### 5 endpoints under `/v1/orgs/:id/cohorts`

| Method | Path | Guard | Notes |
|--------|------|-------|-------|
| POST   | `/v1/orgs/:id/cohorts`               | api-key + owner  | 400 if `geo_codes` is empty or > 10000; 409 on slug collision |
| GET    | `/v1/orgs/:id/cohorts`               | api-key + member | List org's cohorts |
| GET    | `/v1/orgs/:id/cohorts/:cohortId`     | api-key + member | Get one (404 cross-org) |
| PATCH  | `/v1/orgs/:id/cohorts/:cohortId`     | api-key + owner  | Any subset of `{name, slug, geo_codes}` |
| DELETE | `/v1/orgs/:id/cohorts/:cohortId`     | api-key + owner  | Remove |

Same membership-checked-before-body-parse pattern as the rest of
Levers.

### `/v1/peers` integration

The endpoint now uses `requireApiAccessWithOrg` (was `guardSignals`)
so it has access to `ctx.orgId`. When the body carries `cohort_id`:

1. Resolve the caller's org (lazy first-owner fallback for legacy
   keys with `org_id = NULL`).
2. Fetch the cohort scoped to that org; 404 if not found, 422 if no
   org context resolvable.
3. Pass `cohort.geo_codes` as `cohortGeoCodes` into `buildPeersSql`.

The endpoint also now stamps `X-Engine-Version` via
`effectiveEngineVersionForCaller` (consistency with the other product
endpoints — caller's org pin honored).

### `PeersInput.cohortGeoCodes` + SQL extension

`PeersInput` gained an optional `cohortGeoCodes?: string[]`.
`buildPeersSql` adds the candidate-side filter when present:

```sql
... AND sv.geo_code = ANY($N::text[])
```

The TARGET is permitted to be outside the cohort (the question is
"given THIS area, find peers in MY universe"). Cohort stacks with
`country` + `lad` if both are set — all three filters AND together.

### Cohort = subset, not materialized graph

This commit's cohort acts as a **candidate filter** at query time.
The peer graph itself is unchanged; only which peers are RETURNED
is. Pros:

- No materialization cron.
- Cohort changes (PATCH) take effect immediately on next read.
- Custom-weight cohorts are a strict superset of this — they can
  land when a customer asks, without breaking this surface.

Trade-off: every cohort query scans the same global candidate set
the global query does. At today's scale (~42k LSOAs) the cost is
trivial.

### Validation tone

`geo_codes` are validated as non-empty strings of bounded length —
NOT against the spine. A bad LSOA in the cohort silently won't match
anything in `signal_values`, which surfaces as `peers: []` not 500.
This is deliberate: callers who post a typo see "no peers" and fix
it; we don't want a spine-fresh-load to break existing cohorts. Same
philosophy as bundles + presets — validate shape, not domain.

## Consequences

**Positive**

- **Org-scoped peers shipped.** A regulated buyer with a defined
  footprint can now run `/v1/peers cohort_id=<id>` and trust that
  results are within their universe.
- **Opt-in default preserved.** `/v1/peers` without `cohort_id` is
  byte-identical to today.
- **One table, query-time filter.** No new materialization cron, no
  schema change to the existing peer system. The custom-metric
  version can layer on top without churn.
- **Methodology pin reached `/v1/peers` too.** Promoting the auth
  call to `requireApiAccessWithOrg` (needed for cohort context)
  also gave us the X-Engine-Version stamping for free, closing one
  of the gaps called out in ADR 0031.
- **Test coverage:** 7 new unit tests (4 on `dedupeGeoCodes`, 3 on
  `buildPeersSql`'s new cohort branch). apps/api: 844 tests / 93
  files green (was 837). Typecheck + lint clean.

**Negative / accepted**

- The cohort is a static list of LSOAs the caller posts. No rule
  engine ("all LSOAs in this LAD"). Acceptable for v1; a caller can
  compose a rule + POST the materialized list. A rule engine sits
  on top later if multiple customers ask.
- 10,000 LSOA cap on cohort size. Roughly 25% of UK LSOAs (~42k).
  Wide enough for any plausible pilot footprint; narrow enough to
  keep request bodies + the SQL array bind manageable. Bumpable
  later via a contracts release.
- The cohort doesn't constrain the TARGET. A caller can pass a
  target outside the cohort and the system happily returns peers
  inside it. Intentional — different question ("areas like THIS
  one, but only from my universe"). Documented in
  `peers.ts:cohortGeoCodes` comment.
- `/v1/peers` was wired to `guardSignals`; this commit changes it to
  the inline flag check + `requireApiAccessWithOrg`. Identical
  semantics (flag → auth → rate-limit → plan), just expanded shape.
- `/v1/insights` + `/v1/forecast` don't accept `cohort_id` yet.
  They still use the global graph. Could be added in a follow-up;
  not blocking — peers was the natural first surface.

## Alternatives considered

- **`peer_assignments.scope_key` column + per-scope materialization.**
  Rejected for v1 because it requires (a) a PK change on the
  existing table (Postgres ALTER PK is non-trivial) and (b) a refresh
  job per cohort that doesn't pay off until cohorts are large +
  numerous enough to make query-time filtering expensive. Defer
  until that day comes.
- **`peer_cohorts.lad_codes` / `peer_cohorts.country` rule fields
  instead of an explicit geo_codes list.** Considered. Rejected
  because (a) rules compose poorly with cap-on-size (a rule could
  match 30k LSOAs), (b) the caller can compute the materialized
  list locally and POST it. Keep the contract simple.
- **Cohort filter on `/v1/areas` too.** Tempting but distinct
  meaning. `/v1/areas` ranks by a signal; "rank LSOAs within my
  cohort by signal X" is a different product question. Could land
  as a separate commit. Out of scope here.
- **Cohort-aware peer-relative-z derived signals.** The peer-relative
  derived signals (ADR 0024) compute against the global peer set.
  Cohort-scoped derives would be a separate moat; out of scope for
  this commit.
- **`?cohort=<slug>` instead of `?cohort_id=<id>`.** Slugs are
  per-org so unique-WITHIN-org; ids are globally unique. The id-
  based contract is more robust for cross-org sharing later; the
  slug version could land as an alias.

## Proven on prod

Acceptance steps (run from local container; the migration auto-runs
on Render's next deploy):

1. Migrate runs, `peer_cohorts` table exists.
2. `POST /v1/orgs/<id>/cohorts` with `{name:"NW pilot", geo_codes:[...]}`
   (e.g. 5 LSOAs from Greater Manchester) → 201.
3. `POST /v1/peers {target:{postcode:"M1 1AE"}, cohort_id:"<id>"}`
   → peers list contains ONLY codes that are in the cohort.
4. Same call without `cohort_id` → peers list spans the UK.
5. `POST /v1/peers {target:{postcode:"M1 1AE"}, cohort_id:"unknown"}`
   → 404 `Cohort not found in your org`.
6. Non-owner POST/PATCH/DELETE on a cohort → 403.
7. `X-Engine-Version` response header reflects the caller's org
   methodology pin (when set, AR-197) — wired here as a side effect
   of promoting auth to `requireApiAccessWithOrg`.
