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

import { geocodeArea } from "./data-sources/postcodes";
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

/** Resolve an area and return its full signal profile, or null if the query
    could not be geocoded (the endpoint maps null to 404).

    Serve-from-store (flagged by OGA_SIGNALS_STORE_READ): deprivation is read
    from the persisted store when present (England matches today; Wales/Scotland
    fall back to live until the ONS spine normalizes boundaries). All other
    sources are still live. `fetch_mode` reports the provenance honestly:
    "hybrid" while some sources are store-backed and others live, "live"
    otherwise. See ADR 0004. */
export async function getAreaProfile(area: string): Promise<AreaProfile | null> {
  const geo = await geocodeArea(area);
  if (!geo) return null;

  // Try the store for deprivation first (skips the live deprivation fetch on a
  // hit). When store-backed, also pull its normalization (normalized_value +
  // national percentile) to enrich the served signals.
  const [storedDeprivation, depNormalization] = getConfig().signalsStoreRead
    ? await Promise.all([readDeprivationFromStore(geo.lsoa), readDeprivationNormalization(geo.lsoa)])
    : [null, {}];

  const [crime, liveDeprivation, amenities, flood, property, ofsted] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    storedDeprivation ? Promise.resolve(null) : getDeprivationData(geo.lsoa, geo.lsoa11),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
    getPropertyPrices(geo.query),
    getOfstedSchools(geo.latitude, geo.longitude, geo.country),
  ]);

  const deprivation = storedDeprivation ?? liveDeprivation;
  const sources: AreaSources = { crime, deprivation, amenities, flood, property, ofsted };
  // Only deprivation can be store-backed today, so any store hit makes the
  // profile a live/store mix → "hybrid". Becomes "store" once all contributing
  // sources are served from the store.
  const fetchMode = storedDeprivation ? "hybrid" : "live";

  logger.info(
    `[signals] /v1/area "${area}": mode=${fetchMode}, dep=${storedDeprivation ? "store" : "live"}, crime=${crime?.total_crimes ?? "n/a"}, imd=${deprivation?.imd_decile ?? "n/a"}, amenities=${amenities?.total ?? "n/a"}, flood=${flood?.flood_areas_nearby ?? "n/a"}, property=${property ? `${property.transaction_count} txns` : "n/a"}, ofsted=${ofsted?.total_rated ?? "n/a"}`,
  );

  const profile = buildAreaProfile(geo, sources, fetchMode);

  // Enrich store-backed signals with their stored normalization (additive: live
  // signals keep no normalized_value/percentile). Transitional — when every
  // source is store-served this becomes a store-native read of Signal[].
  if (storedDeprivation && depNormalization) {
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
