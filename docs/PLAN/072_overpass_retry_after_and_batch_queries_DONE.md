# 072 — Overpass Performance: Retry-After + Query Batching

**Created:** 2026-08-05
**Story:** AR-724
**Tasks:** AR-725 (Retry-After), AR-726 (batching), AR-727 (tests)
**Status:** In Progress

## Purpose

Reduce cold-path `/v1/area` latency by optimizing the Overpass API integration:
1. Honor `Retry-After` headers on 503 responses (spec-compliant cooldown)
2. Batch 8 per-category queries into 4 union queries by radius group (50% fewer HTTP round-trips)

## Context

Performance analysis of showcase runs (M1 1AE, HA1 1SB) showed:
- Amenities consistently takes ~8s on cold path (hits AbortSignal timeout)
- `overpass.openstreetmap.fr` returns 503 on stations/bus_stops (5 occurrences)
- Current code treats 503 same as any error (fixed 60s cooldown, no Retry-After)
- 8 separate Overpass queries fire per request; can be batched to 4 by radius

## Changes

### AR-721: Retry-After on 503

In `tryMirror()` (openstreetmap.ts:183-186), parse `Retry-After` header from 503
responses and use it for mirror cooldown, capped at `OVERPASS_COOLDOWN_MS` (60s).

### AR-722: Batch by Radius

Replace flat `CATEGORIES` array with `RADIUS_GROUPS`:

| Group | Radius | Categories |
|-------|--------|------------|
| 1500m | 1500 | schools, healthcare, parks_leisure |
| 1000m | 1000 | food, pubs_bars, shops |
| 2000m | 2000 | stations |
| 500m | 500 | bus_stops |

New `fetchBatch()` builds union Overpass QL:
```overpassql
[out:json][timeout:10];
(
  nwr["amenity"~"^(school|...)$"](around:1500,lat,lng);
  nwr["amenity"~"^(pharmacy|...)$"](around:1500,lat,lng);
  nwr["leisure"~"^(park|...)$"](around:1500,lat,lng);
);
out tags center;
```

Returns `Map<string, OverpassElement[]>` keyed by category name.
Tag classifier unchanged — already handles mixed elements.

### AR-723: Test Updates

- Call count expectations: 8 → 4 per cold-path request
- Mirror cooldown test: 16 → 8 (4 batches × 2 mirrors)
- New test cases for Retry-After parsing

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/modules/signals/data-sources/openstreetmap.ts` | Retry-After parsing + radius batching |
| `apps/api/tests/modules/signals/data-sources/openstreetmap.test.ts` | Updated tests |

## Verification

- [ ] `npm run typecheck --workspace=apps/api`
- [ ] `npm test --workspace=apps/api` (openstreetmap.test.ts)
- [ ] Manual: `docker compose up` → hit `/v1/area?postcode=M1 1AE` → verify amenities in <4s
- [ ] Check logs for `[overpass] category served by fallback mirror` with batch queries
