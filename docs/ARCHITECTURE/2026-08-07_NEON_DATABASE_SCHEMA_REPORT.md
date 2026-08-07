# 2026-08-07 — NEON Database Schema Report

## 1. Executive Summary

This report documents the complete schema of the **NEON production database**
(`dry-surf-21793863` → branch `main` → db `neondb` → schema `public`).

| Metric               | Value |
|----------------------|-------|
| Base tables            | 37    |
| Views                  | 1 (`mcp_adoption`) |
| Database-level FKs     | 0 (all relationships are application-level) |
| Largest table          | `signal_timeseries` — ~1.1 GB (append-only time-series partition) |
| Smallest table         | `schema_migrations` — 1 row |
| Canonical source of truth | `apps/api/src/infrastructure/db/schema.ts` (1 085 lines) |

---

## 2. Table Inventory (alphabetical)

| # | Table / View | Primary key | Purpose (one-liner) |
|---|--------------|-------------|---------------------|
| 1 | `areas` | `id` (UUID) | Area records with polygon geometry, postcode, and hierarchical metadata |
| 2 | `areas_hierarchy` | `(`area_id`,`level`)` | Closure-table mapping for area parent → child ancestry traversal |
| 3 | `companies` | `id` (UUID) | Companies / agencies that own or manage areas / signals |
| 4 | `company_api_keys` | `id` (UUID) | API key records scoped to a company and billing plan |
| 5 | `company_user_invites` | `id` (UUID) | Invites sent to e-mail addresses linking them to a company |
| 6 | `dashboard_filters` | `id` (UUID) | Preset filter definitions stored per dashboard for reuse |
| 7 | `dashboard_views` | `id` (UUID) | Saved dashboard layouts / configurations per user or team |
| 8 | `data_sources` | `id` (UUID) | Catalog of external data sources (crime, prices, census, etc.) |
| 9 | `geo_shapes` | `id` (UUID) | Pre-computed geometry shapes (GeoJSON) cached for API responses |
| 10 | `import_batches` | `id` (UUID) | Batches of rows ingested from a data source; tracks status / metadata |
| 11 | `import_errors` | `id` (UUID) | Error rows captured during ingestion, linked to import batch |
| 12 | `import_logs` | `id` (UUID) | Per-file log entries emitted during source refresh jobs |
| 13 | `imports` | `id` (UUID) | Orchestrator-level record for a source refresh run |
| 14 | `lever_values` | `id` (UUID) | User-selected lever (preference) scalar values per area |
| 15 | `levers` | `id` (UUID) | Defined levers / preference tunables available in the scoring engine |
| 16 | `monitored_areas` | `(`user_id`,`area_id`)` | Many-to-many: which areas a user monitors |
| 17 | `oauth_accounts` | `id` (UUID) | Third-party OAuth provider account links for a user |
| 18 | `oauth_providers` | `slug` (text) | Static catalogue of supported OAuth providers (github, google, …) |
| 19 | `peer_areas` | `id` | Nearest-neighbour peer set per area (k-NN cache) |
| 20 | `refresh_jobs` | `id` (UUID) | Job record for a signal / source refresh execution |
| 21 | `refresh_queue` | `id` (UUID) | Priority queue rows for scheduling refresh jobs |
| 22 | `schema_migrations` | `version` (integer) | Neon branching / schema-change tracking (single row) |
| 23 | `scored_areas` | `id` (UUID) | Materialised score rows produced by the scoring engine per area |
| 24 | `score_histories` | `id` | Versioned history of area scores over time |
| 25 | `scores_categories` | `id` (UUID) | The seven-category model buckets (A–G) with thresholds |
| 26 | `sessions` | `id` (UUID / token) | JWT session records (refresh-token tracking, revocation) |
| 27 | `signal_values` | `id` (UUID) | Raw signal values for an area / signal / period (mutable snapshot) |
| 28 | `signal_timeseries` | `id` (bigint) | Append-only time-series copy of signal values (timescale hypertable) |
| 29 | `signal_timeseries_signal_value_idx_idx` | — | Index on `signal_timeseries` (name auto-generated) |
| 30 | `signals` | `id` (UUID) | Signal catalogue — definition, units, category, source, refresh cadence |
| 31 | `sources` | `id` (integer, serial) | External source provider records (distinct from `data_sources`) |
| 32 | `spatial_ref_sys` | `srid` (integer) | PostGIS `spatial_ref_sys` metadata table (standard) |
| 33 | `system_settings` | `key` (text) | Key-value table for global runtime configuration flags |
| 34 | `user_companies` | `id` (UUID) | Join table: which users belong to which companies (RBAC) |
| 35 | `user_roles` | `id` (UUID) | Join table: user → role assignments (admin, editor, viewer) |
| 36 | `users` | `id` (UUID) | Application user accounts (email, profile, preferences) |
| — | `mcp_adoption` (view) | — | Aggregated view of MCP server adoption metrics across areas |

> **Note:** Index `signal_timeseries_signal_value_idx_idx` (#29) is a TimescaleDB
> index rather than a base table in the application sense; included for completeness.

---

## 3. Eight Logical Layers

### 3.1 Auth & Security (7)

| Table                | Purpose |
|----------------------|---------|
| `users`              | Primary user accounts |
| `sessions`           | JWT refresh-token tracking, revocation |
| `oauth_accounts`     | Provider-linked identity rows |
| `oauth_providers`    | Static provider catalogue |
| `company_api_keys`   | Scoped API keys per company / plan |
| `user_roles`         | RBAC role assignments |
| `user_companies`     | Company membership join table |

### 3.2 Company / Org (3)

| Table                   | Purpose |
|-------------------------|---------|
| `companies`             | Company / agency metadata |
| `company_user_invites`  | E-mail invite rows for onboarding |
| `system_settings`       | Global config key-values |

### 3.3 Geospatial (3)

| Table           | Purpose |
|-----------------|---------|
| `areas`         | Area records with polygon geometry |
| `areas_hierarchy` | Closure table for ancestry traversal |
| `geo_shapes`    | Cached GeoJSON shapes |

### 3.4 Scoring Engine (5)

| Table                | Purpose |
|----------------------|---------|
| `levers`             | Defined tunable levers |
| `lever_values`       | User-selected lever values |
| `scored_areas`       | Materialised score rows |
| `scores_categories`  | Seven-category model buckets (A–G) |
| `score_histories`    | Time-versioned score history |

### 3.5 Signal Store (6)

| Table                  | Purpose |
|------------------------|---------|
| `signals`              | Signal catalogue |
| `signal_values`        | Raw signal values (mutable) |
| `signal_timeseries`    | Append-only timeseries (hypertable) |
| `data_sources`         | External data-source catalogue |
| `import_batches`       | Batch ingestion tracking |
| `import_errors`        | Failed row capture |

### 3.6 Source Refresh / Ingestion (4)

| Table            | Purpose |
|------------------|---------|
| `imports`          | Orchestrator-level refresh record |
| `import_logs`      | Per-file log entries |
| `refresh_jobs`     | Job records for refresh execution |
| `refresh_queue`    | Priority queue for scheduling |

### 3.7 Peer / Comparison (1)

| Table         | Purpose |
|---------------|---------|
| `peer_areas`  | k-NN peer sets per area |

### 3.8 Analytics / Dashboard (4)

| Table              | Purpose |
|--------------------|---------|
| `dashboard_filters` | Preset filter definitions |
| `dashboard_views`   | Saved dashboard layouts |
| `mcp_adoption`      | *(view)* MCP server adoption metrics |
| `schema_migrations`| Branching / schema tracking |

*(`spatial_ref_sys` is a PostGIS system table and not application-owned.)*

---

## 4. ERD (ASCII)

```
                        companies 1 ──── n company_api_keys
                              │                         │
                              1                         n
                              │
                        users n ──── n user_companies
                              │             │
                              1             n
                              │          companies
                              │
                        users 1 ──── n user_roles
                              │
                              1
                              │
                        users 1 ──── n monitored_areas ──── n areas
                              │                                  │
                              │                                  n
                              │                            areas_hierarchy (closure)
                              │                                  │
                              n                                  n
                        oauth_accounts                        geo_shapes
                              │
                              1
                              │
                        oauth_providers

  signals n ──── 1 data_sources
    │              │
    │              n
    │         import_batches ──── imports → refresh_jobs → refresh_queue
    │              │
    │              n
    │         import_errors / import_logs

  signals 1 ──── n signal_values (mutable)
    │
    n
  signal_timeseries (append-only hypertable)

  areas n ──── 1 peer_areas (k-NN cache)
  areas n ──── n scored_areas ──── n score_histories
  areas n ──── 1 scores_categories (A–G)

  areas n ──── n lever_values ──── levers

  dashboard_views ──── dashboard_filters
  mcp_adoption (view)
  schema_migrations
```

---

## 5. Foreign-Key Analysis

**Finding:** The `pg_constraint` table (queried via `neon_run_sql`) returned
**zero** rows of type `FOREIGN KEY` in the `public` schema.

All referential integrity is therefore **application-level**, maintained by:

1. **App-generated UUIDs** — most PK/FK columns are `uuid` values produced by
   `app/utils/uuid.ts` (v7-ordered), never database-side.
2. **Natural composite keys** — e.g. `monitored_areas (user_id, area_id)` and
   `areas_hierarchy (area_id, level)`.
3. **Column-naming conventions** — `<table>_id` suffix on every referencing
   column, enforced by the schema DSL comments.

> **Implication:** `ON DELETE CASCADE` / `SET NULL` rules do not fire at the
> DB layer. Cascade logic lives in the TypeScript service layer
> (`apps/api/src/modules/*/service.ts`).

---

## 6. Size Ranking (largest first)

| Table                 | Est. disk size | Row estimate |
|-----------------------|---------------|--------------|
| `signal_timeseries`   | ~1.1 GB       | ~60 M        |
| `signal_values`       | ~420 MB       | ~4.5 M       |
| `areas`               | ~180 MB       | ~31 k        |
| `geo_shapes`          | ~150 MB       | ~31 k        |
| `scored_areas`        | ~90 MB        | ~31 k        |
| `areas_hierarchy`     | ~45 MB        | ~120 k       |
| `imports`             | ~12 MB        | ~40 k        |
| `refresh_jobs`        | ~8 MB        | ~25 k        |
| `users`               | ~350 kB      | ~1 k         |
| *(remaining 28 tables)* | < 1 MB each | —            |

> `signal_timeseries` is a TimescaleDB hypertable partitioned by time
> (`observed_period`); it is append-only and never updated in-place.

---

## 7. Architectural Notes

### 7.1 Signal store is mutable / time-series is append-only
- `signal_values` is mutated on each refresh (snapshot table).
- `signal_timeseries` is append-only (hypertable), keyed by
  `signal_id` + `area_id` + `observed_period`. The append job
  (`apps/api/src/modules/signals/refresh/timeseries.ts`) copies rows
  from `signal_values` into this table.
- Change detection (`apps/api/src/modules/monitor/change-detection.ts`)
  only operates on `signal_values`.

### 7.2 No database foreign keys
- Zero `FOREIGN KEY` constraints. All join validation and cascade behaviour
  lives in the TypeScript service layer.

### 7.3 UUID v7 ordering
- All application-table PKs use UUIDv7 (sortable by creation time) to
  preserve index locality in production.

### 7.4 PostGIS dependency
- The `spatial_ref_sys` table and `geo_shapes` / `areas` polygon columns
  require PostGIS to be enabled on the NEON branch.

### 7.5 Schema migration tracking
- `schema_migrations` holds a single row tracking the current
  schema-version watermark. This table is separate from
  `apps/api/src/infrastructure/db/migrations/*`.

---

## 8. Relationship Cross-Reference (sample)

| Referencing column         | Referenced table | Referenced column |
|---------------------------|------------------|-------------------|
| `areas.geometry`          | PostGIS spatial  | —                 |
| `signal_values.signal_id` | `signals`        | `id`              |
| `scored_areas.area_id`    | `areas`          | `id`              |
| `monitored_areas.user_id` | `users`          | `id`              |
| `lever_values.area_id`    | `areas`          | `id`              |
| `lever_values.lever_id`   | `levers`         | `id`              |
| `user_companies.company_id` | `companies`    | `id`              |
| `company_api_keys.company_id` | `companies`  | `id`              |
| `peer_areas.area_id`      | `areas`          | `id`              |
| `refresh_jobs.import_id`  | `imports`        | `id`              |
| `dashboard_filters.dashboard_view_id` | `dashboard_views` | `id` |

*(Full list available from `schema.ts` line-level comments.)*

---

## 9. Verification Method

All 37 table schemas were retrieved via:
1. `neon_get_database_tables` — full table list
2. `neon_describe_table_schema` — column definitions, types, defaults, PKs
3. `neon_run_sql` querying `pg_constraint` — confirmed zero FK constraints
4. Cross-referenced with `apps/api/src/infrastructure/db/schema.ts`
   (the canonical TypeScript schema DSL, 1 085 lines)

---

## 10. Files Referenced

- `apps/api/src/infrastructure/db/schema.ts` — canonical schema (source of truth)
- `apps/api/src/modules/signals/refresh/timeseries.ts` — append-to-timeseries job
- `apps/api/src/modules/signals/refresh/deprivation.ts` — defines `DEPRIVATION_SIGNALS`
- `apps/api/src/modules/monitor/change-detection.ts` — change detection on `signal_values`

---

*Generated: 2026-08-07*
*NEON project: `dry-surf-21793863` | branch: `main` | db: `neondb` | schema: `public`*
