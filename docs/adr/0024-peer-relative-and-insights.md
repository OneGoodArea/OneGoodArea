# ADR 0024 — Intelligence Increment 7: peer-relative derived signals + `POST /v1/insights` (anomaly screening)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0005 (normalization — the [0,1] space we measure
  in), ADR 0017 (query plane v1), ADR 0018 (derived signals pattern),
  ADR 0023 (peers / k-NN — the similarity definition this consumes),
  [[product-architecture-mental-model]] (Intelligence surface #2; trainable
  models is a cross-cutting capability — this is its **first appearance**),
  MASTER §5/§6.

## Context

ADR 0023 shipped `POST /v1/peers` — the *similarity* primitive. The
companion question is *anomaly*: **"which LSOAs are unusually high or low
on signal X compared to their peer group?"** That's how an underwriter
spots emerging risk, how a lender flags catchments drifting from norm, and
how Monitor decides "this change matters" vs "this change is noise."

Per the product mental model, the anomaly model is "Monitor's brain," and
it sits at the intersection of three earlier pieces:

- **`peer_assignments`** (the similarity definition from ADR 0023 — now
  materialized so we can join against it).
- **Normalized signal values** (ADR 0005 — comparable per-signal scores
  in [0,1]).
- **Derived signal pattern** (ADR 0018 — z-scores stored in
  signal_values so the compound query grammar of ADR 0019 picks them up
  for free).

The cheapest defensible v1 metric is an **unsupervised z-score** against
the peer set: `(target_normalized - peer_avg) / peer_stddev_samp`. No
labels required; no model training; pure SQL over already-normalized
data. Calibrated against labelled outcomes is a future evolution (when
we have outcome data).

## Decision

### Materialize the peer graph

New table `peer_assignments`:

```
(geo_type, geo_code, peer_geo_code, peer_rank, distance, n_dims_used,
 computed_at, engine_version)
PRIMARY KEY (geo_type, geo_code, peer_geo_code)
```

42k LSOAs × default k=20 ≈ 840k rows. Computed by **`refresh:peers`** —
a write-only batch job that runs:

```
INSERT INTO peer_assignments (...)
SELECT 'lsoa', t.target_code, p.peer_code, p.peer_rank, p.distance, p.n_dims_used, '<engine>'
  FROM UNNEST($1::text[]) AS t(target_code)
  CROSS JOIN LATERAL (
    /* per-target k-NN: GROUP BY candidate, AVG dim-mean-squared, ROW_NUMBER, LIMIT K */
  ) p
ON CONFLICT (...) DO UPDATE ...
```

Same distance metric as `POST /v1/peers` (ADR 0023): Euclidean over
normalized values, dimension-mean-squared. **One definition of "peer"
across the surface.** HAVING `n_dims_used >= 3` rejects sparse overlap.

**Chunking is non-negotiable.** The full 42k-target LATERAL query
exceeded Neon's serverless-driver ~5min HTTP cap in the first prod
attempt. The orchestrator now lists targets once, slices them into
2k-target chunks (configurable via `chunkSize`), and runs one INSERT per
chunk. Each chunk: a few seconds; total full refresh: a few minutes.
Each chunk is idempotent (`ON CONFLICT DO UPDATE`), so a partial run on
failure is safe to resume from a re-invoke.

### Peer-relative z-score derivation

New parameterized builder `buildPeerRelativeZSql({sourceSignalKey,
derivedKey, minPeers, confidenceReason, engineVersion?})` in
`apps/api/src/modules/signals/refresh/derive.ts`. Three CTEs:

1. `target_norm` — each LSOA's normalized_value on the source signal.
2. `peer_stats` — JOIN `peer_assignments` × `signal_values` (peers'
   normalized_value on the same signal); aggregate `AVG`,
   `STDDEV_SAMP`, `COUNT` per target; `HAVING COUNT >= minPeers`
   (default 5, so the stddev is meaningful).
3. `z` — JOIN target_norm × peer_stats; compute `z = (target_norm -
   peer_avg) / NULLIF(peer_stddev, 0)`; `WHERE peer_stddev > 0`
   (defends against degenerate peer sets with zero variance).

Then `INSERT INTO signal_values (signal_key=<derivedKey>, raw_value=ROUND(z, 4),
 ...) ON CONFLICT DO UPDATE`.

Two signals ship with this increment:

| Derived key                                | Source signal               | Direction       |
|--------------------------------------------|-----------------------------|-----------------|
| `crime.total_12m_peer_relative_z`          | `crime.total_12m`           | lower_is_better |
| `property.median_price_peer_relative_z`    | `property.median_price`     | neutral         |

Each is queryable through `/v1/query` `rank_areas` immediately (the
compound grammar of ADR 0019 picks them up unchanged — that's the whole
point of using `signal_values` as the storage primitive).

### `POST /v1/insights`

```
{ "signal_key": "crime.total_12m_peer_relative_z",
  "country": "England" | "Wales" | "Scotland" (optional),
  "lad": "<ONS LAD code>" (optional),
  "min_abs_z": 2 (optional; default 0 = no threshold),
  "k": 50 (optional; default 50, max 500) }
```

Returns LSOAs ranked by `ABS(peer_relative_z) DESC, geo_code ASC`. The
query-time work is trivial — a single ORDER BY over the
peer-relative-z column with optional country/LAD scope and `ABS(...) >=`
filter. **No on-the-fly z computation** — peer math is materialized
offline (refresh:peers + derive). This keeps the surface fast and the
methodology explicit.

`parseInsightsInput` **requires** the signal_key to end in
`_peer_relative_z`. Anomaly screening against a raw signal is a
different question (and a different ADR); this surface answers
*peer-relative* anomalies only, by construction.

### `find_insights` plan op

Symmetric with `find_peers` from ADR 0023. Added to `QueryPlanSchema`;
the executor dispatches `find_insights` through the SAME
`parseInsightsInput` + `findInsights` used by the endpoint. One
implementation, two surfaces.

### Cron pipeline

`signal-refresh.yml` updated to the explicit chain:

```
migrate → refresh:* (raw sources) → derive:signals (non-peer)
→ normalize:signals (covers raw + non-peer derived)
→ refresh:peers (the similarity graph, off the normalized vectors)
→ derive:signals (now the peer-relative-z specs find peer_assignments populated)
→ normalize:signals (idempotent; covers the new peer-relative-z signals)
→ timeseries:append (the moat clock)
```

Two `derive:signals` passes is the simplest correct sequence: the
non-peer derivations write on the first pass; the peer-relative-z
derivations write on the second pass after peer_assignments exists.
Both are idempotent so the first pass re-running the YoY etc. is a
no-op (`ON CONFLICT DO UPDATE` with the same data).

## Consequences

**Positive**

- **Anomaly is a derived signal.** It composes through the existing
  compound `rank_areas` grammar (ADR 0019) for free — callers can
  filter, sort, mix it with raw signals in one typed plan. The
  `/v1/insights` endpoint + `find_insights` plan op are
  *conveniences* over that primitive, not net-new infrastructure.
- **One definition of "peer" across the surface.** `/v1/peers` (ADR
  0023), peer-relative derived signals (this ADR), and any future
  peer-aware smoothing (deferred property median-price slope) all
  read from the same `peer_assignments` materialization.
- **Methodology is auditable.** The z-score formula is in the SQL
  builder + this ADR; every emitted row carries `confidence_reason`
  + `observed_period` ("peer-relative z over N peers"); the peer
  assignment itself is materialized and inspectable.
- **Foundation for label-supervised models.** When outcome data
  arrives (which lender lost on this catchment? which area had a
  claims spike?), the same z-score pipeline becomes the unsupervised
  baseline a supervised model is evaluated against.
- **The peers + insights pair is the FIRST appearance of the
  trainable-models capability** per the product mental model.
  Subsequent capabilities (forecasting, calibration) extend the same
  peer-graph foundation.

**Negative / accepted**

- **Per-org / Levers peer groups are deferred.** Today everyone shares
  the same global peer graph. When Levers (cross-cutting capability)
  arrives, `peer_assignments.scope_key` can specialize per-org peer
  definitions; the table schema is forward-compatible (just add a
  `scope_key TEXT DEFAULT ''` column when needed; current PK becomes
  `(scope_key, geo_type, geo_code, peer_geo_code)`).
- **The 5-minute Neon HTTP cap forced chunking.** Documented + tested.
  Re-runs are safe (idempotent UPSERT). Trade-off: more round-trips,
  but each is bounded. A pool/TCP driver would lift the cap but is
  out of scope for this commit.
- **Unsupervised z-score is a starting metric.** Real "anomaly"
  varies by use case (insurance underwriting vs lender risk vs
  PropTech surfacing). v1 ships the cleanest defensible baseline;
  per-org calibrated variants land with Levers + labelled-outcome
  data.
- **`min_abs_z` is a request parameter, not a global threshold.** Some
  callers (research) want the full ranked list; others (alerting)
  want only |z| ≥ 2 or 3. The request parameter keeps the contract
  flexible without committing to one ICP's interpretation.
- **`peer_stddev > 0` filter drops some LSOAs.** If all an LSOA's
  peers have identical normalized value on the source signal (rare
  but possible at the extremes), the z is undefined. Drop-the-row
  is correct; `NULLIF(stddev, 0)` belt-and-braces the divide.
- **`min_abs_z` filter happens AFTER the derive job writes the full
  ranked list.** The peer-relative-z column carries the full
  precision (signed z); thresholds are applied at query time.
  This means a single derive run answers many different threshold
  questions, which is what you want.

## Alternatives considered

- **Compute peer-relative z on the fly per /v1/insights request.**
  Rejected — would require finding peers per LSOA per request (the
  O(N²) trap). Materializing peer_assignments + the z-score signal
  trades a slow offline batch for a fast online surface, which is
  exactly the right trade for "screening" use cases.
- **k-means cluster assignments instead of k-NN.** Rejected for v1 —
  requires choosing K (the cluster count); needs its own ADR; harder
  to extend to per-org Levers later. k-NN is the simpler primitive
  and matches `POST /v1/peers`'s definition.
- **Use ranks instead of z-scores (e.g. "rank within peer group").**
  Rejected — loses the magnitude signal. A z of 4.5 vs 2.5 is
  meaningfully different; both would be "rank 1" in a small peer
  group.
- **Bundle peer-relative on a different signal stash (a new
  `peer_relative_signals` table).** Rejected — the whole point of
  writing them into `signal_values` is so the existing compound
  grammar (ADR 0019) picks them up. Separate tables would fragment
  the query surface.
- **Standardize via robust statistics (median + MAD instead of mean +
  stddev).** Rejected for v1 — `STDDEV_SAMP` is in-engine and
  straightforward to reason about. MAD-based z is a future
  refinement when outliers among peers become a measured problem.
- **Compute the SQL refresh job in one statement (no chunking).**
  Rejected after the first prod attempt timed out at the Neon HTTP
  cap. Chunking is the right answer; idempotent UPSERTs make it
  safe.
