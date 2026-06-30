import type { AmenitiesData } from "../inputs";
import { logger } from "../../tracking/structured-logger";

/* Migrated VERBATIM from legacy src/lib/data-sources/openstreetmap.ts. Changes:
   AmenitiesData imported from ../inputs (canonical) instead of re-declared, and
   logger repointed to modules/tracking. fetchOverpass already returns unknown,
   so no res.json() cast is needed. Runtime unchanged. */

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/* AR-135 (v2.0.2): Overpass reliability hardening.
   Previously this query had `timeout:15` and a 20s AbortSignal. For UK
   city centres the bundled 8-subquery response can exceed both, central
   Manchester, Edinburgh, York, Birmingham, Cardiff all hit thousands of
   nodes within the 1km-2km radii. When Overpass times out we returned null
   silently, and scoreTransport correctly degraded to NONE confidence on
   exactly the postcodes where transport coverage is densest.

   Fix: bump Overpass-side timeout to 25s, bump our AbortSignal to 35s,
   add visibility on errors via logger.warn (was a silent catch), and
   retry once after 500ms on the first failure before giving up.

   AR-397: same UK city-centre coords were still flapping in prod
   intermittently (E2E 2026-07-01 caught amenities.confidence=0 on M1 1AE).
   A direct curl with the same query returns 920KB of real data in ~5s,
   so the upstream is fine; our IP gets soft-rate-limited or Overpass
   returns 200 with a remark field on heavy queries. Layered fix:
     1. 5-min TTL cache keyed by rounded (lat, lng), same shape as
        AR-396 flood. Cold hit per LSOA per instance; warm thereafter.
     2. Detect Overpass remark field (server-side timeout that comes
        back HTTP 200 with empty elements). Log it as a warning so
        future failures are diagnosable, and short-circuit the parser
        so we never silently emit "0 amenities" on a real city centre.
*/

const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;
const OVERPASS_FETCH_TIMEOUT_MS = 35000;
const OVERPASS_RETRY_DELAY_MS = 500;

const OVERPASS_CACHE_TTL_MS = 5 * 60 * 1000;
const OVERPASS_CACHE_MAX = 1000;
const OVERPASS_COORD_PRECISION = 1000; /* 3 decimal places, ~110m */

interface CacheEntry {
  value: AmenitiesData | null;
  expires_at: number;
}

const cache = new Map<string, CacheEntry>();

export function clearOverpassCache(): void {
  cache.clear();
}

function cacheKey(lat: number, lng: number): string {
  const rLat = Math.round(lat * OVERPASS_COORD_PRECISION) / OVERPASS_COORD_PRECISION;
  const rLng = Math.round(lng * OVERPASS_COORD_PRECISION) / OVERPASS_COORD_PRECISION;
  return `${rLat},${rLng}`;
}

function cacheGet(key: string, now: number): AmenitiesData | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires_at <= now) {
    cache.delete(key);
    return undefined;
  }
  /* LRU touch */
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: AmenitiesData | null, now: number): void {
  if (cache.size >= OVERPASS_CACHE_MAX && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires_at: now + OVERPASS_CACHE_TTL_MS });
}

async function fetchOverpass(lat: number, lng: number): Promise<unknown | null> {
  const query = `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
(
  nwr["amenity"~"^(school|kindergarten|college|university)$"](around:1500,${lat},${lng});
  nwr["amenity"~"^(restaurant|cafe|fast_food)$"](around:1000,${lat},${lng});
  nwr["amenity"~"^(pub|bar)$"](around:1000,${lat},${lng});
  nwr["amenity"~"^(pharmacy|doctors|hospital|dentist|clinic)$"](around:1500,${lat},${lng});
  nwr["shop"~"^(supermarket|convenience)$"](around:1000,${lat},${lng});
  nwr["leisure"~"^(park|playground|sports_centre|swimming_pool|fitness_centre|garden)$"](around:1500,${lat},${lng});
  nwr["railway"="station"](around:2000,${lat},${lng});
  nwr["highway"="bus_stop"](around:500,${lat},${lng});
);
out tags center;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(OVERPASS_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}`);
  }
  return res.json();
}

export async function getNearbyAmenities(lat: number, lng: number): Promise<AmenitiesData | null> {
  /* AR-397: cache layer. Cold path pays one Overpass round-trip per
     LSOA per Render instance; warm hits within 5 min are sub-ms. */
  const now = Date.now();
  const key = cacheKey(lat, lng);
  const cached = cacheGet(key, now);
  if (cached !== undefined) return cached;

  let data: unknown;
  try {
    data = await fetchOverpass(lat, lng);
  } catch (firstErr) {
    logger.warn("[overpass] first attempt failed, retrying once", {
      lat,
      lng,
      error: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    // Retry once after a brief pause; handles transient Overpass slowness/load
    await new Promise((resolve) => setTimeout(resolve, OVERPASS_RETRY_DELAY_MS));
    try {
      data = await fetchOverpass(lat, lng);
    } catch (retryErr) {
      logger.warn("[overpass] retry failed, returning null", {
        lat,
        lng,
        error: retryErr instanceof Error ? retryErr.message : String(retryErr),
      });
      /* AR-397: cache null too so a sustained outage doesn't keep
         paying the 35s timeout per request. Refreshes every 5 min. */
      cacheSet(key, null, now);
      return null;
    }
  }

  try {
    if (!data || typeof data !== "object") {
      cacheSet(key, null, now);
      return null;
    }
    const responseData = data as { elements?: unknown; remark?: unknown };

    /* AR-397: when Overpass times out server-side it returns HTTP 200
       with a `remark` field and (usually) empty elements. Log it as a
       warning instead of silently returning null which read as "no OSM
       data here" downstream. Don't cache this either, so the next
       request retries cleanly. */
    if (typeof responseData.remark === "string" && responseData.remark.length > 0) {
      logger.warn("[overpass] response carried a remark (server-side issue)", {
        lat,
        lng,
        remark: responseData.remark,
      });
      return null;
    }

    if (!Array.isArray(responseData.elements)) {
      cacheSet(key, null, now);
      return null;
    }

    let schools = 0;
    let restaurants_cafes = 0;
    let pubs_bars = 0;
    let healthcare = 0;
    let shops = 0;
    let parks_leisure = 0;
    let transport_stations = 0;
    let bus_stops = 0;
    const highlights: string[] = [];

    for (const el of responseData.elements as OverpassElement[]) {
      const tags = el.tags || {};
      const amenity = tags.amenity;
      const shop = tags.shop;
      const leisure = tags.leisure;
      const railway = tags.railway;
      const highway = tags.highway;
      const name = tags.name;

      if (["school", "kindergarten", "college", "university"].includes(amenity)) {
        schools++;
        if (name) highlights.push(name);
      } else if (["restaurant", "cafe", "fast_food"].includes(amenity)) {
        restaurants_cafes++;
      } else if (["pub", "bar"].includes(amenity)) {
        pubs_bars++;
        if (name) highlights.push(name);
      } else if (["pharmacy", "doctors", "hospital", "dentist", "clinic"].includes(amenity)) {
        healthcare++;
        if (name && (amenity === "hospital" || amenity === "doctors")) highlights.push(name);
      }

      if (["supermarket", "convenience"].includes(shop)) {
        shops++;
        if (name && shop === "supermarket") highlights.push(name);
      }

      if (["park", "playground", "sports_centre", "swimming_pool", "fitness_centre", "garden"].includes(leisure)) {
        parks_leisure++;
        if (name && (leisure === "park" || leisure === "garden")) highlights.push(name);
      }

      if (railway === "station") {
        transport_stations++;
        if (name) highlights.push(`${name} station`);
      }

      if (highway === "bus_stop") {
        bus_stops++;
      }
    }

    // Deduplicate and limit highlights
    const uniqueHighlights = [...new Set(highlights)].slice(0, 12);

    const result: AmenitiesData = {
      schools,
      restaurants_cafes,
      pubs_bars,
      healthcare,
      shops,
      parks_leisure,
      transport_stations,
      bus_stops,
      total: schools + restaurants_cafes + pubs_bars + healthcare + shops + parks_leisure + transport_stations + bus_stops,
      highlights: uniqueHighlights,
    };
    /* AR-397: cache the success too. The 5-min TTL means a city
       centre that just succeeded won't get re-asked for 5 minutes,
       isolating us from the flap. */
    cacheSet(key, result, now);
    return result;
  } catch {
    /* Parse error: don't cache so the next request retries with fresh
       data. Different from "EA outage" semantics where retry won't help. */
    return null;
  }
}

export function formatAmenitiesForPrompt(data: AmenitiesData): string {
  const lines = [
    `NEARBY AMENITIES DATA (Source: OpenStreetMap via Overpass API):`,
    `Total amenities found: ${data.total}`,
    ``,
    `By category:`,
    `  - Schools & education (within 1.5km): ${data.schools}`,
    `  - Restaurants & cafes (within 1km): ${data.restaurants_cafes}`,
    `  - Pubs & bars (within 1km): ${data.pubs_bars}`,
    `  - Healthcare (GPs, pharmacies, hospitals, dentists) within 1.5km: ${data.healthcare}`,
    `  - Shops — supermarkets & convenience stores (within 1km): ${data.shops}`,
    `  - Parks & leisure (within 1.5km): ${data.parks_leisure}`,
    `  - Rail/tube stations (within 2km): ${data.transport_stations}`,
    `  - Bus stops (within 500m): ${data.bus_stops}`,
  ];

  if (data.highlights.length > 0) {
    lines.push("");
    lines.push("Notable nearby places:");
    for (const h of data.highlights) {
      lines.push(`  - ${h}`);
    }
  }

  return lines.join("\n");
}
