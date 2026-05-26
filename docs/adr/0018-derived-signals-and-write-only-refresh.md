# ADR 0018 — Derived signals layer + write-only refresh / unified normalize

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0005 (normalization), 0011 (prices), 0015 (crime), 0017 (query plane); MASTER §3/§6.

## Context

Two coupled problems surfaced together.

**1. The query plane was too narrow to answer ICP questions.** Pedro 2026-05-26:
*"it's not just YoY, it's every single query any of our ICP's would ever want to
ask."* `/v1/query`'s `rank_areas` can only filter / sort by signals stored in
`signal_values`. The natural answers to "areas that grew 20% YoY" and similar
need **derived signals** (YoY, multi-period deltas, peer-relative percentile,
trend slope) that don't exist in the raw stores.

**2. Inline `normalizeSignals` after a big write timed out three times this
session** (crime first, derive twice). The neon HTTP `headersTimeout` is the
trigger; the data write always succeeded; only normalize failed; and because it
was inline the whole CLI exited 1 and the run "failed" despite data being
durable. Each time the fix was to re-run normalize in a fresh process. This
would bite the cron on main.

## Decision

### Derived signals layer

- **`modules/signals/refresh/derive.ts`** — new in-DB derivation job. First
  derived signal: **`property.price_change_pct_yoy`** per LSOA, computed from
  `signal_timeseries.property.median_price` (and `.transaction_count`) via:
  CTE 1 joins median+count monthly pairs; CTE 2 SUMs `median*count / count` per
  year for a **count-weighted annual median**; CTE 3 ranks years descending per
  LSOA; CTE 4 computes `(latest − prior) / prior × 100` where prior > 0.
  `INSERT … SELECT … ON CONFLICT DO UPDATE` — one statement, idempotent.
- Added to `signals` catalog (`property.price_change_pct_yoy`, pct, neutral).
- Added to the planner's `SUPPORTED_SIGNALS` so the NL planner can pick it.
- **No new endpoint or executor change** — the existing single-`signal`
  `rank_areas` immediately filters / sorts by it. "Which areas grew >20% YoY?"
  works today.
- The same pattern extends to every future derived signal (crime YoY, 3m/6m
  deltas, peer-relative percentile, trend slope) — each one a small SQL job +
  a catalog entry, immediately queryable.

### Write-only refresh + unified normalize

- **All refresh / derive jobs are now WRITE-ONLY.** `runPricesRefresh`,
  `runCrimeRefresh`, `runDerivations` do their I/O and DB writes; that's their
  atomic unit. The `skipNormalize` opt is gone (was a workaround) — normalize
  is simply not in scope for any refresh.
- **New `modules/signals/refresh/normalize-all.ts`** with a single
  `normalize:signals` CLI script that normalizes EVERY key that needs it
  (deprivation + property median + property YoY + crime total — extensible).
  Idempotent — re-running over already-normalized data is a no-op.
- **Cron explicitly chains write → normalize** as separate steps:
  `migrate → refresh:deprivation → refresh:prices → derive:signals →
  normalize:signals → timeseries:append`. The old per-source
  `normalize:deprivation` cron step is gone (the unified step covers it).
- A transient HTTP timeout in `normalize:signals` can no longer fail the data
  writes that preceded it. Re-running `normalize:signals` alone resolves any
  timeout cheaply.

## Consequences

**Positive**
- "Which LSOAs grew >20% YoY?" works end-to-end on prod via both modes:
  programmatic `{plan: {...}}` and real-Anthropic NL `{question: "..."}`
  produce identical real-LSOA results. Proven on prod: 35,570 YoY rows, all
  normalized + percentiled, sample values consistent with the get_area path
  (City of London +18.5%, Manchester M1 +16.6%).
- Adding new derived signals = a small SQL job + a catalog entry + planner
  list entry → queryable through `/v1/query` with no executor change.
- The cron / data pipeline is now resilient to the recurring Neon HTTP
  headers-timeout pattern: writes stand on their own; normalize is a separate
  retryable step.
- Step boundaries are explicit + visible — operators can reason about each
  step's success/failure independently.

**Negative / accepted**
- Dev manual runs of `refresh:prices` / `refresh:crime` / `derive:signals` no
  longer normalize as a side effect. The dev needs to also run
  `normalize:signals`. Documented; clean trade for cron resilience.
- One derived signal in this commit; the rest of "ICP-grade query coverage"
  (multi-signal compound filters, aggregate, OR logic, peers, anomaly,
  forecast, pipelines) lands in subsequent increments — see the Intelligence
  v2-v4 roadmap planned for an epic sibling to AR-169.

## Alternatives considered

- **Wrap inline `normalizeSignals` in try/catch (resilience without
  refactor).** Rejected — the structural fragility is the inline coupling; a
  try/catch hides the timeout but leaves the partial-state ambiguity. Separate
  steps make outcomes explicit.
- **Compute YoY at read time only (no stored signal).** Rejected — read-time
  computation can't be filtered/sorted by `rank_areas` (it reads
  `signal_values`); a stored derived signal is the unlock.
- **Materialized view instead of `INSERT … SELECT` into `signal_values`.**
  Rejected for now — a regular signal_value row reuses every existing
  normalization, percentile, query, and audit path, with no new schema.
