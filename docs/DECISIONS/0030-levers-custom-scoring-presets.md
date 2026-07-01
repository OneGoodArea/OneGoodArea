# ADR 0030 — Levers: custom scoring presets (per-org saved weights)

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-196; depends on
  [[adr-0027-levers-foundation]] (org tenancy) +
  [[adr-0028-levers-org-crud]] (org CRUD) +
  [[adr-0008-scores-v3]] (Scores v3 — the engine + dimension catalog
  this commit reuses unchanged).

## Context

The Scores product (`POST /v1/score`, ADR 0008) accepts a `preset`
(one of the 4 hardcoded intents — `moving | business | investing |
research`) plus an optional `weights` map to override the chosen
preset's dimension weights. The engine is frozen v2, golden-tested,
and reused untouched.

Today a regulated-enterprise customer has to send `{preset, weights}`
on every call — same weights, every time. Their underwriting model
lives in their codebase, not ours. Positioning v3 names "configurable
scoring" as part of "fully configurable per client": this commit makes
the weights server-side persistent, recallable by id.

## Decision

### Schema (one new table)

```sql
CREATE TABLE IF NOT EXISTS scoring_presets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  base_preset TEXT NOT NULL,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, slug)
);
CREATE INDEX scoring_presets_org_idx ON scoring_presets (org_id);
```

- `org_id` is a soft FK to `orgs.id` — same pattern as the rest of
  Levers; application enforces.
- `UNIQUE (org_id, slug)` so slugs are namespaced per-org.
- `base_preset` is one of `moving | business | investing | research`,
  validated at write time. It selects the **dimension set** that
  `weights` is allowed to reference (`PRESET_DIMENSION_KEYS[base_preset]`
  in `scoring/score.ts`).
- `weights` is JSONB so the rows are queryable later (e.g. "find every
  preset that boosts safety_crime") without a schema change.

### 5 endpoints under `/v1/orgs/:id/presets`

| Method | Path                                | Guard            | Notes |
|--------|-------------------------------------|------------------|-------|
| POST   | `/v1/orgs/:id/presets`              | api-key + owner  | 400 if weights reference dimensions not in `PRESET_DIMENSION_KEYS[base_preset]`; 409 on slug collision |
| GET    | `/v1/orgs/:id/presets`              | api-key + member | List org's presets |
| GET    | `/v1/orgs/:id/presets/:presetId`    | api-key + member | Get one (404 if cross-org or unknown) |
| PATCH  | `/v1/orgs/:id/presets/:presetId`    | api-key + owner  | Any subset of `{name, slug, base_preset, weights}`. Weights re-validated against the EFFECTIVE base_preset (current or patched) — protects against patching one without the other into an inconsistent state |
| DELETE | `/v1/orgs/:id/presets/:presetId`    | api-key + owner  | Remove |

Same membership-checked-before-body-parse pattern as bundles + orgs.

### Integration with `POST /v1/score`

A new optional body field `preset_id`. When set:

1. Validate that **no `preset` and no `weights` are also passed** — they
   are mutually exclusive (passing both is ambiguous; 422
   `preset_id_conflict`).
2. Resolve the org. Same lazy first-owner fallback as the bundle path
   for legacy keys with `org_id = NULL`.
3. Fetch the preset; 404 if not found in the caller's org.
4. Synthesize an "as if" body — `{...request.body, preset:
   saved.base_preset, weights: saved.weights, preset_id: undefined}`
   — and feed it through the existing `parseScoreBody` pipeline
   unchanged.

When `preset_id` is **absent**, the endpoint behaves byte-identically
to today. Saved presets are an additive opt-in surface.

### `weights_source` stays `"preset" | "custom"`

The `ScoreResult` contract's `weights_source` enum is unchanged. A
saved-preset call surfaces as `weights_source: "custom"` (functionally
accurate — saved presets ARE custom weights, just persisted). The
preset_id that was used is captured in the `api.score.computed`
activity event for audit. Widening the contract enum would have
broken consumers + the existing contract test that asserts only those
two values.

### Pure validation reuses the engine's dimension catalog

`findUnknownWeightKeys(basePreset, weights)` reuses
`PRESET_DIMENSION_KEYS` from `modules/scoring/score.ts`. ONE source
of truth for the dimension catalog. If a new dimension is added to a
preset, every existing saved preset that doesn't reference it stays
valid (the validator only flags **unknown** keys, never missing ones).

## Consequences

**Positive**

- **First "saved configuration" Lever.** An InsureTech can save
  `underwriting_2026` once and reference it forever; the deterministic
  engine still produces the score.
- **Engine untouched.** Same v2 frozen engine + golden tests; same
  `applyWeights` aggregation that has worked since ADR 0008. Levers
  config sits on top.
- **Opt-in default preserved.** Every existing /v1/score call works
  byte-identically. Adding `preset_id` is the only behavioral change.
- **Three error codes** that customers can program against:
  `preset_id_conflict` (mutually exclusive), `no_org_context`
  (legacy-key fallback exhausted), `unknown_weight_keys` (weight key
  not in the base_preset's dim set).
- **Test coverage:** 6 unit tests on `findUnknownWeightKeys` + 4
  integration tests on /v1/score's preset_id path.

**Negative / accepted**

- The `read-modify-write` in `updatePreset` does an extra SELECT
  per patch. Acceptable: presets are tiny per-org (rarely > 10 rows)
  and patches are rare. The simpler code is worth the round-trip.
- No `weights_source: "saved_preset"` in the response. Auditable via
  activity events but not via the score response. A future contracts
  bump could widen the enum; deferred to the wrap commit since it
  requires updating the contract test + every consumer's type.
- Patching `base_preset` alone (without weights) is **legal** even
  if it makes the existing weights invalid for the new dim set — the
  endpoint re-validates and 400s in that case. Customers must
  patch both atomically or do it in two PATCHes (set weights first to
  a subset both dim sets agree on, then change base, then re-set
  weights). Acceptable: this is rare and the 400 is explanatory.
- No API-key → preset binding (`api_keys.preset_id`). A caller can
  hand around scoped keys but they still pass `preset_id` per call.
  Small follow-up.
- The `JSONB` cast in INSERT uses `JSON.stringify(weights)::jsonb` —
  Neon's tagged template surfaces JS objects as text params; we cast
  on the server side. Standard pattern; tests in
  `presets.test.ts` cover the validator (the only pure logic), and
  the integration test in `v1-score.test.ts` covers the I/O path
  end-to-end.

## Alternatives considered

- **Encode the dim-set check at the DB layer via CHECK + a stored
  function.** Rejected — the dim catalog is application config (lives
  next to the engine). Putting it in the DB schema would force a
  migration every time the catalog evolved.
- **A single endpoint that accepts {preset_id OR (preset + weights)}
  as a union schema.** Rejected — the union would be expressed as
  Zod refinements at the contract layer, but `parseScoreBody` is in
  the scoring module and resolving preset_id requires the orgs/presets
  module. Mixing those layers would break the strangler-fig pattern.
  Resolving at the endpoint + synthesizing the body for the existing
  parser is cleaner.
- **Persist the full ScoreQuery (including area).** Rejected — a
  preset is the recipe, not the meal. Storing `area` with the preset
  would conflate config with usage and force a 1:N rewrite when a
  customer wants to score thousands of areas against the same preset.
- **Allow `weights` overrides ON TOP of a saved preset_id.** Considered
  but deferred. Today: preset_id is mutually exclusive with weights
  (clean semantics). Later: could allow `preset_id` + an additional
  `weights_overlay` field, but that's two layers of indirection that
  no customer has asked for yet. YAGNI.
- **Promote saved presets to first-class enum values reachable from
  `preset` (e.g. `preset: "spr_underwriting"`).** Rejected — would
  break the strict 4-enum `Intent` contract that the engine + report
  shape consume.
