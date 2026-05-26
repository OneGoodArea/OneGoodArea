/* modules/monitor — change detection (the Monitor depth).

   Diffs a portfolio's tracked areas across two time-series periods and surfaces
   the MATERIAL moves, then fires `signal.changed` webhooks. This is what the
   time-series corpus (the moat clock, ADR 0010) was built for: nothing can
   detect change until history accrues. It bites on signals that MOVE — prices
   (monthly, ADR 0011); deprivation is static (one period = no change).

   Pure diff (diffSeries / buildChanges) is separated from I/O (resolve areas ->
   LSOA, read the store, fire webhooks) so the logic is unit-testable without a
   DB or network. See ADR 0013. Scoped by user_id via getPortfolio (ownership). */

import { query as defaultQuery } from "../../infrastructure/db/client";
import { geocodeArea } from "../signals/data-sources/postcodes";
import { fireWebhookEvent } from "../webhooks";
import { logger } from "../tracking/structured-logger";
import { getPortfolio } from "./portfolio";
import type { SignalChange, ChangeReport } from "@onegoodarea/contracts";

/** Parameterized read runner ($1, $2, …). Injected in tests. */
export type Reader = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
const runDefault: Reader = (text, params) => defaultQuery(text, params);

export type Baseline = "previous" | "first";
export const DEFAULT_THRESHOLD_PCT = 5;
/** Default minimum transactions in BOTH periods for a price move to count as
    material (de-noises the small-sample LSOA-month medians). 0 = no gating. */
export const DEFAULT_MIN_TRANSACTIONS = 8;
/** Areas resolved + checked per request (each resolve is a live geocode). */
export const CHANGE_AREA_MAX = 100;
const RESOLVE_CONCURRENCY = 5;

/** Value signal -> the count signal that backs its sample size (for gating). */
const SAMPLE_SIGNAL: Record<string, string> = { "property.median_price": "property.transaction_count" };
/** Count series are SAMPLE inputs (used to gate), not headline signals we alert
    on — a "2 sales became 1" move is noise, not a change worth a webhook. */
const SAMPLE_SIGNALS = new Set(Object.values(SAMPLE_SIGNAL));

export interface SeriesPoint { period: string; value: number | null }

/** PURE: diff one (signal, geo) series into a SignalChange, or null when there
    is nothing to compare (fewer than two distinct periods). `baseline` selects
    what "from" is: the immediately prior period, or the oldest in range. */
export function diffSeries(
  params: { signalKey: string; label: string | null; area: string; geoCode: string; points: SeriesPoint[] },
  opts: { baseline: Baseline; thresholdPct: number },
): SignalChange | null {
  const points = [...params.points].sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
  if (points.length < 2) return null;

  const to = points[points.length - 1]!;
  const from = opts.baseline === "first" ? points[0]! : points[points.length - 2]!;
  if (from.period === to.period) return null;

  const value_from = from.value;
  const value_to = to.value;
  const delta = value_from !== null && value_to !== null ? value_to - value_from : null;
  const pct_change = delta !== null && value_from !== null && value_from !== 0 ? (delta / Math.abs(value_from)) * 100 : null;
  const direction: SignalChange["direction"] = delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const material = pct_change !== null && Math.abs(pct_change) >= opts.thresholdPct;

  return {
    signal_key: params.signalKey,
    label: params.label,
    area: params.area,
    geo_code: params.geoCode,
    period_from: from.period,
    period_to: to.period,
    value_from,
    value_to,
    delta,
    pct_change: pct_change === null ? null : Math.round(pct_change * 100) / 100,
    direction,
    material,
  };
}

/** A time-series row as read from the store (one period of one signal at one LSOA). */
export interface TimeseriesRow { signal_key: string; label: string | null; geo_code: string; observed_period: string; raw_value: number | null }

/** PURE: given the tracked areas (area -> LSOA) and the store rows for those
    LSOAs, produce the MATERIAL changes. One change per (area, signal) that moved
    >= threshold. Areas sharing an LSOA each get their own row (area-centric).

    Sample-size gating (`minTransactions`): a price move is only material if BOTH
    its periods had at least that many transactions, which filters the noisy
    small-sample LSOA-month medians (a 47% swing on 2 sales is not signal). Only
    applies to signals with a backing count series (property.median_price). */
export function buildChanges(
  areaLsoas: ReadonlyArray<{ area: string; geoCode: string }>,
  storeRows: ReadonlyArray<TimeseriesRow>,
  opts: { baseline: Baseline; thresholdPct: number; minTransactions?: number },
): SignalChange[] {
  const minTx = opts.minTransactions ?? 0;
  // index store rows by geoCode -> signalKey -> points (+ remember the label)
  const byGeo = new Map<string, Map<string, { label: string | null; points: SeriesPoint[] }>>();
  // count lookup for gating: geoCode -> signalKey -> period -> value
  const counts = new Map<string, Map<string, Map<string, number>>>();
  for (const r of storeRows) {
    let bySignal = byGeo.get(r.geo_code);
    if (!bySignal) { bySignal = new Map(); byGeo.set(r.geo_code, bySignal); }
    let entry = bySignal.get(r.signal_key);
    if (!entry) { entry = { label: r.label, points: [] }; bySignal.set(r.signal_key, entry); }
    entry.points.push({ period: r.observed_period, value: r.raw_value });

    let bySig = counts.get(r.geo_code);
    if (!bySig) { bySig = new Map(); counts.set(r.geo_code, bySig); }
    let byPeriod = bySig.get(r.signal_key);
    if (!byPeriod) { byPeriod = new Map(); bySig.set(r.signal_key, byPeriod); }
    if (r.raw_value !== null) byPeriod.set(r.observed_period, r.raw_value);
  }

  /** True if the sample at both periods clears minTx (or no gating applies). */
  const passesSampleGate = (geoCode: string, signalKey: string, c: SignalChange): boolean => {
    if (minTx <= 0) return true;
    const sampleKey = SAMPLE_SIGNAL[signalKey];
    if (!sampleKey) return true; // no backing count series -> not gated
    const byPeriod = counts.get(geoCode)?.get(sampleKey);
    const from = byPeriod?.get(c.period_from) ?? 0;
    const to = byPeriod?.get(c.period_to) ?? 0;
    return from >= minTx && to >= minTx;
  };

  const changes: SignalChange[] = [];
  for (const { area, geoCode } of areaLsoas) {
    const bySignal = byGeo.get(geoCode);
    if (!bySignal) continue;
    for (const [signalKey, { label, points }] of bySignal) {
      if (SAMPLE_SIGNALS.has(signalKey)) continue; // the sample series isn't itself a change subject
      const change = diffSeries({ signalKey, label, area, geoCode, points }, opts);
      if (change && change.material && passesSampleGate(geoCode, signalKey, change)) changes.push(change);
    }
  }
  return changes;
}

/** Read every stored time-series point for a set of LSOAs (with the signal's
    catalog label). Empty array for no LSOAs. */
export async function readTimeseriesForLsoas(lsoas: readonly string[], run: Reader = runDefault): Promise<TimeseriesRow[]> {
  if (lsoas.length === 0) return [];
  const rows = await run(
    `SELECT t.signal_key, s.label, t.geo_code, t.observed_period, t.raw_value
       FROM signal_timeseries t
       LEFT JOIN signals s ON s.key = t.signal_key
      WHERE t.geo_type = 'lsoa' AND t.geo_code = ANY($1::text[])
      ORDER BY t.signal_key, t.geo_code, t.observed_period`,
    [lsoas],
  );
  return rows.map((r) => ({
    signal_key: r.signal_key as string,
    label: (r.label ?? null) as string | null,
    geo_code: r.geo_code as string,
    observed_period: r.observed_period as string,
    raw_value: r.raw_value === null || r.raw_value === undefined ? null : Number(r.raw_value),
  }));
}

/** Resolve portfolio areas to LSOAs (live geocode, bounded concurrency).
    Unresolvable areas are dropped. Exposed for testing via the injected geocoder. */
export async function resolveAreasToLsoa(
  areas: ReadonlyArray<{ area: string }>,
  geocode: (area: string) => Promise<{ lsoa: string } | null> = geocodeArea,
): Promise<{ area: string; geoCode: string }[]> {
  const out: { area: string; geoCode: string }[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(RESOLVE_CONCURRENCY, areas.length) }, async () => {
      while (i < areas.length) {
        const a = areas[i++]!;
        try {
          const geo = await geocode(a.area);
          if (geo?.lsoa) out.push({ area: a.area, geoCode: geo.lsoa });
        } catch (err) {
          logger.warn(`[monitor] change-detection could not resolve "${a.area}": ${String(err)}`);
        }
      }
    }),
  );
  return out;
}

export interface DetectOpts {
  baseline?: Baseline;
  thresholdPct?: number;
  /** Min transactions in both periods for a price move to count (de-noise). */
  minTransactions?: number;
  /** Fire signal.changed webhooks for material changes (default true). */
  emit?: boolean;
  run?: Reader;
  geocode?: (area: string) => Promise<{ lsoa: string } | null>;
  fire?: (userId: string, change: SignalChange) => Promise<void>;
}

/** Detect material change across a portfolio's areas, fire `signal.changed`
    webhooks, and return the report. Null if the portfolio is not owned. */
export async function detectPortfolioChanges(
  userId: string,
  portfolioId: string,
  opts: DetectOpts = {},
): Promise<ChangeReport | null> {
  const detail = await getPortfolio(userId, portfolioId);
  if (!detail) return null;

  const baseline: Baseline = opts.baseline ?? "previous";
  const thresholdPct = opts.thresholdPct ?? DEFAULT_THRESHOLD_PCT;
  const minTransactions = opts.minTransactions ?? DEFAULT_MIN_TRANSACTIONS;
  const emit = opts.emit ?? true;

  const areaLsoas = await resolveAreasToLsoa(detail.areas.slice(0, CHANGE_AREA_MAX), opts.geocode);
  const lsoas = [...new Set(areaLsoas.map((a) => a.geoCode))];
  const storeRows = await readTimeseriesForLsoas(lsoas, opts.run);
  const changes = buildChanges(areaLsoas, storeRows, { baseline, thresholdPct, minTransactions });

  if (emit && changes.length > 0) {
    const fire = opts.fire ?? ((uid, change) => fireWebhookEvent(uid, "signal.changed", { portfolio_id: portfolioId, ...change }));
    await Promise.allSettled(changes.map((c) => fire(userId, c)));
  }

  logger.info(`[monitor] change-check portfolio ${portfolioId}: ${areaLsoas.length} areas resolved, ${changes.length} material changes (baseline=${baseline}, threshold=${thresholdPct}%, minTx=${minTransactions})`);

  return {
    portfolio_id: portfolioId,
    baseline,
    threshold_pct: thresholdPct,
    min_transactions: minTransactions,
    areas_checked: areaLsoas.length,
    material_count: changes.length,
    changes,
    generated_at: new Date().toISOString(),
  };
}
