/* Forecast — linear time-series projection (AR-190, ADR 0025).

   The product question: "what is this signal likely to be N months from
   now at this LSOA?" Answered by fitting a linear regression on the
   trailing window of signal_timeseries observations and extrapolating
   forward. Same x = year*12 + month synthetic month index used by the
   trend-slope derive (ADR 0021), so slope's units are raw_value-per-month
   and projections are in the source signal's native units.

   Methodology:
     - Fetch regression coefficients from Postgres regr_* aggregates over
       the trailing windowMonths (default 24).
     - JS computes y_pred(x) = intercept + slope * x for each future
       month x = latest_x + 1 .. latest_x + horizonMonths.
     - Confidence interval: ±2 * residual_stderr, where residual_stderr
       = SQRT( (1 - r2) * variance(y) ). This is a SIMPLE-band CI that
       does NOT widen with extrapolation distance; v1 acknowledges this
       and the ADR documents the tradeoff. Far-horizon projections are
       weaker than the constant-width CI suggests.
     - HAVING n_observations >= 6 (configurable via window_months
       minimum) guards against tiny-window degenerate fits.

   Pure parse + SQL builder + I/O runner. See ADR 0025. */

import { query as defaultQuery } from "../../infrastructure/db/client";

export const FORECAST_DEFAULT_WINDOW = 24;
export const FORECAST_DEFAULT_HORIZON = 12;
export const FORECAST_MAX_HORIZON = 60;
export const FORECAST_MAX_WINDOW = 120;
export const FORECAST_MIN_WINDOW = 6;
export const FORECAST_CI_K = 2; // ±k * residual_stderr; ~95% under normal-residual assumption

export interface ForecastInput {
  targetGeoCode: string;
  signalKey: string;
  windowMonths: number;
  horizonMonths: number;
}

export interface ForecastStatsRow {
  /** Postgres regr_slope (y per unit x; here y per month). */
  slope: number;
  /** Postgres regr_intercept. */
  intercept: number;
  /** Postgres regr_r2 — coefficient of determination. */
  r2: number | null;
  /** Number of (x,y) observations the regression saw. */
  n_observations: number;
  /** y variance over the window (regr_avgy ignored; computed from regr_syy / regr_count). */
  y_variance: number;
  /** Latest observed_period in the window — anchors the projection. */
  latest_observed_period: string;
  /** Latest x (year*12 + month) — the integer month index to project from. */
  latest_x: number;
}

export interface ForecastPointResult {
  observed_period: string;
  projected_value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResult {
  stats: ForecastStatsRow;
  points: ForecastPointResult[];
  residualStderr: number | null;
}

export type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
const runDefault: Runner = (text, params) => defaultQuery(text, params);

/** PURE: validate + coerce raw inputs. */
export function parseForecastInput(raw: {
  targetGeoCode?: string;
  signalKey?: string;
  windowMonths?: number;
  horizonMonths?: number;
}): { ok: true; input: ForecastInput } | { ok: false; error: string } {
  const targetGeoCode = (raw.targetGeoCode ?? "").trim();
  if (!targetGeoCode) return { ok: false, error: "Missing target geo_code." };
  const signalKey = (raw.signalKey ?? "").trim();
  if (!signalKey) return { ok: false, error: "Missing required 'signal_key'." };

  let windowMonths = FORECAST_DEFAULT_WINDOW;
  if (raw.windowMonths !== undefined) {
    const n = Number(raw.windowMonths);
    if (!Number.isInteger(n) || n < FORECAST_MIN_WINDOW) {
      return { ok: false, error: `window_months must be an integer >= ${FORECAST_MIN_WINDOW}.` };
    }
    windowMonths = Math.min(n, FORECAST_MAX_WINDOW);
  }

  let horizonMonths = FORECAST_DEFAULT_HORIZON;
  if (raw.horizonMonths !== undefined) {
    const n = Number(raw.horizonMonths);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "horizon_months must be a positive integer." };
    horizonMonths = Math.min(n, FORECAST_MAX_HORIZON);
  }

  return { ok: true, input: { targetGeoCode, signalKey, windowMonths, horizonMonths } };
}

/** PURE: SQL that returns the regression stats over the trailing
    windowMonths of signal_timeseries for one (signal_key, geo_code).
    Uses Postgres's built-in regr_* aggregates -- no JS-side regression.
    The variance computation derives from regr_syy / (n-1) so we can compute
    the residual standard error in JS without another round-trip. */
export function buildForecastStatsSql(): string {
  return `WITH ranked AS (
  SELECT observed_period,
         raw_value::float8 AS y,
         (substr(observed_period, 1, 4)::int * 12 + substr(observed_period, 6, 2)::int)::float8 AS x,
         ROW_NUMBER() OVER (ORDER BY observed_period DESC) AS rn
    FROM signal_timeseries
   WHERE signal_key = $1
     AND geo_type = 'lsoa'
     AND geo_code = $2
     AND observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND raw_value IS NOT NULL
),
windowed AS (
  SELECT * FROM ranked WHERE rn <= $3
)
SELECT regr_slope(y, x)::float8 AS slope,
       regr_intercept(y, x)::float8 AS intercept,
       regr_r2(y, x)::float8 AS r2,
       COUNT(*)::int AS n_observations,
       -- regr_syy is the sum of squared deviations of y from its mean.
       -- y_variance (sample) = regr_syy / NULLIF(n-1, 0). NULLIF protects 1-row windows.
       (regr_syy(y, x) / NULLIF(COUNT(*) - 1, 0))::float8 AS y_variance,
       (MAX(observed_period))::text AS latest_observed_period,
       MAX((substr(observed_period, 1, 4)::int * 12 + substr(observed_period, 6, 2)::int))::int AS latest_x
  FROM windowed`;
}

/** PURE: increment a 'YYYY-MM' period by `offset` months. Handles year carry. */
export function addMonths(periodYYYYMM: string, offset: number): string {
  const m = periodYYYYMM.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`expected YYYY-MM, got "${periodYYYYMM}"`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  // Convert to a synthetic month-index, add, convert back. month index from 1.
  const idx = year * 12 + (month - 1) + offset; // months from year 0 in [0..11]
  const newYear = Math.floor(idx / 12);
  const newMonth = (idx % 12) + 1;
  return `${String(newYear).padStart(4, "0")}-${String(newMonth).padStart(2, "0")}`;
}

/** PURE: from regression stats, compute the projected points + residual stderr.
    Exported separately so tests can exercise the projection math without
    needing a database. Returns null `residual_stderr` when r2 / variance
    can't be derived from the stats row (e.g. degenerate fit). */
export function projectForecast(stats: ForecastStatsRow, horizonMonths: number): ForecastResult {
  // Residual stderr (constant-width band — see ADR 0025 tradeoff note).
  //   variance(residuals) = (1 - r2) * variance(y)
  //   residual_stderr     = SQRT(variance(residuals))
  // Falls back to null when r2 or y_variance unavailable / negative.
  const r2 = stats.r2;
  const yVar = stats.y_variance;
  let residualStderr: number | null = null;
  if (r2 !== null && Number.isFinite(r2) && Number.isFinite(yVar) && yVar >= 0) {
    const v = (1 - r2) * yVar;
    residualStderr = v >= 0 ? Math.sqrt(v) : null;
  }
  const halfWidth = residualStderr === null ? 0 : FORECAST_CI_K * residualStderr;

  const points: ForecastPointResult[] = [];
  for (let i = 1; i <= horizonMonths; i++) {
    const x = stats.latest_x + i;
    const y = stats.intercept + stats.slope * x;
    points.push({
      observed_period: addMonths(stats.latest_observed_period, i),
      projected_value: y,
      lower_bound: y - halfWidth,
      upper_bound: y + halfWidth,
    });
  }
  return { stats, points, residualStderr };
}

/** I/O: run the SQL, then project. Returns null when no observations match
    the window (e.g. signal not in time-series for this LSOA). */
export async function runForecast(input: ForecastInput, run: Runner = runDefault): Promise<ForecastResult | null> {
  const rows = await run(buildForecastStatsSql(), [input.signalKey, input.targetGeoCode, input.windowMonths]);
  if (rows.length === 0) return null;
  const r = rows[0];
  // Postgres regr_slope returns NULL when there are 0 or 1 distinct x; bail.
  if (r.slope === null || r.intercept === null || r.n_observations === null || Number(r.n_observations) < 2) return null;

  const stats: ForecastStatsRow = {
    slope: Number(r.slope),
    intercept: Number(r.intercept),
    r2: r.r2 === null || r.r2 === undefined ? null : Number(r.r2),
    n_observations: Number(r.n_observations),
    y_variance: r.y_variance === null || r.y_variance === undefined ? 0 : Number(r.y_variance),
    latest_observed_period: String(r.latest_observed_period ?? ""),
    latest_x: Number(r.latest_x),
  };
  return projectForecast(stats, input.horizonMonths);
}
