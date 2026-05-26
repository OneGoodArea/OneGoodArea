/* Prices refresh job — HM Land Registry Price Paid Data into the signal store.

   The second source (after deprivation) and the first DYNAMIC one: prices move
   month to month, so this is what makes the time-series corpus (the moat) start
   to MOVE rather than just sit at one static snapshot. It is also the first
   source whose history is a PUBLISHED ARCHIVE, so we can legitimately BACKFILL
   real monthly history straight away (the "un-backfillable" caveat only applies
   to live-captured signals; Land Registry publishes years of it). See ADR 0011.

   Coverage: England & Wales only (Land Registry's remit; Scotland's prices live
   in Registers of Scotland, a separate source). LSOA grain via the ONS spine
   (postcode -> LSOA in geo_lookup, loaded by geo-spine.ts).

   Pipeline:
     stream the PP CSV (no header) -> parse (price, month, postcode)
       -> map postcode -> LSOA via geo_lookup
       -> bucket prices by (LSOA, YYYY-MM)
       -> median price + transaction count per bucket
       -> write signal_values (latest month = current) + signal_timeseries (all
          months = the backfilled history).

   Signal keys/labels MATCH area-profile.ts (property.median_price /
   property.transaction_count), so a store-served price signal is identical to a
   live-served one. Network/DB/file are injectable so the job is unit-testable. */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { METHODOLOGY_VERSION } from "../../reports/methodology";
import { generateId } from "../../../infrastructure/utils/id";
import { logger } from "../../tracking/structured-logger";
import { query as defaultQuery } from "../../../infrastructure/db/client";
import { parseCsvLine, normalizePostcode } from "./geo-spine";
import { normalizeSignals } from "./normalize";
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

/* ── the catalog this job owns (must match area-profile.ts) ── */

const PRICES_SOURCE = "HM Land Registry Price Paid Data";

export const PRICES_SIGNALS: SignalCatalogRow[] = [
  {
    key: "property.median_price",
    category: "property",
    label: "Median sale price",
    unit: "GBP",
    direction: "neutral",
    source: PRICES_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "property.transaction_count",
    category: "property",
    label: "Sale transactions in period",
    unit: "count",
    direction: "neutral",
    source: PRICES_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
];

/** Only median_price is normalized (a comparable position); transaction_count
    is a raw volume, not a percentile-meaningful signal. */
export const PRICES_NORMALIZE_KEYS = ["property.median_price"] as const;

/* ── pure parsing + maths ── */

/* PP CSV column order (no header row). 0=GUID 1=price 2=date 3=postcode
   4=property-type 5=old/new 6=duration ... 14=PPD-category 15=record-status. */
const PP = { price: 1, date: 2, postcode: 3, propertyType: 4, ppdCategory: 14, recordStatus: 15 } as const;

export interface PpTransaction { postcode: string; price: number; ym: string }

/** PURE: one PP CSV row -> a usable transaction, or null to skip.

    Keeps standard residential market sales only: PPD category A (a "standard
    price paid" sale, excludes repossessions / non-market transfers) and a
    residential property type (D/S/T/F, excludes O = other/commercial). Skips
    deleted records, rows with no postcode, and non-positive prices. */
export function parsePpRow(fields: string[]): PpTransaction | null {
  if (fields.length <= PP.recordStatus) return null;
  if ((fields[PP.recordStatus] ?? "").trim().toUpperCase() === "D") return null; // deleted
  if ((fields[PP.ppdCategory] ?? "").trim().toUpperCase() !== "A") return null;  // standard sales only
  const ptype = (fields[PP.propertyType] ?? "").trim().toUpperCase();
  if (ptype === "O" || ptype === "") return null;                                // residential only

  const rawPc = (fields[PP.postcode] ?? "").trim();
  if (!rawPc) return null;
  const price = Number((fields[PP.price] ?? "").trim());
  if (!Number.isFinite(price) || price <= 0) return null;

  const date = (fields[PP.date] ?? "").trim(); // "YYYY-MM-DD HH:MM"
  const ym = date.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;

  return { postcode: normalizePostcode(rawPc), price, ym };
}

/** PURE: median of a numeric array (does not mutate the input). */
export function medianOf(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/** Confidence in a bucket's median, scaled by the transaction sample behind it
    (a one-sale median is noisy; a 20-sale median is solid). */
export function priceConfidence(count: number): number {
  if (count >= 10) return 0.9;
  if (count >= 5) return 0.75;
  if (count >= 2) return 0.6;
  return 0.4;
}

/** buckets: LSOA -> (YYYY-MM -> list of sale prices). */
export type PriceBuckets = Map<string, Map<string, number[]>>;

/** PURE: add one transaction's price to the (lsoa, ym) bucket, in place. */
export function addToBuckets(buckets: PriceBuckets, lsoa: string, ym: string, price: number): void {
  let byMonth = buckets.get(lsoa);
  if (!byMonth) { byMonth = new Map(); buckets.set(lsoa, byMonth); }
  const list = byMonth.get(ym);
  if (list) list.push(price); else byMonth.set(ym, [price]);
}

/** PURE: aggregate transactions into buckets using a postcode->LSOA map.
    Transactions whose postcode is not in the spine are skipped + counted. */
export function aggregateTransactions(
  txns: ReadonlyArray<PpTransaction>,
  postcodeToLsoa: ReadonlyMap<string, string>,
): { buckets: PriceBuckets; unmapped: number } {
  const buckets: PriceBuckets = new Map();
  let unmapped = 0;
  for (const t of txns) {
    const lsoa = postcodeToLsoa.get(t.postcode);
    if (!lsoa) { unmapped++; continue; }
    addToBuckets(buckets, lsoa, t.ym, t.price);
  }
  return { buckets, unmapped };
}

export interface PriceStoreRows {
  signalValues: SignalValueRow[];
  timeseriesRows: SignalTimeseriesRow[];
  latestPeriod: string | null;
}

/** PURE: buckets -> store rows. Every (lsoa, month) becomes timeseries history
    (median + count); the latest month per lsoa also becomes the current
    signal_values. */
export function bucketsToRows(buckets: PriceBuckets, snapshotId: string): PriceStoreRows {
  const signalValues: SignalValueRow[] = [];
  const timeseriesRows: SignalTimeseriesRow[] = [];
  let latestPeriod: string | null = null;

  for (const [lsoa, byMonth] of buckets) {
    let latestYm = "";
    for (const ym of byMonth.keys()) if (ym > latestYm) latestYm = ym;
    if (latestYm > (latestPeriod ?? "")) latestPeriod = latestYm;

    for (const [ym, prices] of byMonth) {
      const median = medianOf(prices);
      const count = prices.length;
      const conf = priceConfidence(count);
      const reason = `${PRICES_SOURCE}: median of ${count} standard residential sale${count === 1 ? "" : "s"} in ${ym}.`;

      timeseriesRows.push(
        { signal_key: "property.median_price", geo_type: "lsoa", geo_code: lsoa, observed_period: ym, raw_value: median, raw_value_text: null, normalized_value: null, confidence: conf, source_snapshot_id: snapshotId, engine_version: METHODOLOGY_VERSION },
        { signal_key: "property.transaction_count", geo_type: "lsoa", geo_code: lsoa, observed_period: ym, raw_value: count, raw_value_text: null, normalized_value: null, confidence: conf, source_snapshot_id: snapshotId, engine_version: METHODOLOGY_VERSION },
      );

      if (ym === latestYm) {
        signalValues.push(
          { signal_key: "property.median_price", geo_type: "lsoa", geo_code: lsoa, raw_value: median, raw_value_text: null, normalized_value: null, confidence: conf, confidence_reason: reason, source_snapshot_id: snapshotId, observed_period: ym, engine_version: METHODOLOGY_VERSION },
          { signal_key: "property.transaction_count", geo_type: "lsoa", geo_code: lsoa, raw_value: count, raw_value_text: null, normalized_value: null, confidence: conf, confidence_reason: reason, source_snapshot_id: snapshotId, observed_period: ym, engine_version: METHODOLOGY_VERSION },
        );
      }
    }
  }
  return { signalValues, timeseriesRows, latestPeriod };
}

/* ── postcode -> LSOA map (from the spine) ── */

/** Build the England & Wales postcode -> LSOA map from geo_lookup, keyset-paged
    by postcode so a giant single result set never crosses the wire. */
export async function loadPostcodeLsoaMap(run: QueryRunner, pageSize = 50000): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let after = "";
  for (;;) {
    const rows = (await run(
      `SELECT postcode, lsoa_code FROM geo_lookup
        WHERE postcode > $1 AND lsoa_code IS NOT NULL
          AND (lsoa_code LIKE 'E01%' OR lsoa_code LIKE 'W01%')
        ORDER BY postcode ASC LIMIT $2`,
      [after, pageSize],
    )) as { postcode?: string; lsoa_code?: string }[];
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.postcode && r.lsoa_code) map.set(r.postcode, r.lsoa_code);
    }
    after = rows[rows.length - 1]!.postcode!;
    if (rows.length < pageSize) break;
  }
  return map;
}

/* ── streaming a PP source (local path or http(s) URL) ── */

/** The default Land Registry yearly file URL (a complete calendar year). */
export function landRegistryYearUrl(year: number): string {
  return `http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-${year}.csv`;
}

async function* streamLines(source: string): AsyncIterable<string> {
  const input = /^https?:\/\//i.test(source)
    ? await (async () => {
        const res = await fetch(source);
        if (!res.ok || !res.body) throw new Error(`PP fetch ${res.status} for ${source}`);
        return Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
      })()
    : createReadStream(source, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

/* ── orchestration (injectable deps) ── */

export interface PricesRefreshDeps {
  /** Local CSV path or http(s) URL. Defaults to the latest complete year. */
  source?: string;
  run?: QueryRunner;
  makeId?: () => string;
  /** Pre-built postcode->LSOA map (tests inject; prod loads from the spine). */
  postcodeToLsoa?: ReadonlyMap<string, string>;
  /** Override line streaming (tests inject; prod streams the file/URL). */
  lines?: () => AsyncIterable<string>;
  /** Skip normalization (tests). */
  skipNormalize?: boolean;
}

export interface PricesRefreshSummary {
  source: string;
  snapshotId: string;
  parsed: number;
  unmapped: number;
  lsoas: number;
  periods: number;
  latestPeriod: string | null;
  signalValues: number;
  timeseriesRows: number;
}

export async function runPricesRefresh(deps: PricesRefreshDeps = {}): Promise<PricesRefreshSummary> {
  const run = deps.run;
  const makeId = deps.makeId ?? (() => generateId("snap", 12));
  const source = deps.source ?? landRegistryYearUrl(new Date().getUTCFullYear() - 1);
  const snapshotId = makeId();

  const runner: QueryRunner = run ?? ((t, p) => defaultQuery(t, p));
  const postcodeToLsoa = deps.postcodeToLsoa ?? (await loadPostcodeLsoaMap(runner));
  if (postcodeToLsoa.size === 0) {
    throw new Error("postcode->LSOA map is empty — load the ONS geo spine (npm run load:geo) before refreshing prices.");
  }

  // Stream + aggregate (never holds the whole file in memory).
  const buckets: PriceBuckets = new Map();
  let parsed = 0;
  let unmapped = 0;
  const lineSource = deps.lines ? deps.lines() : streamLines(source);
  for await (const line of lineSource) {
    if (!line) continue;
    const tx = parsePpRow(parseCsvLine(line));
    if (!tx) continue;
    parsed++;
    const lsoa = postcodeToLsoa.get(tx.postcode);
    if (!lsoa) { unmapped++; continue; }
    addToBuckets(buckets, lsoa, tx.ym, tx.price);
  }

  const { signalValues, timeseriesRows, latestPeriod } = bucketsToRows(buckets, snapshotId);
  const periods = new Set(timeseriesRows.map((r) => r.observed_period)).size;

  await upsertSignalCatalog(PRICES_SIGNALS, run);
  await writeSnapshots([{
    id: snapshotId,
    source: PRICES_SOURCE,
    release_date: null,
    licence: "Open Government Licence v3.0",
    checksum: null,
    row_count: parsed,
    notes: `England & Wales, source ${source}, latest period ${latestPeriod ?? "n/a"}`,
  }], run);
  await upsertSignalTimeseries(timeseriesRows, run);
  await upsertSignalValues(signalValues, run);
  if (!deps.skipNormalize) await normalizeSignals(PRICES_NORMALIZE_KEYS, run);

  logger.info(`[refresh:prices] ${parsed} sales -> ${buckets.size} LSOAs x ${periods} months; ${signalValues.length} current + ${timeseriesRows.length} history rows`);

  return {
    source, snapshotId, parsed, unmapped,
    lsoas: buckets.size, periods, latestPeriod,
    signalValues: signalValues.length, timeseriesRows: timeseriesRows.length,
  };
}

/* CLI:  npm run refresh:prices -w @onegoodarea/api -- [<year>|<path>|<url>]
   No arg = the latest complete calendar year from Land Registry. */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("prices.ts"));
if (invokedDirectly) {
  const arg = process.argv[2];
  const source = arg && /^\d{4}$/.test(arg) ? landRegistryYearUrl(Number(arg)) : arg;
  runPricesRefresh({ source })
    .then((s) => {
      console.log(`[refresh:prices] ${s.parsed} sales (${s.unmapped} unmapped) -> ${s.lsoas} LSOAs x ${s.periods} months`);
      console.log(`  current: ${s.signalValues} values (latest ${s.latestPeriod}); history: ${s.timeseriesRows} rows; snapshot ${s.snapshotId}`);
      process.exit(0);
    })
    .catch((err) => { console.error("[refresh:prices] failed:", err); process.exit(1); });
}
