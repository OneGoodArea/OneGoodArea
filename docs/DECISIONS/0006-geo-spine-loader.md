# ADR 0006 — The ONS geo spine loader

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** ADR 0002 (schema), ADR 0003 (store-writer); MASTER section 3 (ONS verdict); AR-171.

## Context

The store holds signals keyed by LSOA, but there is no `postcode → OA/LSOA/MSOA/LAD/region`
spine. That spine is what unlocks **cross-area query** (the data-infra
differentiator) and store-side postcode resolution (today every request resolves
via postcodes.io). The source is ONS NSPL/ONSPD — a free bulk CSV, but ≈1GB / ~1M
rows, so it cannot live in git and must be streamed.

## Decision

1. **A streaming, config-driven loader** (`refresh/geo-spine.ts`) reads an
   NSPL/ONSPD CSV line-by-line (never loading the whole file into memory) and
   chunked-upserts into `geo_lookup` (+ asserts each LSOA into `geo_entities`),
   reusing the store-writer. `npm run load:geo -- <path>`.

2. **Full file out of git; small real seed in git (Option B).** Download NSPL from
   ONS Open Geography and run the loader; `apps/api/seed/nspl-sample.csv` (12 real
   postcodes across England/Wales/Scotland, sourced from postcodes.io) is
   committed so CI/dev exercise the loader without the 1GB file.

3. **Column mapping is config-driven** (`NSPL_COLUMNS`, 2021 names) and validated
   against the file header at load time (throws loudly if `pcds`/`lsoa` are
   missing), because ONS occasionally renames columns between releases.

4. **`region`/`country` are passed through as-is.** The seed carries human names;
   real NSPL carries codes (e.g. `E12000001`). The loader does not transform
   them, so the stored value reflects the source file. Consumers should treat the
   field as opaque-per-load. (A names lookup can be layered later.)

5. **`boundary_version = "2021"`**, idempotent (upsert on `postcode`).

## Consequences

**Positive**
- Unlocks cross-area query, store-side postcode resolution, regional/LAD
  percentile scopes, and (once postcodes resolve to the right boundary codes)
  Wales/Scotland store-read for deprivation.
- Streaming + chunked → scales to the full ~1M-row file.
- Pure parts (`parseCsvLine`, `buildHeaderIndex`, `rowToGeo`) are unit-tested;
  the loader was **proven on prod** with the seed (12 postcodes → `geo_lookup`,
  GB spread verified).

**Negative / accepted**
- The **full data load is deferred** until the NSPL file is provided (a deploy /
  manual step + the GitHub Actions cron can run it) — same posture as the
  migration + refresh.
- `region`/`country` name-vs-code depends on the source file (documented above).
- Column names can vary by ONS release; the config + header validation handle it,
  but the mapping should be eyeballed against the actual file header on first use.

## Alternatives considered

- **Keep resolving via postcodes.io per request** (today). Fine for single-area
  reads, but cannot do cross-area query and adds a network hop; the spine removes
  both limits.
- **Commit the full NSPL file.** Rejected — ~1GB in git is untenable.
- **A paid postcode/geo API.** Unnecessary; NSPL is free and authoritative.
