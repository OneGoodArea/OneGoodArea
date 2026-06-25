# ADR 0016 — Serve crime from the store on `/v1/area`

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0012 (property store-read), 0013 (change detection), 0015 (crime ingest); MASTER section 3.

## Context

The crime archive is loaded (ADR 0015: 1.2M monthly rows / 36 months / 35,724
LSOAs / normalized). The serve-flip mirrors the property flip (ADR 0012):
`/v1/area` (and `/v1/score` via the shared `fetchAreaSources`) should read crime
from the store instead of calling the live police.uk API, with live fallback on
a miss. Change detection on crime was already working from the load (the
`crime.monthly_count` series is in `signal_timeseries`); this flip is about the
HTTP serving layer.

The mapper reads `total_crimes` + `months_covered`. The frozen scoring engine
reads more: `total_crimes`, `months_covered`, `monthly_trend` (trend term) and
`by_category` (violent-crime adjustment, bounded `-10..+5`). The dominant term
in `scoreSafety` is the monthly-rate sigmoid (which we have exactly).

## Decision

- **`readCrimeFromStore`** reconstructs `CrimeSummary` from the store:
  `total_crimes` from `signal_values` (`crime.total_12m`), `monthly_trend` from
  the `crime.monthly_count` time-series (trailing 12 months, ascending),
  `months_covered = monthly_trend.length`. `top_streets` / `outcome_breakdown`
  empty (not stored — the bulk archive doesn't drive them).
- **`by_category` is future-proofed** — reconstructed from a stored
  `crime.violent_12m` (`{ "Violence and sexual offences": violent }`) IF
  present; empty otherwise.
- **Wired into `fetchAreaSources`** (shared by `/v1/area` and `/v1/score`) behind
  `OGA_SIGNALS_STORE_READ`, with a new `crimeFromStore` flag and live fallback;
  `fetch_mode = "hybrid"` if any source is store-backed. `getAreaProfile`
  enriches `crime.total_12m` with its stored normalization + national percentile.

## Consequences

**Positive**
- `/v1/area` + `/v1/score` serve crime at LSOA grain from the store: normalized,
  percentiled, fast, no per-request live-API call. Proven on prod:
  E01035716 (national 100th pctile, 12,162 crimes, real `Jan=937 Feb=888
  Mar=756` trend), E01000002 City of London (96.7th, 529 crimes,
  `40/37/67`), E01005207 small residential pocket (1.4th, 2 crimes).
- Dominant scoring terms (monthly rate, trend) are **exact**; monthly_trend
  flows through the engine's trend adjustment unchanged.
- Consistent with property: unified store-backed view across Signals + Scores,
  flagged + reversible.

**Negative / accepted**
- **Empty `by_category` until `crime.violent_12m` is stored** — the engine's
  violent-crime adjustment defaults to `+5` (treats every area as low-violence),
  a bounded ~5-15 point shift on the safety dimension only, ~1-3 points on the
  overall score. Behind the flag, blast radius = standalone `apps/api` (no
  consumers pre-launch). **Follow-up:** add a `violent` aggregator to the crime
  refresh (filter `Crime type` containing `violen`/`robbery`) and a
  `crime.violent_12m` signal; the reader already handles it.
- `top_streets` and `outcome_breakdown` are not served from the store (the
  archive doesn't carry the same fields the live API does); empty fills are
  harmless for the engine.

## Alternatives considered

- **Re-ingest now with the violent count.** Rejected for tonight — another
  3.9GB parse + write for a bounded scoring nuance is the wrong trade at this
  hour; the path is in place and will fill on the next refresh.
- **Keep crime live for scoring, store-only for Signals.** Rejected — the unified
  `fetchAreaSources` keeps `/v1/area` and `/v1/score` consistent (same area
  describes the same crime number); splitting them would surface different
  values for the same query and complicate downstream.
