# ADR 0001 — Signal as the public primitive; thin `/v1/area` over live-fetch first

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** `MASTER-PROPOSAL.md` §2–4, §9; `PRODUCT-POSITIONING.md` §2;
  `EXECUTION-PLAYBOOK.md` §0, §8. Builds on the engine-v2 freeze (`1bb2edd`).

## Context

The product was shaped around a **report**: `POST /v1/report` returns a composite
0–100 score plus an AI narrative. That is a *consumer* primitive (the Crystal
Roof / StreetCheck shape, "trust our opinion of this area"). The raw signals
(crime, deprivation, prices, schools, amenities, transport, flood — each with a
source and a period) are computed on every call but **trapped inside the report**:
not individually addressable, not queryable across areas.

The strategy (ratified 2026-05-21): **the data layer is the product; the score is
a feature; the intelligence layer is the moat.** Sold as four composable products
(Signals / Scores / Monitor / Intelligence). B2B buyers (4 of our 5 ICPs) want the
ingredients to feed their own models, not our final answer.

Code-grounded reality that makes this cheap: the seven data-source fetchers
already return clean, addressable structs, and the scoring engine is a set of
pure functions that *consume* those structs. The data layer is already separable
from scoring — exposing it is a refactor, not a rewrite.

## Decision

1. **The public primitive is the `Signal`** (and the `AreaProfile` that bundles an
   area's signals), defined as **Zod schemas in `packages/contracts`** so apps/web
   and apps/api share one runtime-validatable source of truth. The score and the
   report are demoted: a feature and a surface composed on top of signals.

2. **First exposure is a thin `GET /v1/area`** that assembles the **existing live
   fetchers** into the signal catalog — **no persisted signal store yet**, no
   scoring, no AI. This proves the shape and sets the domain boundary at the
   cheapest possible cost (it is mostly exposing data we already compute). The
   persisted store (the XL build) follows, behind the same response shape.

3. **Additive and dark-flagged.** `/v1/report`, `/v1/batch`, the widget and MCP
   are untouched. `/v1/area` ships behind `OGA_SIGNALS_API` (off by default; 404s
   like an unknown route when off) so it can land in prod and be enabled
   deliberately, and killed instantly.

4. **`meta.fetch_mode` is on the wire** (`"live"` today, `"store"` once the store
   backs it). The live→store migration is therefore non-breaking: callers see the
   same shape; only provenance changes.

5. **v1 confidence is availability/sample based and honestly labelled** as such in
   `confidence_reason`. The calibrated confidence model (does the value predict
   outcomes?) is deferred to Phase 7 with the time-series corpus. `value: null`
   with a reason is returned where a source has no coverage — the catalog stays a
   **stable schema** rather than omitting signals.

6. **`normalized_value` / `percentile` are deferred**, added *additively* when the
   store and normalization models exist. v1 exposes only what we genuinely
   compute (no-invented-claims applied to the contract itself).

7. **Meter early, price late.** Every `/v1/area` call emits an `api.area.profiled`
   usage event from day one. That event stream later powers quotas, billing, and
   the demand-signal moat. Pricing numbers are decided later (AR-124 / AR-157).

## Consequences

**Positive**
- Flips the narrative from "report API" to "data-infrastructure API" for a small,
  low-risk change, with the report path fully intact.
- The `Signal`/`AreaProfile` contract is forward-compatible: store-backing,
  normalization, percentiles and higher geo grains slot in additively.
- Establishes the correct domain direction: signals own the primitive; reports
  compose it.

**Negative / accepted trade-offs**
- **Temporary import direction:** the fetchers still live under
  `modules/reports/data-sources`, so `modules/signals` imports from `reports` for
  now. The taxonomy promotion (move `data-sources` + `inputs` into
  `modules/signals`; have `reports` import *from* `signals`) is the next refactor.
  Tracked, not silent.
- **Latency:** v1 fan-outs to live sources per request (same cost the report path
  already pays). The store removes this later.
- **Coarse confidence** in v1 (availability/sample, not calibrated) — labelled
  honestly so no one over-trusts it.

## Alternatives considered

- **Go straight to the persisted signal store first.** Rejected for the *first*
  slice: it is XL and delays the proof. The store is the next phase, not the first
  move (MASTER §8 "recommended near-term").
- **Keep the report as the primitive and bolt signals on later.** Rejected: that
  hardens exactly the consumer shape the strategy is inverting.
- **Plain TypeScript types instead of Zod.** Rejected: the contract is a trust
  boundary (it validates third-party API input and prevents web↔api drift); Zod is
  the playbook standard for DTOs (§2).
