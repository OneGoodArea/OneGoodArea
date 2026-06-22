/* Crime refresh job — police.uk street-level data into the signal store.

   The third source, and the second DYNAMIC one (crime accrues monthly, like
   prices). The police.uk bulk archive carries an `LSOA code` on every crime, so
   aggregation to LSOA grain is native (no spatial join needed) — cleaner than
   the live fetcher's per-lat/lng point queries. See ADR 0015.

   The bulk archive (data.police.uk/data) is a large multi-file download (like
   NSPL), NOT in git: it unzips to `<root>/<YYYY-MM>/<YYYY-MM>-<force>-street.csv`.
   This loader walks a directory (or a single file) of those CSVs and streams
   them. A small real sample lives at apps/api/seed/police-sample.csv so CI/dev
   can exercise the loader without the archive.

   Store model (mirrors prices, ADR 0011):
     - signal_timeseries: crime.monthly_count per (LSOA, YYYY-MM) — the moat series.
     - signal_values (current): crime.total_12m (trailing-12-month total) +
       crime.monthly_rate (per-month average), which MATCH area-profile.ts.
   Network/DB/file are injectable so the job is unit-testable. */

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { METHODOLOGY_VERSION } from "../../engine/methodology";
import { generateId } from "../../../infrastructure/utils/id";
import { logger } from "../../tracking/structured-logger";
import { parseCsvLine } from "./geo-spine";
import {
  writeSnapshots,
  upsertSignalCatalog,
  upsertSignalValues,
  upsertSignalTimeseries,
  type QueryRunner,
  type SignalCatalogRow,
  type SignalValueRow,
  type SignalTimeseriesRow,
} from "./store-writer";

/* ── catalog (current keys match area-profile.ts; monthly_count is the series) ── */

const CRIME_SOURCE = "Police.uk street-level crime";

export const CRIME_SIGNALS: SignalCatalogRow[] = [
  { key: "crime.total_12m", category: "crime", label: "Recorded crimes (12 months)", unit: "count", direction: "lower_is_better", source: CRIME_SOURCE, methodology_version: METHODOLOGY_VERSION },
  { key: "crime.monthly_rate", category: "crime", label: "Recorded crimes per month", unit: "per_month", direction: "lower_is_better", source: CRIME_SOURCE, methodology_version: METHODOLOGY_VERSION },
  { key: "crime.monthly_count", category: "crime", label: "Recorded crimes in month", unit: "count", direction: "lower_is_better", source: CRIME_SOURCE, methodology_version: METHODOLOGY_VERSION },
];

/** total_12m is the comparable headline; normalized within country. */
export const CRIME_NORMALIZE_KEYS = ["crime.total_12m"] as const;

/* ── pure parsing + aggregation ── */

/** police.uk street CSV header -> the columns we need (matched case-insensitively). */
export const CRIME_COLUMNS = { month: "month", lsoa: "lsoa code", crimeType: "crime type" } as const;
type CrimeColIndex = { month: number; lsoa: number };

export function buildCrimeHeaderIndex(headerFields: string[]): CrimeColIndex {
  const norm = headerFields.map((h) => h.trim().toLowerCase());
  return { month: norm.indexOf(CRIME_COLUMNS.month), lsoa: norm.indexOf(CRIME_COLUMNS.lsoa) };
}

export interface CrimeRecord { lsoa: string; month: string }

/** PURE: one police.uk street CSV row -> a usable record, or null to skip
    (no LSOA, or a malformed month). */
export function parseCrimeRow(fields: string[], idx: CrimeColIndex): CrimeRecord | null {
  const lsoa = idx.lsoa >= 0 ? (fields[idx.lsoa] ?? "").trim() : "";
  const month = idx.month >= 0 ? (fields[idx.month] ?? "").trim() : "";
  if (!lsoa) return null;                       // crimes with no LSOA (e.g. some BTP) are dropped
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return { lsoa, month };
}

/** buckets: LSOA -> (YYYY-MM -> crime count). */
export type CrimeBuckets = Map<string, Map<string, number>>;

/** PURE: add one crime to the (lsoa, month) bucket, in place. */
export function addCrime(buckets: CrimeBuckets, lsoa: string, month: string): void {
  let byMonth = buckets.get(lsoa);
  if (!byMonth) { byMonth = new Map(); buckets.set(lsoa, byMonth); }
  byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
}

export interface CrimeStoreRows {
  signalValues: SignalValueRow[];
  timeseriesRows: SignalTimeseriesRow[];
  months: number;
  latestPeriod: string | null;
}

/** PURE: buckets -> store rows.
    - signal_timeseries: crime.monthly_count per (lsoa, month).
    - signal_values (current): crime.total_12m (sum of the latest <=12 months) +
      crime.monthly_rate (that total / months counted). */
export function crimeBucketsToRows(buckets: CrimeBuckets, snapshotId: string): CrimeStoreRows {
  const signalValues: SignalValueRow[] = [];
  const timeseriesRows: SignalTimeseriesRow[] = [];
  const allMonths = new Set<string>();
  let latestPeriod: string | null = null;

  for (const [lsoa, byMonth] of buckets) {
    const months = [...byMonth.keys()].sort(); // ascending
    for (const m of months) {
      allMonths.add(m);
      if (m > (latestPeriod ?? "")) latestPeriod = m;
      timeseriesRows.push({
        signal_key: "crime.monthly_count", geo_type: "lsoa", geo_code: lsoa, observed_period: m,
        raw_value: byMonth.get(m)!, raw_value_text: null, normalized_value: null, confidence: 0.85,
        source_snapshot_id: snapshotId, engine_version: METHODOLOGY_VERSION,
      });
    }
    // trailing window: the most recent up-to-12 months
    const window = months.slice(-12);
    const total = window.reduce((s, m) => s + byMonth.get(m)!, 0);
    const monthsCounted = window.length;
    const rate = monthsCounted > 0 ? Math.round(total / monthsCounted) : 0;
    const periodLabel = monthsCounted === 0 ? "n/a" : window.length === 1 ? window[0]! : `${window[0]} to ${window[window.length - 1]}`;
    const reason = `${CRIME_SOURCE}: ${total} recorded crimes over ${monthsCounted} month${monthsCounted === 1 ? "" : "s"} (${periodLabel}).`;
    signalValues.push(
      { signal_key: "crime.total_12m", geo_type: "lsoa", geo_code: lsoa, raw_value: total, raw_value_text: null, normalized_value: null, confidence: 0.85, confidence_reason: reason, source_snapshot_id: snapshotId, observed_period: periodLabel, engine_version: METHODOLOGY_VERSION },
      { signal_key: "crime.monthly_rate", geo_type: "lsoa", geo_code: lsoa, raw_value: rate, raw_value_text: null, normalized_value: null, confidence: 0.85, confidence_reason: reason, source_snapshot_id: snapshotId, observed_period: periodLabel, engine_version: METHODOLOGY_VERSION },
    );
  }
  return { signalValues, timeseriesRows, months: allMonths.size, latestPeriod };
}

/* ── streaming a source (a directory of *-street.csv, or a single file) ── */

/** Recursively list `*-street.csv` files under a directory (or [path] if it is a
    single file). The police archive nests them as <YYYY-MM>/<...>-street.csv. */
export async function findStreetCsvs(path: string): Promise<string[]> {
  const s = await stat(path);
  if (s.isFile()) return [path];
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && /-street\.csv$/i.test(entry.name)) out.push(full);
    }
  };
  await walk(path);
  return out.sort();
}

/* ── orchestration (injectable deps) ── */

export interface CrimeRefreshDeps {
  /** A directory of police *-street.csv files, or a single CSV. */
  source?: string;
  run?: QueryRunner;
  makeId?: () => string;
  /** Override file discovery + line streaming (tests). */
  files?: () => Promise<string[]>;
  linesOf?: (file: string) => AsyncIterable<string>;
}

export interface CrimeRefreshSummary {
  source: string;
  snapshotId: string;
  files: number;
  parsed: number;
  lsoas: number;
  months: number;
  latestPeriod: string | null;
  signalValues: number;
  timeseriesRows: number;
}

async function* fileLines(file: string): AsyncIterable<string> {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

export async function runCrimeRefresh(deps: CrimeRefreshDeps = {}): Promise<CrimeRefreshSummary> {
  const run = deps.run;
  const makeId = deps.makeId ?? (() => generateId("snap", 12));
  const source = deps.source ?? "";
  const snapshotId = makeId();

  const files = deps.files ? await deps.files() : await findStreetCsvs(source);
  const linesOf = deps.linesOf ?? fileLines;

  const buckets: CrimeBuckets = new Map();
  let parsed = 0;
  for (const file of files) {
    let idx: CrimeColIndex | null = null;
    for await (const line of linesOf(file)) {
      if (!line.trim()) continue;
      const fields = parseCsvLine(line);
      if (!idx) {
        idx = buildCrimeHeaderIndex(fields);
        if (idx.lsoa < 0 || idx.month < 0) throw new Error(`police CSV header missing "LSOA code"/"Month" in ${file}`);
        continue;
      }
      const rec = parseCrimeRow(fields, idx);
      if (!rec) continue;
      parsed++;
      addCrime(buckets, rec.lsoa, rec.month);
    }
  }

  const { signalValues, timeseriesRows, months, latestPeriod } = crimeBucketsToRows(buckets, snapshotId);

  await upsertSignalCatalog(CRIME_SIGNALS, run);
  await writeSnapshots([{
    id: snapshotId, source: CRIME_SOURCE, release_date: null, licence: "Open Government Licence v3.0",
    checksum: null, row_count: parsed, notes: `${files.length} files, ${months} months, latest ${latestPeriod ?? "n/a"}`,
  }], run);
  await upsertSignalTimeseries(timeseriesRows, run);
  await upsertSignalValues(signalValues, run);
  // WRITE-ONLY: normalization is a separate idempotent step (`normalize:signals`).
  // The single-process inline normalize after a multi-minute write timed out
  // on Neon HTTP three times this session — separating prevents that recurrence.

  logger.info(`[refresh:crime] ${parsed} crimes from ${files.length} files -> ${buckets.size} LSOAs x ${months} months; ${signalValues.length} current + ${timeseriesRows.length} history rows`);

  return {
    source, snapshotId, files: files.length, parsed,
    lsoas: buckets.size, months, latestPeriod,
    signalValues: signalValues.length, timeseriesRows: timeseriesRows.length,
  };
}

/* CLI:  npm run refresh:crime -w @onegoodarea/api -- <dir-or-file>
   Download the bulk archive from data.police.uk/data, unzip, and pass the folder. */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("crime.ts"));
if (invokedDirectly) {
  const source = process.argv[2];
  if (!source) { console.error("usage: npm run refresh:crime -w @onegoodarea/api -- <dir-or-file>"); process.exit(1); }
  runCrimeRefresh({ source })
    .then((s) => {
      console.log(`[refresh:crime] ${s.parsed} crimes (${s.files} files) -> ${s.lsoas} LSOAs x ${s.months} months`);
      console.log(`  current: ${s.signalValues} values (latest ${s.latestPeriod}); history: ${s.timeseriesRows} rows; snapshot ${s.snapshotId}`);
      process.exit(0);
    })
    .catch((err) => { console.error("[refresh:crime] failed:", err); process.exit(1); });
}
