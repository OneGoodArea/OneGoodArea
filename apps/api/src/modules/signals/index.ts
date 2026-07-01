/* modules/signals — public entry.

   getAreaProfile is the I/O orchestrator behind GET /v1/area: geocode the query,
   fetch the source structs in parallel (the SAME fetchers the report vertical
   uses), and assemble them into the Signal catalog. Crucially it does NOT score
   and does NOT call the AI — that is the inversion. The report path keeps using
   these fetchers too; signals just exposes their output as the primitive.

   v1 is live-fetch per request (meta.fetch_mode = "live"). When the persisted
   signal store lands (MASTER section 3, Phase 1) this function reads the store instead
   and flips fetch_mode to "store" — the response shape is unchanged, so callers
   never break.

   The fetchers live in this module (./data-sources): signals owns ingestion. */

import { geocodeArea, type GeocodedArea } from "./data-sources/postcodes";
import { getCrimeData } from "./data-sources/police";
import { getDeprivationData } from "./data-sources/deprivation";
import { getNearbyAmenities } from "./data-sources/openstreetmap";
import { getFloodRisk } from "./data-sources/flood";
import { getPropertyPrices } from "./data-sources/land-registry";
import { getOfstedSchools } from "./data-sources/ofsted";
import { logger } from "../tracking/structured-logger";
import { getConfig } from "../../infrastructure/config";
import { buildAreaProfile, type AreaSources } from "./area-profile";
import {
  readDeprivationFromStore,
  readDeprivationNormalization,
  readPropertyFromStore,
  readPropertyNormalization,
  readCrimeFromStore,
  readCrimeNormalization,
} from "./store-reader";
import type { AreaProfile } from "@onegoodarea/contracts";

export { buildAreaProfile, type AreaSources } from "./area-profile";
export { queryAreas, parseAreasQuery, type AreaResult, type AreasQuery } from "./query";

/** Geocoded area + its assembled source structs + which sources came from the
    store. The shared fetch behind getAreaProfile (signals) AND scoreArea
    (scoring), so the data-gathering + serve-from-store logic lives in one place. */
export interface FetchedArea {
  geo: GeocodedArea;
  sources: AreaSources;
  depFromStore: boolean;
  propertyFromStore: boolean;
  crimeFromStore: boolean;
}

/** Time a promise; resolves to [result, duration_ms]. Never rejects: a
    rejected source becomes [null, ms] so the timing log still records
    its slot and the overall fetch can decide how to handle nulls.
    AR-394 latency-diagnostic helper. */
async function timed<T>(label: string, p: Promise<T>): Promise<[T | null, number]> {
  const t0 = performance.now();
  try {
    const v = await p;
    return [v, Math.round(performance.now() - t0)];
  } catch (err) {
    logger.warn(`[signals/fetch] ${label} threw after ${Math.round(performance.now() - t0)}ms`, { error: err });
    return [null as T | null, Math.round(performance.now() - t0)];
  }
}

/** Geocode an area and gather its six source structs. Deprivation, property and
    crime are read from the persisted store when OGA_SIGNALS_STORE_READ is on and
    present (skipping the live fetch); everything else is live. Returns null if
    the area cannot be geocoded. See ADR 0004 (deprivation), 0012 (property),
    0016 (crime).

    AR-394: per-source timings are captured and emitted as a single
    structured log line. Used to identify the latency tail (E2E #6).
    Zero behavioural change vs the prior fan-out. */
export async function fetchAreaSources(area: string): Promise<FetchedArea | null> {
  const t0 = performance.now();
  const [geo, geoMs] = await timed("geocode", geocodeArea(area));
  if (!geo) return null;

  const storeRead = getConfig().signalsStoreRead;
  const storeT0 = performance.now();
  const [storedDeprivation, storedProperty, storedCrime] = await Promise.all([
    storeRead ? readDeprivationFromStore(geo.lsoa) : Promise.resolve(null),
    storeRead ? readPropertyFromStore(geo.lsoa) : Promise.resolve(null),
    storeRead ? readCrimeFromStore(geo.lsoa) : Promise.resolve(null),
  ]);
  const storeMs = Math.round(performance.now() - storeT0);

  const [
    [liveCrime, crimeMs],
    [liveDeprivation, depMs],
    [amenities, amenitiesMs],
    [flood, floodMs],
    [liveProperty, propertyMs],
    [ofsted, ofstedMs],
  ] = await Promise.all([
    storedCrime ? Promise.resolve([null, 0] as [null, number]) : timed("crime", getCrimeData(geo.latitude, geo.longitude)),
    storedDeprivation ? Promise.resolve([null, 0] as [null, number]) : timed("deprivation", getDeprivationData(geo.lsoa, geo.lsoa11)),
    timed("amenities", getNearbyAmenities(geo.latitude, geo.longitude)),
    timed("flood", getFloodRisk(geo.latitude, geo.longitude)),
    storedProperty ? Promise.resolve([null, 0] as [null, number]) : timed("property", getPropertyPrices(geo.query)),
    timed("ofsted", getOfstedSchools(geo.latitude, geo.longitude, geo.country)),
  ]);

  const totalMs = Math.round(performance.now() - t0);
  /* One structured line per request. The fan-out time is roughly
     max(crime, dep, amenities, flood, property, ofsted) plus the
     sequential geocode + store prefetch. The slowest source dictates
     wall time, so the "max" column matters more than the sum. */
  const fanOut = { crime: crimeMs, deprivation: depMs, amenities: amenitiesMs, flood: floodMs, property: propertyMs, ofsted: ofstedMs };
  const maxFanOut = Math.max(...Object.values(fanOut));
  logger.info(`[signals/fetch] "${area}" total=${totalMs}ms geocode=${geoMs}ms store=${storeMs}ms fanout_max=${maxFanOut}ms`, {
    total_ms: totalMs,
    geocode_ms: geoMs,
    store_prefetch_ms: storeMs,
    fan_out_ms: fanOut,
    fan_out_max_ms: maxFanOut,
    crime_from_store: !!storedCrime,
    dep_from_store: !!storedDeprivation,
    property_from_store: !!storedProperty,
  });

  return {
    geo,
    sources: {
      crime: storedCrime ?? liveCrime,
      deprivation: storedDeprivation ?? liveDeprivation,
      amenities,
      flood,
      property: storedProperty ?? liveProperty,
      ofsted,
    },
    depFromStore: !!storedDeprivation,
    propertyFromStore: !!storedProperty,
    crimeFromStore: !!storedCrime,
  };
}

/** Resolve an area and return its full signal profile, or null if the query
    could not be geocoded (the endpoint maps null to 404).

    `fetch_mode` reports provenance honestly: "hybrid" when deprivation is
    store-backed and the rest are live, "live" otherwise. Store-backed signals
    are enriched with their normalized_value + national percentile + regional
    percentile (AR-408). See ADR 0004. */
export async function getAreaProfile(area: string): Promise<AreaProfile | null> {
  const fetched = await fetchAreaSources(area);
  if (!fetched) return null;
  const { geo, sources, depFromStore, propertyFromStore, crimeFromStore } = fetched;

  type NormMap = Record<string, { normalized_value: number | null; percentile: number | null; regional_percentile: number | null }>;
  const emptyNorm: NormMap = {};
  const [depNormalization, propertyNormalization, crimeNormalization] = await Promise.all([
    depFromStore ? readDeprivationNormalization(geo.lsoa) : Promise.resolve(emptyNorm),
    propertyFromStore ? readPropertyNormalization(geo.lsoa) : Promise.resolve(emptyNorm),
    crimeFromStore ? readCrimeNormalization(geo.lsoa) : Promise.resolve(emptyNorm),
  ]);
  const fetchMode = depFromStore || propertyFromStore || crimeFromStore ? "hybrid" : "live";

  logger.info(`[signals] /v1/area "${area}": mode=${fetchMode}, dep=${depFromStore ? "store" : "live"}, property=${propertyFromStore ? "store" : "live"}, crime=${crimeFromStore ? "store" : "live"}, imd=${sources.deprivation?.imd_decile ?? "n/a"}, crimes=${sources.crime?.total_crimes ?? "n/a"}, amenities=${sources.amenities?.total ?? "n/a"}`);

  const profile = buildAreaProfile(geo, sources, fetchMode);

  // Enrich store-backed signals with their stored normalization (additive).
  const normalization = { ...depNormalization, ...propertyNormalization, ...crimeNormalization };
  if (depFromStore || propertyFromStore || crimeFromStore) {
    for (const s of profile.signals) {
      const n = normalization[s.key];
      if (n) {
        s.normalized_value = n.normalized_value;
        s.percentile = n.percentile;
        s.regional_percentile = n.regional_percentile;
      }
    }
  }

  return profile;
}
