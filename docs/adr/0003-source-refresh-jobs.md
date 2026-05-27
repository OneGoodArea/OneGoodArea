# ADR 0003 — Source refresh jobs (populating the signal store)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** ADR 0002 (the store schema); `MASTER-PROPOSAL.md` §3; Jira AR-171.

## Context

The store schema exists (ADR 0002) but is empty. We need a repeatable way to
populate it from each source — the "refresh on schedule" half of the
fetch-on-read → serve-from-store shift. The first source is **deprivation**
(static, LSOA-grained, nationally complete, and partly its own geo universe).

## Decision

**A two-part pattern, reused by every source:**

1. **A reusable store-writer** (`modules/signals/refresh/store-writer.ts`) owns
   the persistence shape in one place: `buildUpsertSql` (pure, builds a
   parameterized multi-row `INSERT … ON CONFLICT … DO UPDATE`) + `bulkUpsert`
   (chunked, idempotent) + four domain writers (`writeSnapshots`,
   `upsertSignalCatalog`, `upsertGeoEntities`, `upsertSignalValues`). Writes go
   through a new parameterized `query()` on the DB client (the tagged-template
   `sql` can't express dynamic multi-row inserts).

2. **A per-source refresh job** (`refresh/deprivation.ts` first) = **pull →
   pure transform → write**:
   - *pull*: paginate the source (deprivation uses the same ArcGIS FeatureServers
     the live per-LSOA fetcher uses, but bulk: `where=1=1` + `resultOffset`).
   - *transform*: a **pure** `toStoreRows` (records → geo entities + signal
     values) — the unit-tested heart.
   - *write*: the store-writer.

**Key properties:**
- **Injectable network + DB.** The job takes an optional `fetchFn` and
  `QueryRunner`, so it is fully unit-testable without ArcGIS or Postgres. (Default
  to real `fetch` + the real query runner.)
- **Idempotent.** Re-running overwrites the *current* `signal_values` in place
  (upsert on the natural key); `source_snapshots` are append-only provenance with
  a generated id per run. A refresh is safe to re-run any time.
- **Chunked bulk writes** (default 500 rows/statement) — scalable to the ~42k
  LSOAs × signals without 84k individual round-trips.
- **CLI entry per job** (`npm run refresh:deprivation -w @onegoodarea/api`), to be
  run at deploy / on a cron — never in a request path.
- **Catalog parity:** the signal keys/labels/direction the job writes match
  `area-profile.ts` exactly, so a store-served signal is byte-identical to a
  live-served one. This is the precondition for the later `fetch_mode → "store"`
  flip being non-breaking.
- **Lineage:** every value carries `source_snapshot_id` + `engine_version`; each
  country is its own snapshot (England IMD 2025 / Wales WIMD 2019 / Scotland SIMD
  2020), so per-area provenance is exact.

## Consequences

**Positive**
- One reusable write layer + a thin per-source job → adding the next source
  (Land Registry, OSM, …) is a small, well-trodden change.
- Pure transform + injected I/O → high-confidence tests with no live calls.
- Idempotent + chunked → safe and scalable refreshes.

**Negative / accepted**
- **Not run against any DB yet.** The job is built + tested; the first real run
  (which writes to live Neon and hits live ArcGIS) is a deploy-time action,
  deliberately deferred (same posture as the migration).
- ArcGIS pagination uses a returned-count + `exceededTransferLimit` heuristic to
  detect the last page; robust to server-side `maxRecordCount` caps, with a hard
  iteration ceiling as a safety valve.
- Per-area latitude/longitude are left null for deprivation (the IMD feeds don't
  carry centroids in the fields we pull); the ONS geo spine (later) fills geometry.

## Alternatives considered

- **Cache-aside / populate-on-read** (write to the store lazily as `/v1/area` is
  called). Rejected as the *primary* mechanism: it only ever holds areas someone
  asked about, so it can't power cross-area query or full-grid time-series — the
  whole point of the store. (It remains a possible latency optimization on top.)
- **A heavy ETL framework / COPY pipeline.** Rejected as premature: chunked
  parameterized upserts over the serverless driver are sufficient at this scale
  and keep the job in-process and testable.
- **Per-LSOA fetch in a loop** (reuse the live fetcher 42k times). Rejected:
  rate-limited and slow; the bulk paginated pull is one pass.
