# ADR 0023 — Intelligence Increment 6: `POST /v1/peers` — k-NN over normalized signal values

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0005 (normalization + percentiles, the space we
  measure in), ADR 0007 (cross-area query — the same scope vocabulary),
  ADR 0017 (query plane v1), ADR 0019 (compound `rank_areas` grammar),
  [[product-architecture-mental-model]] (trainable models is a cross-cutting
  capability; peers is the gateway), MASTER section 6.

## Context

The compound `rank_areas` grammar (ADR 0019) and the derived-signals layer
(ADR 0020-0022) answer the *filter-and-rank* question well: "give me areas
where these N constraints hold, ordered by some signal." That is the
discovery primitive.

The complement is the *similarity* question: **"give me areas that are
*like* this one."** Underwriters comp risk against peer postcodes; lenders
explain a borrower's catchment against demographic neighbours; PropTech
shows "areas similar to your search" tiles. Peer-similarity also gates two
things explicitly deferred earlier:

- **Peer-relative derived signals** (e.g. "price relative to peers' median,
  not the national distribution"). Needs a definition of *peer*.
- **Smoothed property median price** at LSOA grain (peer-aware smoothing
  beats raw LSOA monthly medians, which are too noisy for direct
  regression — the reason `property.median_price_trend_slope_24m` is still
  deferred in ADR 0021).

Peer-similarity is also the entry point into the trainable-models
capability: anomaly detection ("moving >2σ from peers"), calibration
("do our peers predict outcomes?"), forecasting (peer-aware projection)
all consume it.

## Decision

### Endpoint

`POST /v1/peers` behind `OGA_SIGNALS_API` + `requireApiAccess` + the
existing `guardSignals` helper. Request body:

```jsonc
{
  "target": { "geo_code": "E01034129" } |
            { "postcode": "M1 1AE" }    |
            { "area": "Manchester city centre" },   // EXACTLY one
  "signals": ["property.median_price", "crime.total_12m"],   // optional; default = all the target has normalized
  "country": "England" | "Wales" | "Scotland",               // optional
  "lad": "<ONS LAD code>",                                   // optional
  "k": 20,                                                   // optional, default 20, max 200
  "min_signals": 3                                           // optional, default 3
}
```

Response:

```jsonc
{
  "target": {
    "geo_code": "E01034129",
    "signals_used": ["crime.total_12m", "deprivation.imd_decile", ...]
  },
  "peers": [
    { "geo_code": "E01...", "distance": 0.045, "n_dims_used": 7 },
    ...
  ],
  "meta": { "generated_at": "2026-05-27T...", "scope": "postcode=M1 1AE -> lsoa=E01034129" }
}
```

### Distance metric

**Euclidean over normalized values, dimension-mean-squared:**

```
distance(target, candidate) = SQRT( AVG_i ( (t_i - c_i)^2 ) )
                  i ∈ { signals BOTH target and candidate have normalized }
```

Properties:

- **Symmetric.** `d(a, b) == d(b, a)`. Required for "neighbour" to mean
  the same thing in both directions.
- **Bounded in `[0, 1]`** when inputs are normalized to `[0, 1]` (which
  they are — see ADR 0005).
- **Robust to missing dimensions.** Dividing by the count of overlapping
  dims (the `AVG` rather than `SUM`) means a candidate with fewer
  overlapping signals isn't penalised by missing data, nor advantaged.
- **No per-signal weighting in v1.** Every overlapping dimension counts
  equally. Custom weights / per-client signal bundles are a Levers
  concern (cross-cutting capability) and land later.

The `min_signals` HAVING guard (default 3) rejects candidates with too
little overlap — a "peer" computed on a single dimension isn't a peer.

### Country / LAD scope

Mirrors `/v1/areas` (ADR 0007). `country` filters candidates by LSOA code
prefix (`E%` / `W%` / `S%`). `lad` filters via `geo_lookup` — the same
join the rest of the cross-area surface uses.

### Implementation shape

- `apps/api/src/modules/signals/peers.ts` — pure `parsePeersInput` +
  `buildTargetSignalsSql` + `buildPeersSql` + I/O `findPeers`. Two SQL
  queries per request: (1) target's normalized signal vector (so the
  endpoint can echo `signals_used` in the response), (2) the k-NN over
  candidates. The candidates query rebuilds the target's CTE via the
  same filter so the two stay consistent and the main query is a single
  round trip.
- `apps/api/src/app.ts` registers `POST /v1/peers` behind the existing
  guard, resolves `target` (postcode/area through `geocodeArea` from the
  geo spine; geo_code passes through verbatim), meters
  `api.peers.queried`.
- `find_peers` plan op added to `QueryPlanSchema` so the SAME
  capability is reachable through `POST /v1/query` (programmatic OR NL).
  The executor dispatches `find_peers` through the SAME `findPeers`
  function — there is one peers implementation, two surfaces.
- Planner prompt extended with two `find_peers` examples (postcode +
  geo_code targets).

### Tests

- `peers.test.ts` — 19 unit tests: parse validation, both SQL builders
  (CTE shape, COUNT/AVG math, country/LAD scope, parameter binding,
  signals-default-null behaviour), `findPeers` runner short-circuits on
  empty target.
- `executor.test.ts` — 4 new tests covering the `find_peers` branch
  (geo_code direct, postcode geocoding, ungeocodable → null, no signals
  → null).
- `intelligence.test.ts` (contracts) — 7 new tests for FindPeersPlan +
  PeersRequest (exactly-one target, k bounds, empty signals[]
  rejection, QueryPlanSchema acceptance).

## Consequences

**Positive**

- "Areas like this one" is now answerable in one API call, with a stable
  distance metric and traceable inputs (`signals_used` echoed back).
- The peers surface composes through `/v1/query` — a future NL question
  *"areas similar to M1 1AE in England"* plans to a `find_peers` op
  without endpoint sprawl. Symmetric with `get_area`/`score_area`.
- Foundation for the deferred work that we now have an unblocking path
  to: peer-relative derived signals, property median-price smoothing,
  anomaly detection.
- Distance metric is intentionally boring + bounded — easy to explain
  to a regulated buyer, easy to compare across runs, easy to extend
  later (weighted variants land alongside Levers, not now).
- Performance is acceptable on prod scale (42k LSOAs × ~11 signals = a
  single GROUP BY scan with index-friendly `signal_key = ANY(...)`
  joins). No exotic indexes needed for v1.

**Negative / accepted**

- **No weighting in v1.** Every signal in `signals_used` contributes
  equally. For some use cases (e.g. an insurer might want crime to count
  3x) per-client weights are needed — that lives with Levers / org
  config, not as a request-time parameter (to avoid the "every caller
  fiddles knobs" trap that breaks comparability).
- **Distance is over normalized values only.** Raw values are not in
  the metric. This is correct: peers in raw-space are dominated by the
  signals with the biggest absolute ranges (£ vs %). Normalized space is
  the only fair comparator.
- **`signals_used` is per-target (not per-candidate).** If a candidate
  is missing a signal the target has, the candidate contributes to the
  count via the JOIN but only on the signals it does have. The `signals
  comparable per pair` count is exposed as `n_dims_used` on each peer.
- **No `signal_weight` per-signal column emitted in v1.** Easy to add
  later if `n_dims_used` proves insufficient as a quality indicator.
- **Postcode resolution depends on the geo spine** (`geocodeArea`).
  An invalid postcode → 404. That's the same behaviour as `/v1/area`.
- **Two SQL round-trips per request** (target signals, then candidates).
  Could be folded into one with a more complex CTE, but the two-step
  shape is cleaner to test and the second query already does the
  expensive work. Optimise if a measured profile points here.

## Alternatives considered

- **Cosine similarity instead of Euclidean.** Rejected — cosine works
  best for sparse high-dimensional vectors (text embeddings); our
  vectors are low-dimensional dense normalized scalars in `[0,1]`.
  Euclidean is the natural metric for that space and has the bounded /
  symmetric properties cosine lacks here.
- **Sum of squared differences (no AVG normalization).** Rejected —
  punishes candidates that overlap on more dimensions, the opposite of
  what we want.
- **Pre-compute peers offline for every LSOA.** Rejected for v1 — the
  signal set + scope is request-time configurable (signals subset,
  country, lad, k), so a static pre-computation only helps the default
  case. Easy to add as a cache later if profiling demands it.
- **k-d tree / pgvector index.** Rejected for v1 — dataset is 42k rows
  with ~11 numeric columns; a single GROUP BY scan in Postgres is
  ~milliseconds. Worth revisiting if/when the signal count grows
  significantly OR multi-tenancy puts load on the surface.
- **Make peers a `rank_areas` filter (`similar_to: <geo_code>`)
  instead of a new op.** Rejected — the response shape is genuinely
  different (per-row `distance` rather than per-row signal values),
  forcing the union to widen and the consumer to discriminate. A
  separate op keeps both shapes clean.
- **Always require `signals[]` (no default).** Rejected — the default
  ("all the target has normalized") matches the natural "areas like
  this one across all the data we have" intent. The explicit-subset
  path is there for callers that want focused similarity (e.g. "peers
  on crime alone").
- **Bundle peer-relative derived signals into this commit.** Rejected
  — explicitly defined as a follow-up. This ADR commits to the
  *definition* of "peer"; using that definition to compute new signals
  is a separate increment with its own ADR.
