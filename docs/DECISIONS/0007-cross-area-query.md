# ADR 0007 — Cross-area query (`GET /v1/areas`)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** ADR 0002 (store), ADR 0005 (percentiles), ADR 0006 (geo spine); AR-171.

## Context

The persisted store + normalized percentiles + geo spine together unlock the
capability the live-fetch product never had: **querying across areas**. "Find the
LSOAs (within a country/LAD) where signal X is in the bottom decile, ranked" is
the data-infrastructure differentiator vs a one-area-at-a-time report API.

## Decision

`GET /v1/areas?signal=&country=&lad=&max_percentile=&min_percentile=&min_value=&max_value=&sort=&limit=`:

- Reads `signal_values` LEFT JOIN `signal_percentiles` (national scope), filtered +
  ranked, capped (`limit` default 100, max 1000).
- **Country is scoped by the LSOA code PREFIX** (`E`/`W`/`S`), not the
  `geo_entities.country` column. This is robust and deliberate: the country column
  currently holds a **mix** of names (written by the deprivation refresh) and
  codes (written by the NSPL geo-spine load, which upserts the same rows). The
  code prefix is unambiguous and needs no join. (Normalizing the country column to
  codes everywhere is a separate cleanup.)
- **LAD is scoped via the geo spine** (`geo_code IN (SELECT DISTINCT lsoa_code FROM
  geo_lookup WHERE lad_code = $n)`) — this is the spine paying off.
- Pure `parseAreasQuery` (validate/coerce params) + `buildAreasQuery` (parameterized
  SQL) keep the rules unit-testable; `queryAreas` runs it.
- Same `OGA_SIGNALS_API` dark flag + `requireApiAccess` gate as `/v1/area`; meters
  `api.areas.queried`.

## Consequences

**Positive**
- The differentiator exists and is **proven on real prod data**: the 8
  most-deprived England LSOAs, and Manchester's most-deprived LSOAs via the LAD
  spine join.
- Filters compose (country/LAD × percentile/value × sort), parameterized + capped.

**Negative / accepted**
- **Region scope not yet supported** — `geo_lookup` has no region index and region
  values are codes; add when needed.
- **LAD scope depends on the loaded spine** (now loaded: 1.8M postcodes).
- **Country-by-prefix** is a pragmatic robustness choice around the
  `geo_entities.country` name/code inconsistency (tracked cleanup: normalize that
  column to codes; the deprivation refresh should write country codes, not names).
- Performance: the LAD subquery scans `geo_lookup` via the `lad_code` index; fine
  at current scale, revisit with EXPLAIN if large LADs get slow.

## Alternatives considered

- **Filter by `geo_entities.country`.** Rejected — that column holds mixed
  name/code values today, so a prefix filter is more reliable.
- **Store the LSOA→LAD/region hierarchy in `geo_entities`** (42k rows) instead of
  subquerying 1.8M `geo_lookup` rows. A reasonable future optimization; the
  subquery is simple + indexed for now.
