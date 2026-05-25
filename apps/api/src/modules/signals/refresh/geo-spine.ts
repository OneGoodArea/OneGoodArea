/* The ONS geo spine loader — postcode -> OA/LSOA/MSOA/LAD/region.

   Streams an ONS NSPL/ONSPD bulk CSV (≈1M rows) into geo_lookup (+ asserts the
   LSOA geo_entities). Streaming + chunked upserts so it never loads the whole
   file into memory. This is what unlocks cross-area query and store-side
   postcode resolution (today we resolve via postcodes.io per request).

   The full ONS file is NOT in git (≈1GB) — download NSPL from ONS Open Geography
   and run `npm run load:geo -- <path>`. A small real sample lives at
   apps/api/seed/nspl-sample.csv so CI/dev can exercise the loader without it.

   Column names default to NSPL 2021 (`NSPL_COLUMNS`); ONS occasionally renames
   columns between releases, so the mapping is config-driven and validated
   against the file header at load time. region/country are passed through as-is
   (the seed carries names; real NSPL carries codes — the loader does not care).
   See ADR 0006. */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import {
  upsertGeoLookup,
  upsertGeoEntities,
  type QueryRunner,
  type GeoLookupRow,
  type GeoEntityRow,
} from "./store-writer";

/** geo_lookup field -> NSPL/ONSPD CSV header. Verify against your ONS release. */
export const NSPL_COLUMNS = {
  postcode: "pcds",
  oa: "oa21",
  lsoa: "lsoa21",
  msoa: "msoa21",
  lad: "laua",
  region: "rgn",
  country: "ctry",
  lat: "lat",
  lng: "long",
} as const;

export type ColumnMap = typeof NSPL_COLUMNS;
type ColIndex = Record<keyof ColumnMap, number>;

/** Parse one CSV line, honoring double-quoted fields (which may contain commas
    or escaped ""). Allocation-light for streaming a 1M-row file. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Map {field -> column index} from the header row for the configured columns
    (missing column -> -1). */
export function buildHeaderIndex(headerFields: string[], cols: ColumnMap = NSPL_COLUMNS): ColIndex {
  const norm = headerFields.map((h) => h.trim().toLowerCase());
  const idx = {} as ColIndex;
  for (const key of Object.keys(cols) as (keyof ColumnMap)[]) {
    idx[key] = norm.indexOf(cols[key].toLowerCase());
  }
  return idx;
}

function normalizePostcode(pc: string): string {
  const t = pc.trim().toUpperCase().replace(/\s+/g, "");
  return t.length < 5 ? t : `${t.slice(0, -3)} ${t.slice(-3)}`;
}
const str = (s: string | undefined): string | null => {
  const t = s?.trim();
  return t ? t : null;
};
const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : null;
};

/** PURE: one CSV record -> store rows, or null to skip (no postcode or no LSOA =
    not useful for the spine). */
export function rowToGeo(fields: string[], idx: ColIndex): { lookup: GeoLookupRow; entity: GeoEntityRow } | null {
  const rawPc = idx.postcode >= 0 ? fields[idx.postcode] : undefined;
  const lsoa = idx.lsoa >= 0 ? str(fields[idx.lsoa]) : null;
  if (!rawPc || !rawPc.trim() || !lsoa) return null;

  const country = idx.country >= 0 ? str(fields[idx.country]) : null;
  const lookup: GeoLookupRow = {
    postcode: normalizePostcode(rawPc),
    oa_code: idx.oa >= 0 ? str(fields[idx.oa]) : null,
    lsoa_code: lsoa,
    msoa_code: idx.msoa >= 0 ? str(fields[idx.msoa]) : null,
    lad_code: idx.lad >= 0 ? str(fields[idx.lad]) : null,
    lad_name: null,
    region: idx.region >= 0 ? str(fields[idx.region]) : null,
    country,
    latitude: idx.lat >= 0 ? num(fields[idx.lat]) : null,
    longitude: idx.lng >= 0 ? num(fields[idx.lng]) : null,
    boundary_version: "2021",
  };
  const entity: GeoEntityRow = {
    geo_type: "lsoa", geo_code: lsoa, name: null,
    latitude: null, longitude: null, country, boundary_version: "2021",
  };
  return { lookup, entity };
}

export interface GeoSpineSummary { postcodes: number; lsoas: number }

export async function loadGeoSpine(
  filePath: string,
  opts: { run?: QueryRunner; cols?: ColumnMap; batchSize?: number } = {},
): Promise<GeoSpineSummary> {
  const cols = opts.cols ?? NSPL_COLUMNS;
  const batchSize = opts.batchSize ?? 1000;
  const rl = createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });

  let idx: ColIndex | null = null;
  let lookupBatch: GeoLookupRow[] = [];
  let entityBatch: GeoEntityRow[] = [];
  const seenLsoa = new Set<string>();
  let postcodes = 0;

  const flush = async () => {
    if (lookupBatch.length) { await upsertGeoLookup(lookupBatch, opts.run); lookupBatch = []; }
    if (entityBatch.length) { await upsertGeoEntities(entityBatch, opts.run); entityBatch = []; }
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (!idx) {
      idx = buildHeaderIndex(fields, cols);
      if (idx.postcode < 0 || idx.lsoa < 0) {
        throw new Error("NSPL header is missing the postcode/LSOA columns — check NSPL_COLUMNS against your file header.");
      }
      continue;
    }
    const row = rowToGeo(fields, idx);
    if (!row) continue;
    lookupBatch.push(row.lookup);
    postcodes++;
    if (!seenLsoa.has(row.entity.geo_code)) { seenLsoa.add(row.entity.geo_code); entityBatch.push(row.entity); }
    if (lookupBatch.length >= batchSize || entityBatch.length >= batchSize) await flush();
  }
  await flush();
  return { postcodes, lsoas: seenLsoa.size };
}

// CLI: npm run load:geo -- <path-to-NSPL.csv>  (use the seed for a smoke test)
const invokedDirectly = Boolean(process.argv[1]?.endsWith("geo-spine.ts"));
if (invokedDirectly) {
  const file = process.argv[2];
  if (!file) { console.error("usage: npm run load:geo -w @onegoodarea/api -- <path-to-NSPL.csv>"); process.exit(1); }
  loadGeoSpine(file)
    .then((s) => { console.log(`[load:geo] loaded ${s.postcodes} postcodes, ${s.lsoas} LSOAs from ${file}`); process.exit(0); })
    .catch((err) => { console.error("[load:geo] failed:", err); process.exit(1); });
}
