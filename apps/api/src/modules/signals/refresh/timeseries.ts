/* Time-series append — the moat clock.

   Snapshots the CURRENT signal_values into signal_timeseries, keyed by each
   signal's own observed_period. Run after every refresh: the refresh overwrites
   the current value in place; this preserves history. Idempotent + immutable per
   period (ON CONFLICT DO NOTHING on the PK incl observed_period), so:
     - static sources (e.g. IMD 2025) capture ONCE and never duplicate until a new
       release ships a new observed_period;
     - dynamic sources (crime/prices, monthly) accrue a new row each period.

   This is the highest-leverage move in the whole restructure: the time-series
   corpus is un-backfillable and is the fuel for change detection (Monitor),
   anomaly + calibration + forecasting (trainable models), and the moat itself
   (MASTER section 3/section 6). Every month not appended is a month that can't be recovered.
   See ADR 0010. */

import { query as defaultQuery } from "../../../infrastructure/db/client";
import type { QueryRunner } from "./store-writer";

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

/** PURE: the append statement. Copies current signal_values into the history,
    stamping captured_at; the source's observed_period is the period key.

    Excludes property.* and crime.* — those sources write their OWN monthly
    history directly (refresh/prices.ts, refresh/crime.ts) and their signal_values
    is a window AGGREGATE (e.g. "2025-01 to 2025-12"), not a single monthly
    observation, so it must not be appended as a fake period. The append job is
    for signals whose signal_values IS their current observed-period value
    (deprivation releases, and future live-captured signals). */
export function buildTimeseriesAppendSql(): string {
  return `INSERT INTO signal_timeseries
            (signal_key, geo_type, geo_code, observed_period, raw_value, raw_value_text,
             normalized_value, confidence, source_snapshot_id, engine_version, captured_at)
          SELECT signal_key, geo_type, geo_code, observed_period, raw_value, raw_value_text,
                 normalized_value, confidence, source_snapshot_id, engine_version, NOW()
            FROM signal_values
           WHERE observed_period IS NOT NULL
             AND signal_key NOT LIKE 'property.%'
             AND signal_key NOT LIKE 'crime.%'
          ON CONFLICT (signal_key, geo_type, geo_code, observed_period) DO NOTHING`;
}

export interface TimeseriesAppendSummary { appended: number; total: number }

/** Append the current signal_values to signal_timeseries (new periods only).
    Returns how many new history rows were added + the new total. */
export async function appendTimeseries(run: QueryRunner = runDefault): Promise<TimeseriesAppendSummary> {
  const count = async (): Promise<number> => {
    const r = (await run(`SELECT count(*)::int AS n FROM signal_timeseries`, []))[0] as { n?: number } | undefined;
    return Number(r?.n ?? 0);
  };

  const before = await count();
  await run(buildTimeseriesAppendSql(), []);
  const total = await count();
  return { appended: total - before, total };
}

/* CLI:  npm run timeseries:append -w @onegoodarea/api  (run monthly, after refresh) */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("timeseries.ts"));
if (invokedDirectly) {
  appendTimeseries()
    .then((s) => { console.log(`[timeseries:append] +${s.appended} new history rows (total ${s.total})`); process.exit(0); })
    .catch((err) => { console.error("[timeseries:append] failed:", err); process.exit(1); });
}
