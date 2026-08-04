# ADR 0038 — Seven-category intent-aware scoring model

- **Status:** Accepted
- **Date:** 2026-08-04
- **Context refs:** AR-690 (engine) + AR-691 (docs & versioning UI), supersedes
  the five-dimension-per-preset scoring model of methodology 1.0.0. Builds on
  ADR 0008 (Scores v3 — presets + custom weights over `/v1/score`). Numbered
  0038 rather than the "ADR 0009" name used in the AR-691 ticket because 0009
  is already taken by `0009-monitor-portfolios.md`.

## Context

Methodology 1.0.0 scored through **five weighted dimensions per preset**, and
the dimensions were **not the same set across presets**. Each preset carried its
own bespoke dimension list — business, for example, scored "footfall demand,
competition density, transport access, spending power, commercial costs" while
moving scored household-oriented categories. This created three problems:

1. **Custom weights were preset-bound and incoherent across presets.** A caller
   re-weighting the moving preset reasoned over one set of keys while a caller
   re-weighting business reasoned over another. Any cross-preset comparison or
   shared tuning vocabulary required the caller to maintain two mappings.
2. **Business and investing relied on derived demand proxies instead of real
   data.** Business scored from proxies like footfall demand; the underlying
   property and schools signals existed in the store but were not scored
   directly for those presets.
3. **The marketing, docs, and changelog surfaces had to enumerate five bespoke
   labels per preset**, which drifted from the actual engine and produced the
   "five weighted dimensions" copy that this story fixes.

The question this ADR records the answer to: what is the canonical scoring model
for methodology 1.1.0, and how do the four presets, custom weights, and the
version registry relate to it?

## Decision

### 1. One shared seven-category dimension set for every preset

Every preset exposes the **same seven dimension keys**, in the same order:

`crime, deprivation, property, schools, amenities, transport, environment`

The engine owns the labels (`v2.ts`): **Crime, Deprivation, Property, Schools,
Amenities, Transport, Environment**. `score.ts` mirrors them as
`PRESET_DIMENSION_KEYS` and a drift-guard test compares that mirror against
`computeScores` output so the contract and the engine cannot diverge silently.

Intent is expressed by **scorer composition + weights only** — never by a
different key set. "Custom weights" means *re-weight the chosen preset's seven
dimensions*; the key vocabulary is identical no matter which preset is chosen.

### 2. Default weights (sum 100) per preset

| dimension   | moving | business | investing | research |
|-------------|-------:|---------:|----------:|---------:|
| crime       |     20 |        5 |        10 |       15 |
| deprivation |     10 |       15 |        10 |       15 |
| property    |     20 |       15 |        30 |       14 |
| schools     |     20 |        5 |         5 |       14 |
| amenities   |     10 |       25 |        15 |       14 |
| transport   |     15 |       20 |        15 |       14 |
| environment |      5 |       15 |        15 |       14 |

The same dimension uses intent-appropriate scorers:

- **deprivation** — `scoreDemographics` for moving/investing/research,
  `scoreSpendingPower` for business
- **property** — `scoreCostOfLiving` for moving/research,
  `scoreCommercialCosts` for business, `scoreInvestmentProperty`
  (blend of price growth and rental yield) for investing
- **crime / schools / amenities / transport / environment** — the same scorers
  for every preset

### 3. Engine versioning

- `METHODOLOGY_VERSIONS` (single source in `@onegoodarea/contracts`, AR-352)
  gains the **1.1.0** entry with `released_at` 2026-08-04, a one-line summary,
  and a bullet list of changes; newest is last.
- `METHODOLOGY_VERSION = "1.1.0"` is stamped on every `/v1/score` response
  (`engine_version` in the body + `X-Engine-Version` header), still pinnable
  per-request and per-org (ADR 0031).
- `SUPPORTED_ENGINE_VERSIONS` includes both `1.0.0` and `1.1.0` so callers
  pinned to 1.0.0 keep the deterministic semantics they approved, while
  unpinned callers get the current model.
- The golden snapshot is re-baselined to 1.1.0 (approved engine change; the
  diff is reviewed rather than silently accepted).

### 4. User-visible surfaces

- `/methodology` renders a **version sidebar** listing 1.0.0 and 1.1.0 with
  each version's released date, summary, and change bullets; the current version
  is tagged "current".
- `/changelog` gains the August 2026 month with the 1.1.0 entry (intent-aware
  scoring + custom weights on any preset); the 1.0.0 changelog line is corrected
  from "five weighted dimensions per preset" to "seven category dimensions per
  preset".
- All "five weighted dimensions" copy across marketing, docs, help, MCP docs,
  and profile cards is corrected to the seven-category model, and the stale
  bespoke business preset labels ("footfall demand, competition density, …")
  are replaced with the shared seven-category vocabulary.

## Consequences

### Enables

- **One tuning vocabulary.** Callers reason over the same seven keys for every
  preset, so a re-weighting recipe transfers across presets and can be shared
  org-wide.
- **Real signals for business and investing.** Commercial site selection and
  investment screening now score directly from property and schools data rather
  than derived demand proxies.
- **Defensible, pin-able scoring.** Regulated buyers pin 1.0.0 or 1.1.0 and get
  byte-for-byte reproducible scores; the version registry documents exactly what
  changed between them.

### Costs

- **Breaking change from 1.0.0.** Any caller parsing the previous per-preset
  five-dimension key set must migrate to the shared seven keys. Mitigated by
  keeping 1.0.0 in the supported window for pinned callers and by the corrected
  changelog + methodology version sidebar documenting the diff.
- **Copy migration.** Every user-visible "five weighted dimensions" reference
  needed correcting; several had drifted from the engine already (this ADR is
  the canonical description they now align to).
- **Golden-snapshot rebaseline.** Re-baselining to 1.1.0 changes the recorded
  scores; approved as an intentional engine change, reviewed as a diff.

### Future supersession criteria

This ADR is superseded when:

- The dimension set changes (add/remove/reorder categories) — a new ADR records
  the new set; the 1.1.0 seven-category model is kept for trail.
- A preset's default weights change materially (a MINOR or PATCH bump per the
  registry convention, not necessarily a new ADR).

## Alternatives considered

### A. Keep five-dimension-per-preset, just fix the copy

Rejected. The copy fix would have masked the underlying inconsistency — business
and investing still scored from derived proxies, and custom weights still meant
different keys per preset. The user requirement (AR-692 addendum) that the
showcase present all presets as API-driven tabs is only coherent if every preset
shares the same dimension vocabulary; a five-dimension-per-preset model would
force tab-specific key sets.

### B. Seven categories, but different key sets per preset (additive)

Rejected. Keeping e.g. "footfall demand" as a business-specific eighth key while
adding the shared seven would preserve the bespoke vocabulary and its drift —
the same problem we set out to remove — while making "custom weights" mean
different things per preset again.

### C. One shared scorer with no intent variation

Rejected. Intent-awareness is the product's value: a single flat scorer with
identical weights would make the four presets marketing-only. The decision keeps
intent in the composition + weights, which is exactly the surface the showcase
tabs will expose.
