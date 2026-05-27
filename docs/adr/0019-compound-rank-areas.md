# ADR 0019 — Intelligence Increment 2: multi-signal compound `rank_areas` grammar

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0007 (cross-area query), ADR 0017 (query plane v1),
  ADR 0018 (derived signals), MASTER §6, [[product-architecture-mental-model]].

## Context

Increment 1 of the query plane (ADR 0017) shipped a typed `rank_areas` op
that filters on **one** signal at a time. A typical ICP screening question is
compound by nature:

> *"areas under £250k AND rising YoY AND low crime AND below-median deprivation"*

That single question wants `property.median_price <= 250000` AND
`property.price_change_pct_yoy > 0` AND `crime.total_12m` in the lower half
of the national distribution AND `deprivation.imd_decile` in the upper half
(less deprived) — all on the same row.

Forcing the caller to issue four separate ranked queries and intersect
client-side defeats the point of the query plane and breaks the deterministic
audit trail (each sub-query lands on a different ranking; you have to
re-rank). Increment 2 closes this — the plan grammar describes the compound
constraint directly, the DB does one join, the answer traces to real rows.

This unlocks ~70-80% of ICP screening questions with **no new endpoint** and
**no new derivations.**

## Decision

### Grammar (additive)

`rank_areas` accepts a second `params` shape (compound). The discriminator
stays at the top-level `op` literal so the outer `QueryPlanSchema`
discriminated union is untouched; `params` becomes a Zod union of two strict
shapes:

```
SINGULAR (Increment 1, kept verbatim):
{
  signal: "<key>",
  country?, lad?, sort?, limit?,
  min_percentile?, max_percentile?, min_value?, max_value?
}

COMPOUND (new):
{
  signals: [{ key, filter? }, ...],   // 1..8 entries
  sort_by?: { signal, mode?: "value"|"percentile", direction?: "asc"|"desc" },
  country?, lad?, limit?
}
```

`filter` is exactly one of:
`eq | lt | lte | gt | gte | between | percentile_lt | percentile_lte |
percentile_gt | percentile_gte | percentile_between`. Each is a strict
single-key union, so `{lt: 5, gt: 1}` is **rejected** (use `between`).

A signal entry without a filter is included in the response (its value /
normalized / percentile come back per row) but applies no `WHERE` constraint —
useful for "include this column but don't filter on it".

`sort_by.signal` MUST appear in `signals[].key` (enforced by a Zod refinement).
Defaults: `percentile_desc` on `signals[0]`.

### Backward compatibility

The singular form is unchanged. Existing callers + Increment 1 NL planner
outputs continue to validate. The contract change is purely additive.

### Executor

`apps/api/src/modules/signals/query.ts` gains `buildCompoundAreasQuery` and
`queryAreasCompound`. The SQL pattern:

- Anchor signal: `FROM signal_values sv0` + `LEFT JOIN signal_percentiles sp0`.
- Each subsequent signal: `INNER JOIN signal_values sv{i}` keyed on
  `(geo_type, geo_code)` + matching `LEFT JOIN signal_percentiles sp{i}`.
- Filters apply per-signal in the `WHERE`, using `sv{i}.raw_value` for
  value-ops and `sp{i}.percentile` for percentile-ops.
- `country` / `lad` scope the anchor's geo_code (`LIKE 'E%'` /
  `IN (SELECT lsoa_code FROM geo_lookup WHERE lad_code = ?)`).
- `sort_by` resolves to `ORDER BY sv{i}.raw_value` or `sp{i}.percentile`,
  direction `ASC` or `DESC`, `NULLS LAST`.

Every parameter is bound through the existing `query(text, params)` driver —
no string interpolation, no SQL injection surface.

### Response shape

`AreaResult` gains an optional `signals: Record<key, {value, normalized,
percentile}>` map. The legacy top-level `value` / `normalized_value` /
`percentile` fields mirror the **sort signal** (or `signals[0]` when no
`sort_by`), so callers built against the Increment 1 shape keep working.
Singular queries omit `signals`.

### Executor dispatch

`modules/intelligence/executor.ts` checks for the presence of `signals` in
`params` and routes to `queryAreasCompound` or the existing `queryAreas`
accordingly. The plan + `plan_source` echo in the response is unchanged —
audit-replayable.

### Planner

`buildPlannerPrompt` documents both shapes and instructs the model to prefer
the compound form whenever the question carries more than one signal-level
constraint. Two compound examples are embedded in the prompt so the model
learns the shape without an external eval pass.

## Consequences

**Positive**

- ICP screening questions are answerable as **one** typed plan with **one**
  DB round-trip. Multi-constraint discovery ("affordable + rising + safe")
  becomes a programmatic capability.
- The plan grammar still IS the API: every result traces to clickable rows
  with stable filter semantics; nothing is silently re-interpreted.
- No new endpoint, no new tables, no new derivations — pure leverage on the
  store + the existing AND semantics of relational joins.
- Backward-compatible: Increment 1 callers, tests, and NL plans untouched.

**Negative / accepted**

- The compound SQL uses **INNER JOIN**s for sibling signals, which means an
  area missing **any** filter signal in the store drops out. This is the
  correct AND semantic. For "include this column but only filter on a subset"
  scenarios, leaving `filter` off still results in INNER JOIN (the area must
  *exist* for that signal). True LEFT-JOIN coalescing ("return null if
  missing, don't drop the row") would require an explicit `optional: true`
  flag; deferred until a real use-case calls for it.
- No OR / nested logic in this increment. "Affordable OR rising" is not
  expressible yet — deferred to Increment 4 (aggregate + OR/nested filters).
- No aggregate ops (`average X in bottom-decile Y`) — also Increment 4.
- The planner emits the compound form when the question has multiple
  constraints, but the eval harness that quantifies planner accuracy lands
  later (Increment 9). Production observation drives near-term confidence.

## Alternatives considered

- **Client-side intersection of separate single-signal queries.** Rejected —
  loses the typed grammar (the AND lives in client code, not the plan),
  breaks audit (different rankings per sub-query), inflates round trips.
- **Add a brand-new op `rank_areas_compound`.** Rejected — duplicates the
  ranking semantics, splits the grammar, doubles the planner surface. A
  union on `params` keeps the op count low and the grammar coherent.
- **Embed the AND as a generic `where: {and: [...]}` block.** Rejected for
  now — too generic for the increment's goal. The flat `signals[]` shape is
  ergonomic for the 70-80% of ICP questions it targets; once OR and
  aggregates land (Increment 4), the grammar can evolve toward a more
  general logical block if needed (still backward-compatible to `signals[]`
  as syntactic sugar).
- **Variadic positional filters (`signal2`, `signal3`, ...).** Rejected —
  not extensible, awful in JSON, awful in Zod.
