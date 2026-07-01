# ADR 0002 — The persisted signal store schema

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** `MASTER-PROPOSAL.md` section 3; ADR 0001; Jira AR-169 / AR-171.
  Builds on the signal-first contract (`packages/contracts`).

## Context

Today all area data is fetched **live per request** (the 7 fetchers run on every
`/v1/report` and `/v1/area` call). Nothing is persisted at LSOA/postcode grain. This
caps the product: no cross-area query, no real time-series, no audit lineage, latency
and cost scale with fan-out. The restructure's central build (Phase 1) is the **shift
from fetch-on-read to refresh-on-schedule + serve-from-store**. That requires a
persisted signal store. This ADR records its schema; the refresh jobs and the
store-read cutover are separate sub-tasks.

## Decision

Seven additive tables in the migration registry (`infrastructure/db/schema.ts`), all
`CREATE … IF NOT EXISTS` (idempotent), owned by the migrator:

| Table | Purpose | Key |
|---|---|---|
| `geo_entities` | the universe of areas (postcode\|oa\|lsoa\|msoa\|lad\|region) + centroid + boundary version | PK (geo_type, geo_code) |
| `geo_lookup` | the ONS spine: postcode → OA/LSOA/MSOA/LAD/region | PK (postcode) |
| `source_snapshots` | provenance per ingest: source, release, ingested_at, licence, checksum, rows | PK (id) |
| `signals` | the catalog: one row per signal key (category, unit, direction, source, methodology) | PK (key) |
| `signal_values` | the current value per signal per area | PK (signal_key, geo_type, geo_code) |
| `signal_percentiles` | percentile rank per signal+geo within a scope | PK (…, scope, scope_key) |
| `signal_timeseries` | append-only history, one row per signal+area+period (the moat) | PK (…, observed_period) |

**Design choices:**

1. **Natural composite keys, no surrogate ids** on the value tables — the key *is*
   (signal_key, geo_type, geo_code), which is also the upsert target (`ON CONFLICT`).
2. **No FK constraints.** Matches this codebase's convention (none of the 19 existing
   tables use FKs; integrity is app-level). Logical relationships are documented; a
   later FK migration is trivial because the registry is ordered (geo + catalog before
   values). Avoids refresh-job ordering/delete-reload friction.
3. **Mixed-type values** (`raw_value` numeric + `raw_value_text` text) cover the
   contract's `value: number | string | null`. The serve layer picks the non-null one.
4. **`normalized_value` / `percentile` columns exist now but are populated later** —
   when the normalization models land (Phase 7). The contract exposes them additively
   at the same time. Storing nullable now avoids a later `ALTER`.
5. **Boundary versioning** (`boundary_version`, 2011 vs 2021) is carried as an
   attribute; the spine loads one canonical set (2021). A real gotcha, surfaced not
   buried.
6. **`signal_timeseries` PK includes `observed_period`** so a monthly append is
   idempotent (re-running a period is a no-op upsert, never a duplicate). `captured_at`
   (when we snapshotted) is distinct from `observed_period` (what the value describes).
7. **Lineage:** every `signal_value` / timeseries row carries `source_snapshot_id` +
   `engine_version` → full auditability (the version-pinning part of the moat).

The catalog (`signals`) and the data are **seeded/populated by the refresh path**, not
the migrator (which is DDL-only).

## Consequences

**Positive**
- The data layer becomes real, persisted data. Unlocks cross-area query, time-series,
  lineage, lower latency, cost control.
- Additive + expand-contract: zero risk to live tables or the live app. The store is
  unread until `getAreaProfile` is flipped to read it (a later, flag-gated sub-task).
- `meta.fetch_mode` ("live"→"store") makes that flip non-breaking on the wire.

**Negative / accepted**
- No DB-enforced referential integrity (consistent with the codebase; mitigated by
  ordered registry + app-level checks).
- The schema is now defined + unit-tested (idempotent, ordered, present) but **not yet
  applied to any database** — applying it is a deploy-time action (the migrator runs at
  deploy or on explicit request), deliberately not run against the live Neon DB here.

## Alternatives considered

- **Surrogate `BIGSERIAL` ids on value tables** (like `report_history`). Rejected: the
  natural key is cleaner and is the upsert target; a surrogate adds no value here.
- **Single `signal_values` table with history inline** (a `is_current` flag). Rejected:
  separating current (`signal_values`) from history (`signal_timeseries`) keeps the
  hot read path small and the append path simple.
- **JSONB blob per area** (like `report_cache`). Rejected: defeats addressability and
  cross-area query — the whole point of the store.
