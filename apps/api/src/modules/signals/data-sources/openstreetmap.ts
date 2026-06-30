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

/* AR-400 narrowed per-query timeouts: each category is a tiny query
   (~200KB max payload), so the generous 25s/35s set for the old bundled
   query is overkill. 15s server-side, 20s client-side AbortSignal. */
const OVERPASS_QUERY_TIMEOUT_SECONDS = 15;
const OVERPASS_FETCH_TIMEOUT_MS = 20000;

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

/* AR-400: 8 small parallel queries, one per amenity category, instead
   of one big bundled 8-subquery. Each query is tiny (~200KB max), well
   under Overpass's server-side memory ceiling for dense city centres.
   Crucially, partial failure becomes OK: if one category times out the
   other 7 still contribute. The old all-or-nothing behaviour was the
   root cause of the 2026-07-01 M1 1AE failure even after AR-397's
   cache + remark detection. */

interface CategorySpec {
  /** Display name used in logs; not part of the wire shape. */
  name: string;
  /** Overpass selector (the bit that goes between `nwr[...](around:..,$lat,$lng)`). */
  selector: string;
  /** Radius in metres for the around: clause. */
  radius: number;
}

const CATEGORIES: CategorySpec[] = [
  { name: "schools",       selector: `["amenity"~"^(school|kindergarten|college|university)$"]`, radius: 1500 },
  { name: "food",          selector: `["amenity"~"^(restaurant|cafe|fast_food)$"]`,              radius: 1000 },
  { name: "pubs_bars",     selector: `["amenity"~"^(pub|bar)$"]`,                                 radius: 1000 },
  { name: "healthcare",    selector: `["amenity"~"^(pharmacy|doctors|hospital|dentist|clinic)$"]`, radius: 1500 },
  { name: "shops",         selector: `["shop"~"^(supermarket|convenience)$"]`,                    radius: 1000 },
  { name: "parks_leisure", selector: `["leisure"~"^(park|playground|sports_centre|swimming_pool|fitness_centre|garden)$"]`, radius: 1500 },
  { name: "stations",      selector: `["railway"="station"]`,                                     radius: 2000 },
  { name: "bus_stops",     selector: `["highway"="bus_stop"]`,                                    radius: 500 },
];

/* AR-402: Overpass 406s anonymous/missing-User-Agent requests as part
   of its abuse mitigation (the fair-use policy explicitly asks for a
   descriptive UA). curl works because it sets one by default; Node's
   fetch does not. Identify ourselves so Overpass routes us through the
   normal queue. */
const OVERPASS_USER_AGENT = "OneGoodArea/1.0 (+https://www.onegoodarea.com)";

/* AR-405: Render's egress IP range was blocked by the main
   overpass-api.de mirror (verified live 2026-07-01: all 8 category
   fetches threw "fetch failed" in 0-400ms, i.e. network-level reject).
   Curl from a dev machine on a different IP returns 200 normally.
   The fix is a fallback chain across multiple Overpass mirrors. Each
   mirror has its own egress allowlist; the chain stops at the first
   that responds. Order is fastest+most-reliable first, with the main
   mirror still tried first for the (large) fraction of deploys whose
   IP isn't blocked. */
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
] as const;

/** Try ONE mirror. Returns elements[] on a clean success, null on any
    failure mode (HTTP error / fetch threw / remark response). Never
    throws. The category fetcher walks all mirrors via this helper. */
async function tryMirror(
  url: string,
  spec: CategorySpec,
  query: string,
  lat: number,
  lng: number,
): Promise<OverpassElement[] | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      signal: AbortSignal.timeout(OVERPASS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.warn("[overpass] mirror HTTP error", { mirror: url, category: spec.name, status: res.status });
      return null;
    }
    const data = (await res.json()) as { elements?: unknown; remark?: unknown };
    if (typeof data.remark === "string" && data.remark.length > 0) {
      logger.warn("[overpass] mirror got remark", { mirror: url, category: spec.name, lat, lng, remark: data.remark });
      return null;
    }
    if (!Array.isArray(data.elements)) return null;
    return data.elements as OverpassElement[];
  } catch (err) {
    logger.warn("[overpass] mirror fetch threw", {
      mirror: url,
      category: spec.name,
      lat,
      lng,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Fetch ONE category by walking the mirror chain (AR-405). Returns the
    first mirror's elements[] on success, or null if EVERY mirror failed
    for this category. Never throws. */
async function fetchCategory(spec: CategorySpec, lat: number, lng: number): Promise<OverpassElement[] | null> {
  const query = `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];nwr${spec.selector}(around:${spec.radius},${lat},${lng});out tags center;`;
  for (const mirror of OVERPASS_MIRRORS) {
    const result = await tryMirror(mirror, spec, query, lat, lng);
    if (result !== null) {
      /* Log only when a non-primary mirror succeeded; primary success
         is the happy path and would be noisy. */
      if (mirror !== OVERPASS_MIRRORS[0]) {
        logger.info("[overpass] category served by fallback mirror", { mirror, category: spec.name });
      }
      return result;
    }
  }
  return null;
}

export async function getNearbyAmenities(lat: number, lng: number): Promise<AmenitiesData | null> {
  /* AR-397: cache layer. Cold path pays one Overpass round-trip per
     LSOA per Render instance; warm hits within 5 min are sub-ms. */
  const now = Date.now();
  const key = cacheKey(lat, lng);
  const cached = cacheGet(key, now);
  if (cached !== undefined) return cached;

  /* AR-400: 8 parallel queries. Each is small and independent.
     Promise.all is fine even though we want partial failure tolerance:
     fetchCategory never throws (returns null on any failure mode),
     so all 8 promises always resolve. */
  const categoryResults = await Promise.all(CATEGORIES.map((spec) => fetchCategory(spec, lat, lng)));

  /* Detect total outage: if EVERY category failed, treat as if Overpass
     is unreachable. Cache null so we don't busy-loop the 8x retry
     until the TTL expires. */
  const successCount = categoryResults.filter((r) => r !== null).length;
  if (successCount === 0) {
    logger.warn("[overpass] ALL 8 categories failed for this area", { lat, lng });
    cacheSet(key, null, now);
    return null;
  }

  try {
    /* Aggregate elements from successful categories. The original tag
       inspector below treats each element independently, so order
       doesn't matter and we don't need to know which category an
       element came from (an "amenity":"restaurant" element bucketed
       as restaurants_cafes regardless of which query returned it). */
    const elements: OverpassElement[] = categoryResults.flatMap((r) => r ?? []);

    let schools = 0;
    let restaurants_cafes = 0;
    let pubs_bars = 0;
    let healthcare = 0;
    let shops = 0;
    let parks_leisure = 0;
    let transport_stations = 0;
    let bus_stops = 0;
    const highlights: string[] = [];

    // Bind `responseData` shape so the original loop below keeps compiling.
    const responseData = { elements } as { elements: OverpassElement[] };

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
