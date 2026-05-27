/* Deprivation refresh job — the first source to populate the signal store.

   Why deprivation first: it is static (official IMD/WIMD/SIMD releases),
   LSOA/Data-Zone grained (matches the store grain), nationally complete, and it
   is partly its OWN geo universe (every record carries an LSOA code, so
   geo_entities is populated as a byproduct). It is the cleanest proof of the
   refresh-into-store + serve-from-store loop. See ADR 0003.

   Three sources, one per country, each a snapshot:
     England  MHCLG IMD 2025  (LSOA 2021 boundaries)
     Wales    WIMD 2019       (LSOA 2011)
     Scotland SIMD 2020       (Data Zones 2011)
   pulled in bulk (paginated) from the same ArcGIS FeatureServers the live
   per-LSOA fetcher uses. The signal keys/labels/direction match
   area-profile.ts exactly, so a store-served signal is identical to a
   live-served one (required for the later fetch_mode flip).

   Network + DB are injectable so the job is unit-testable without either. */

import { METHODOLOGY_VERSION } from "../../reports/methodology";
import { generateId } from "../../../infrastructure/utils/id";
import { logger } from "../../tracking/structured-logger";
import {
  writeSnapshots,
  upsertSignalCatalog,
  upsertGeoEntities,
  upsertSignalValues,
  type QueryRunner,
  type SignalCatalogRow,
  type GeoEntityRow,
  type SignalValueRow,
} from "./store-writer";

/* ── the catalog this job owns (must match area-profile.ts) ── */

const DEPRIVATION_SOURCE = "Index of Multiple Deprivation (IMD/WIMD/SIMD)";

export const DEPRIVATION_SIGNALS: SignalCatalogRow[] = [
  {
    key: "deprivation.imd_decile",
    category: "deprivation",
    label: "Deprivation decile (1 most deprived, 10 least)",
    unit: "decile",
    direction: "higher_is_better",
    source: DEPRIVATION_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "deprivation.imd_rank",
    category: "deprivation",
    label: "Deprivation rank (higher is less deprived)",
    unit: "rank",
    direction: "higher_is_better",
    source: DEPRIVATION_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
];

/* ── per-country config ── */

interface CountryConfig {
  country: string;
  /** ONS country code (E92000001 etc.) — what we store, consistent with the NSPL
      geo data. The `country` name above is for source labels/logging only. */
  countryCode: string;
  source: string;
  observedPeriod: string;
  boundaryVersion: string;
  releaseDate: string | null;
  url: string;
  outFields: string;
  codeField: string;
  nameField: string;
  rankField: string;
  decileField: string;
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    country: "England",
    countryCode: "E92000001",
    source: "MHCLG Index of Multiple Deprivation 2025",
    observedPeriod: "IMD 2025",
    boundaryVersion: "2021",
    releaseDate: null,
    url: "https://services-eu1.arcgis.com/EbKcOS6EXZroSyoi/arcgis/rest/services/LSOA_IMD2025_WGS84/FeatureServer/0/query",
    outFields: "LSOA21CD,LSOA21NM,IMDRank,IMDDecil",
    codeField: "LSOA21CD",
    nameField: "LSOA21NM",
    rankField: "IMDRank",
    decileField: "IMDDecil",
  },
  {
    country: "Wales",
    countryCode: "W92000004",
    source: "Welsh Index of Multiple Deprivation 2019",
    observedPeriod: "WIMD 2019",
    boundaryVersion: "2011",
    releaseDate: null,
    url: "https://services9.arcgis.com/3DS2hBWXSllJ5p3H/arcgis/rest/services/Welsh_Index_of_Multiple_Deprivation_WIMD_2019_Overall/FeatureServer/0/query",
    outFields: "lsoa_code,lsoa_name0,rank,decile",
    codeField: "lsoa_code",
    nameField: "lsoa_name0",
    rankField: "rank",
    decileField: "decile",
  },
  {
    country: "Scotland",
    countryCode: "S92000003",
    source: "Scottish Index of Multiple Deprivation 2020",
    observedPeriod: "SIMD 2020",
    boundaryVersion: "2011",
    releaseDate: null,
    url: "https://services.arcgis.com/XSeYKQzfXnEgju9o/arcgis/rest/services/SG_SIMD_2020/FeatureServer/0/query",
    outFields: "DataZone,DZName,Rankv2,Decilev2",
    codeField: "DataZone",
    nameField: "DZName",
    rankField: "Rankv2",
    decileField: "Decilev2",
  },
];

/* ── network (injectable) ── */

/** Minimal fetch surface this job uses (so global fetch satisfies it). */
export type FetchFn = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

interface ArcGisPage {
  features?: { attributes: Record<string, unknown> }[];
  exceededTransferLimit?: boolean;
}

/** Page through an ArcGIS FeatureServer (where=1=1) until exhausted. Offsets by
    the count actually returned, so a server-side maxRecordCount cap is handled. */
export async function fetchArcGisAll(
  config: CountryConfig,
  fetchFn: FetchFn,
  pageSize = 2000,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let offset = 0;
  // Hard cap on iterations as a safety valve against a server ignoring offset.
  for (let page = 0; page < 1000; page++) {
    const url = new URL(config.url);
    url.searchParams.set("where", "1=1");
    url.searchParams.set("outFields", config.outFields);
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(pageSize));

    const res = await fetchFn(url.toString());
    if (!res.ok) throw new Error(`ArcGIS ${config.country} ${res.status}`);
    const data = (await res.json()) as ArcGisPage;
    const features = data.features ?? [];
    for (const f of features) out.push(f.attributes);

    offset += features.length;
    if (features.length === 0) break;
    if (features.length < pageSize && !data.exceededTransferLimit) break;
  }
  return out;
}

/* ── pure transform ── */

export interface StoreRows {
  geoEntities: GeoEntityRow[];
  signalValues: SignalValueRow[];
}

/** PURE: raw ArcGIS attributes for one country → store rows. Skips records with
    no geo code; emits a rank and/or decile signal value where present. */
export function toStoreRows(
  records: ReadonlyArray<Record<string, unknown>>,
  config: CountryConfig,
  snapshotId: string,
): StoreRows {
  const geoEntities: GeoEntityRow[] = [];
  const signalValues: SignalValueRow[] = [];
  const reason = `${config.source}: official LSOA-level index.`;

  for (const rec of records) {
    const code = rec[config.codeField];
    if (typeof code !== "string" || code.length === 0) continue;
    const name = typeof rec[config.nameField] === "string" ? (rec[config.nameField] as string) : null;

    geoEntities.push({
      geo_type: "lsoa",
      geo_code: code,
      name,
      latitude: null,
      longitude: null,
      country: config.countryCode,
      boundary_version: config.boundaryVersion,
    });

    const value = (signalKey: string, raw: unknown) => {
      if (typeof raw !== "number" || Number.isNaN(raw)) return;
      signalValues.push({
        signal_key: signalKey,
        geo_type: "lsoa",
        geo_code: code,
        raw_value: raw,
        raw_value_text: null,
        normalized_value: null,
        confidence: 0.9,
        confidence_reason: reason,
        source_snapshot_id: snapshotId,
        observed_period: config.observedPeriod,
        engine_version: METHODOLOGY_VERSION,
      });
    };
    value("deprivation.imd_rank", rec[config.rankField]);
    value("deprivation.imd_decile", rec[config.decileField]);
  }

  return { geoEntities, signalValues };
}

/* ── orchestration (injectable network + db) ── */

export interface RefreshDeps {
  fetchFn?: FetchFn;
  run?: QueryRunner;
  makeId?: () => string;
}

export interface RefreshSummary {
  catalog: number;
  countries: { country: string; snapshotId: string; geoEntities: number; signalValues: number }[];
  totalSignalValues: number;
}

export async function runDeprivationRefresh(deps: RefreshDeps = {}): Promise<RefreshSummary> {
  const fetchFn = deps.fetchFn ?? ((url: string) => fetch(url));
  const run = deps.run;
  const makeId = deps.makeId ?? (() => generateId("snap", 12));

  const catalog = await upsertSignalCatalog(DEPRIVATION_SIGNALS, run);

  const countries: RefreshSummary["countries"] = [];
  let totalSignalValues = 0;

  for (const config of COUNTRY_CONFIGS) {
    const snapshotId = makeId();
    const records = await fetchArcGisAll(config, fetchFn);
    const { geoEntities, signalValues } = toStoreRows(records, config, snapshotId);

    await writeSnapshots([{
      id: snapshotId,
      source: config.source,
      release_date: config.releaseDate,
      licence: "Open Government Licence v3.0",
      checksum: null,
      row_count: records.length,
      notes: `${config.country} ${config.observedPeriod}`,
    }], run);
    await upsertGeoEntities(geoEntities, run);
    await upsertSignalValues(signalValues, run);

    logger.info(`[refresh:deprivation] ${config.country}: ${records.length} records -> ${geoEntities.length} geo, ${signalValues.length} values`);
    countries.push({ country: config.country, snapshotId, geoEntities: geoEntities.length, signalValues: signalValues.length });
    totalSignalValues += signalValues.length;
  }

  return { catalog, countries, totalSignalValues };
}

/* CLI entry — runs against the real DATABASE_URL + live ArcGIS when invoked
   directly:  npm run refresh:deprivation -w @onegoodarea/api */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("deprivation.ts"));
if (invokedDirectly) {
  runDeprivationRefresh()
    .then((s) => {
      console.log(`[refresh:deprivation] catalog: ${s.catalog} signals; ${s.totalSignalValues} values across ${s.countries.length} countries`);
      for (const c of s.countries) console.log(`  ✓ ${c.country}: ${c.geoEntities} geo, ${c.signalValues} values (snapshot ${c.snapshotId})`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[refresh:deprivation] failed:", err);
      process.exit(1);
    });
}
