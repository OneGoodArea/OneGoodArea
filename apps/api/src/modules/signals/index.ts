/* modules/signals — public entry.

   getAreaProfile is the I/O orchestrator behind GET /v1/area: geocode the query,
   fetch the source structs in parallel (the SAME fetchers the report vertical
   uses), and assemble them into the Signal catalog. Crucially it does NOT score
   and does NOT call the AI — that is the inversion. The report path keeps using
   these fetchers too; signals just exposes their output as the primitive.

   v1 is live-fetch per request (meta.fetch_mode = "live"). When the persisted
   signal store lands (MASTER §3, Phase 1) this function reads the store instead
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
import { readDeprivationFromStore, readDeprivationNormalization } from "./store-reader";
import type { AreaProfile } from "@onegoodarea/contracts";

export { buildAreaProfile, type AreaSources } from "./area-profile";
export { queryAreas, parseAreasQuery, type AreaResult, type AreasQuery } from "./query";

/** Geocoded area + its assembled source structs + whether deprivation came from
    the store. The shared fetch behind getAreaProfile (signals) AND scoreArea
    (scoring), so the data-gathering + serve-from-store logic lives in one place. */
export interface FetchedArea {
  geo: GeocodedArea;
  sources: AreaSources;
  depFromStore: boolean;
}

/** Geocode an area and gather its six source structs. Deprivation is read from
    the persisted store when OGA_SIGNALS_STORE_READ is on and present (skipping
    the live fetch); everything else is live. Returns null if the area cannot be
    geocoded. See ADR 0004. */
export async function fetchAreaSources(area: string): Promise<FetchedArea | null> {
  const geo = await geocodeArea(area);
  if (!geo) return null;

  const storedDeprivation = getConfig().signalsStoreRead
    ? await readDeprivationFromStore(geo.lsoa)
    : null;

  const [crime, liveDeprivation, amenities, flood, property, ofsted] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    storedDeprivation ? Promise.resolve(null) : getDeprivationData(geo.lsoa, geo.lsoa11),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
    getPropertyPrices(geo.query),
    getOfstedSchools(geo.latitude, geo.longitude, geo.country),
  ]);

  return {
    geo,
    sources: { crime, deprivation: storedDeprivation ?? liveDeprivation, amenities, flood, property, ofsted },
    depFromStore: !!storedDeprivation,
  };
}

/** Resolve an area and return its full signal profile, or null if the query
    could not be geocoded (the endpoint maps null to 404).

    `fetch_mode` reports provenance honestly: "hybrid" when deprivation is
    store-backed and the rest are live, "live" otherwise. Store-backed signals
    are enriched with their normalized_value + percentile. See ADR 0004. */
export async function getAreaProfile(area: string): Promise<AreaProfile | null> {
  const fetched = await fetchAreaSources(area);
  if (!fetched) return null;
  const { geo, sources, depFromStore } = fetched;

  const depNormalization = depFromStore ? await readDeprivationNormalization(geo.lsoa) : {};
  const fetchMode = depFromStore ? "hybrid" : "live";

  logger.info(`[signals] /v1/area "${area}": mode=${fetchMode}, dep=${depFromStore ? "store" : "live"}, imd=${sources.deprivation?.imd_decile ?? "n/a"}, crime=${sources.crime?.total_crimes ?? "n/a"}, amenities=${sources.amenities?.total ?? "n/a"}`);

  const profile = buildAreaProfile(geo, sources, fetchMode);

  // Enrich store-backed signals with their stored normalization (additive).
  if (depFromStore) {
    for (const s of profile.signals) {
      const n = depNormalization[s.key];
      if (n) {
        s.normalized_value = n.normalized_value;
        s.percentile = n.percentile;
      }
    }
  }

  return profile;
}
