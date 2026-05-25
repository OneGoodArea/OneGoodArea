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

   Temporary cross-module import (see area-profile.ts): the fetchers live under
   modules/reports/data-sources until the taxonomy promotion moves them here. */

import { geocodeArea } from "../reports/data-sources/postcodes";
import { getCrimeData } from "../reports/data-sources/police";
import { getDeprivationData } from "../reports/data-sources/deprivation";
import { getNearbyAmenities } from "../reports/data-sources/openstreetmap";
import { getFloodRisk } from "../reports/data-sources/flood";
import { getPropertyPrices } from "../reports/data-sources/land-registry";
import { getOfstedSchools } from "../reports/data-sources/ofsted";
import { logger } from "../tracking/structured-logger";
import { buildAreaProfile, type AreaSources } from "./area-profile";
import type { AreaProfile } from "@onegoodarea/contracts";

export { buildAreaProfile, type AreaSources } from "./area-profile";

/** Resolve an area and return its full signal profile, or null if the query
    could not be geocoded (the endpoint maps null to 404). */
export async function getAreaProfile(area: string): Promise<AreaProfile | null> {
  const geo = await geocodeArea(area);
  if (!geo) return null;

  const [crime, deprivation, amenities, flood, property, ofsted] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    getDeprivationData(geo.lsoa, geo.lsoa11),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
    getPropertyPrices(geo.query),
    getOfstedSchools(geo.latitude, geo.longitude, geo.country),
  ]);

  const sources: AreaSources = { crime, deprivation, amenities, flood, property, ofsted };

  logger.info(
    `[signals] /v1/area "${area}": geo=${!!geo}, crime=${crime?.total_crimes ?? "n/a"}, imd=${deprivation?.imd_decile ?? "n/a"}, amenities=${amenities?.total ?? "n/a"}, flood=${flood?.flood_areas_nearby ?? "n/a"}, property=${property ? `${property.transaction_count} txns` : "n/a"}, ofsted=${ofsted?.total_rated ?? "n/a"}`,
  );

  return buildAreaProfile(geo, sources);
}
