/* Crime confidence: single source of truth.

   AR-393 lifted what were two divergent ladders into one shared formula:

     - scoring-engine/v2.ts (drives /v1/score Safety & Crime dimension)
       used a sample-count + window hybrid
     - area-profile.ts crimeConfidence(months) (drives /v1/area
       crime.total_12m + crime.monthly_rate) used a months-only ladder

   They disagreed: for M1 1AE on 2026-06-30, the SAME 4-crimes-in-the-window
   data point read as 40% on /v1/score and 60% on /v1/area. Audit-trail
   catastrophic for a lender brief where two analysts would draw opposite
   risk conclusions from the same field. Now both surfaces import this
   module and produce identical numbers.

   Formula (preserves the existing /v1/score numbers; brings /v1/area into
   line):
     HIGH    (1.0)  total_crimes >= 100 AND months_covered >= 12
     MEDIUM  (0.7)  total_crimes >= 30
     LOW     (0.4)  fewer crimes recorded
     ZERO    (0.6)  police.uk returned HTTP 200 with [] for every month
                    (every England/Wales LSOA is covered, so this is
                    "genuinely a low-crime area"; distinct from a fetch
                    failure)

   Two cases not covered here (the caller decides):
     - crime === null (fetch failed): the caller emits its own "request
       failed" message at confidence 0.
     - crime data unavailable (out of country / not yet seeded): same. */

import type { CrimeSummary } from "./inputs";

export const CRIME_CONF_HIGH = 1.0;
export const CRIME_CONF_MEDIUM = 0.7;
export const CRIME_CONF_LOW = 0.4;
export const CRIME_CONF_ZERO_RECORDED = 0.6;

/* The live police fetcher pulls a trailing window of this many months.
   Anything shorter and the label "Recorded crimes (12 months)" lies. The
   bulk-archive refresh job (refresh/crime.ts) writes a trailing-up-to-12m
   total too, so live and stored values cover the same span. */
export const CRIME_WINDOW_MONTHS = 12;

export interface CrimeConfidenceResult {
  confidence: number;
  confidence_reason: string;
}

/** Confidence + reason for a non-zero crime sample. The HIGH bucket
    requires both a substantial sample (>=100) AND a full window (>=12mo).
    Low samples are noisy even with a full window, and short windows
    can be misleading even with a high count (seasonality, one-off
    events). */
export function crimeConfidence(crime: CrimeSummary): CrimeConfidenceResult {
  const { total_crimes, months_covered } = crime;

  if (total_crimes === 0) {
    return {
      confidence: CRIME_CONF_ZERO_RECORDED,
      confidence_reason: `police.uk recorded zero crimes over the last ${CRIME_WINDOW_MONTHS} months for this area.`,
    };
  }

  if (total_crimes >= 100 && months_covered >= 12) {
    return {
      confidence: CRIME_CONF_HIGH,
      confidence_reason: `${total_crimes} crimes across ${months_covered} months provides strong signal.`,
    };
  }

  if (total_crimes >= 30) {
    return {
      confidence: CRIME_CONF_MEDIUM,
      confidence_reason: `${total_crimes} crimes across ${months_covered} months: moderate sample.`,
    };
  }

  return {
    confidence: CRIME_CONF_LOW,
    confidence_reason: `Only ${total_crimes} crimes recorded over ${months_covered} months. Sparse sample; treat as indicative.`,
  };
}

/** Human-readable period string for a crime summary. Honest about the
    actual months the data covers (uses monthly_trend if present, else
    falls back to a generic "Last <N> months" matching the window). */
export function crimePeriod(crime: CrimeSummary | null): string {
  if (!crime || crime.monthly_trend.length === 0) {
    return `Last ${CRIME_WINDOW_MONTHS} months`;
  }
  const months = crime.monthly_trend.map((m) => m.month).sort();
  const fmt = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  };
  const oldest = months[0];
  const newest = months[months.length - 1];
  return oldest === newest ? fmt(newest) : `${fmt(oldest)} to ${fmt(newest)}`;
}
