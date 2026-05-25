# ADR 0008 — Scores v3 (`POST /v1/score`): presets + custom weights

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** engine-v2 freeze (`1bb2edd`), ADR 0001; MASTER §2 (Scores product), §8 Phase 3.

## Context

Scores is the second product: a composite area score that is *optional* and
*configurable* (a feature on top of the Signals primitive). The deterministic
scoring engine is frozen as v2 (golden-tested) and must not change. We need a
standalone, score-only endpoint (no AI narrative, unlike `/v1/report`) that
supports presets and caller-supplied weights.

## Decision

`POST /v1/score { area, preset?, weights?, }`:

- **Presets are the historical intents** (`moving | business | investing |
  research`), demoted to named presets; default `research`.
- **The frozen engine is reused untouched.** `computeScores(preset, …)` produces
  the per-dimension scores; we re-aggregate the **overall** here, outside the
  engine. So custom weights never touch v2 (golden stays intact).
- **Each preset uses a DIFFERENT set of five dimensions** (not the same five
  re-weighted). So **custom weights override the weights of the chosen preset's
  dimensions**, keyed by a stable slug (e.g. `safety_crime`); they cannot redefine
  the dimension set. Valid keys per preset live in `PRESET_DIMENSION_KEYS`,
  drift-guarded by a test that compares them to the engine's actual labels.
- **Transparent output:** `ScoreResult` (Zod DTO in contracts) returns the
  overall, every dimension (key, label, score, effective weight, confidence),
  aggregate confidence, and `weights_source` (`preset` | `custom`). **No AI** —
  scores are deterministic.
- Same `OGA_SIGNALS_API` dark flag + `requireApiAccess` gate as `/v1/area`; meters
  `api.score.computed`; **not** charged against the monthly report quota (no
  report is generated).

## Consequences

**Positive**
- The Scores product exists, standalone + configurable, **proven on live data**
  (M1 1AE: preset=research → 53; preset=moving + custom `safety_crime=60` → 70).
- The golden engine is untouched; custom weighting is a pure re-aggregation
  (`applyWeights`) that is unit-tested.
- `weights_source` makes provenance explicit; components + weights are always shown.

**Negative / accepted**
- Custom weights operate **within a preset's fixed dimension set** — you reweight,
  you don't redefine. (Fully custom dimension composition is a larger, later
  feature, e.g. org-defined presets in the Levers phase.)
- `scoreArea` currently **live-fetches** the sources (like the report path); it
  could read the signal store later for speed/consistency. Acceptable: the score
  is identical either way (same engine, same data).
- `PRESET_DIMENSION_KEYS` is mirrored from the engine labels; the drift-guard test
  catches any rename.

## Alternatives considered

- **Modify the engine to accept custom weights.** Rejected — it is frozen + golden;
  the aggregation belongs outside it anyway.
- **Treat all presets as the same five dimensions re-weighted.** Rejected — false;
  the engine genuinely uses different dimensions per intent.
- **A score-only flag on `/v1/report`.** Rejected — Scores is its own product with
  its own primitive (presets/weights), not a mode of the report surface.
