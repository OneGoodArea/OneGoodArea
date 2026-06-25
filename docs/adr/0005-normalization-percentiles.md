# ADR 0005 — Normalization (percentiles + normalized values)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** ADR 0002 (schema), ADR 0003 (refresh); MASTER section 3, section 7; AR-171.

## Context

The store holds raw values (deprivation first). Raw values aren't the product —
**normalized, comparable values are** (MASTER section 7: normalization across GB's
mismatched indices is "boring, hard, valuable" and the #1 defensible asset). A
raw IMD rank is hard to use; a national percentile is instantly model-ready. We
need to compute this over the stored data and persist it.

## Decision

1. **Compute in the database** with `PERCENT_RANK()` window functions, not in the
   app. Scalable (no 85k-row round-trip), and the natural tool for ranking a
   distribution. The job is a handful of SQL statements run via the parameterized
   `query()`.

2. **Persist to two places:**
   - `signal_percentiles` — per-scope percentile rank (0-100), upserted.
   - `signal_values.normalized_value` — the national position (0-1), updated in place.

3. **Scope discipline.** Deprivation is normalized **within each country**
   (`scope='national'`, `scope_key = country`). England IMD 2025, Wales WIMD 2019
   and Scotland SIMD 2020 are different methodologies and are **not comparable
   across the border** — offering a cross-GB deprivation percentile would be a
   methodological lie. Regional and LAD scopes come with the ONS geo spine (which
   provides region/LAD membership).

4. **`normalized_value` is a direction-agnostic position** — ascending by
   `raw_value`, 0 = lowest, 1 = highest. The signal's `direction` tells the
   consumer how to read it (deprivation is `higher_is_better`: a higher IMD rank
   means less deprived, so a higher normalized value is "better"). Keeping
   normalization and direction orthogonal avoids baking interpretation into the
   number.

5. **Idempotent** — re-running recomputes in place (UPDATE + upsert).

## Consequences

**Positive**
- The differentiator (comparable, model-ready numbers) now exists on real data,
  computed by a reusable job every future signal will use.
- Scalable + in-DB; no large data movement.
- Methodologically honest (within-country only; no false cross-border comparison).

**Validated against prod Neon** (the proof): 85,280 percentile rows; E01000001
imd_rank 26525 → normalized 0.786 / national percentile 78.58 (= 26525/33755);
England distribution spans 0.00–100.00 across all 33,755 LSOAs.

**Negative / accepted**
- SQL-native ⇒ unit tests cover the SQL builders + orchestration; the integration
  is validated by the prod run + read-back (same posture as the migrator).
- `normalized_value` / `percentile` are computed + stored but **not yet exposed
  via `/v1/area`** — the serve-wiring (a store-native read that emits these on the
  Signal, + the additive contract fields per ADR 0001) is the next increment.
- Only `national` scope today; `regional`/`lad`/`peer_group` await the geo spine
  + peer-group models (Phase 7).

## Alternatives considered

- **Compute percentiles in the app (JS).** Rejected: round-trips the whole
  distribution into the process; the DB does this far better at any scale.
- **Bake direction into `normalized_value`** (so 1 always = "good"). Rejected:
  less honest and redundant — `direction` is already on the signal; keep the
  number a pure position.
- **Cross-GB deprivation percentile.** Rejected: the three indices aren't
  comparable; it would be a false precision.
