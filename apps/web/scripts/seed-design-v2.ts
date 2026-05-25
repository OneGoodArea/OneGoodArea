/**
 * Seed real scored reports for the design-v2 hero Try chips.
 *
 *   Manchester    (M1 1AE)
 *   Clapham       (SW4 0LG) — also covers the "SW4 0LG" chip
 *   Edinburgh     (EH1 1BB)
 *   Bristol       (BS1 4DJ) — also covers the "BS1 4DJ" chip
 *
 * For each location, runs the full pipeline (geocode + crime + deprivation +
 * amenities + flood) and computes scores for all 4 intents separately, so the
 * design-v2 hero can render real per-intent dimensions + weights + summary.
 *
 * Output: src/app/design-v2/sample-reports.json
 * Runtime: ~8–12 minutes (Overpass API throttles to ~1 req / 2s per origin).
 */

import { geocodeArea } from "../src/lib/data-sources/postcodes";
import { getCrimeData } from "../src/lib/data-sources/police";
import { getDeprivationData } from "../src/lib/data-sources/deprivation";
import { getFloodRisk } from "../src/lib/data-sources/flood";
import { computeScores } from "../src/lib/scoring-engine";
import type { Intent } from "../src/lib/types";
import type { AmenitiesData } from "../src/lib/data-sources/openstreetmap";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/* ─── Resilient Overpass fetcher — tries mirrors, 90s per attempt ─── */
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

interface OverpassElement {
  type: string;
  tags?: Record<string, string>;
}

async function getNearbyAmenitiesResilient(lat: number, lng: number): Promise<AmenitiesData | null> {
  const query = `[out:json][timeout:60];
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

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      console.log(`    [overpass] trying ${new URL(endpoint).host}…`);
      const res = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "OneGoodArea-seed-script/1.0 (ptengelmann@gmail.com)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        console.log(`    [overpass] ${res.status} from ${new URL(endpoint).host}`);
        continue;
      }
      const data = await res.json();
      if (!data.elements) continue;

      let schools = 0, restaurants_cafes = 0, pubs_bars = 0, healthcare = 0, shops = 0;
      let parks_leisure = 0, transport_stations = 0, bus_stops = 0;
      const highlights: string[] = [];

      for (const el of data.elements as OverpassElement[]) {
        const t = el.tags || {};
        if (t.amenity && ["school", "kindergarten", "college", "university"].includes(t.amenity)) {
          schools++;
          if (t.name && highlights.length < 10) highlights.push(`${t.name} (${t.amenity})`);
        } else if (t.amenity && ["restaurant", "cafe", "fast_food"].includes(t.amenity)) {
          restaurants_cafes++;
        } else if (t.amenity && ["pub", "bar"].includes(t.amenity)) {
          pubs_bars++;
        } else if (t.amenity && ["pharmacy", "doctors", "hospital", "dentist", "clinic"].includes(t.amenity)) {
          healthcare++;
        } else if (t.shop && ["supermarket", "convenience"].includes(t.shop)) {
          shops++;
        } else if (t.leisure && ["park", "playground", "sports_centre", "swimming_pool", "fitness_centre", "garden"].includes(t.leisure)) {
          parks_leisure++;
        } else if (t.railway === "station") {
          transport_stations++;
          if (t.name && highlights.length < 10) highlights.push(`${t.name} station`);
        } else if (t.highway === "bus_stop") {
          bus_stops++;
        }
      }

      const total = schools + restaurants_cafes + pubs_bars + healthcare + shops + parks_leisure + transport_stations + bus_stops;
      return { schools, restaurants_cafes, pubs_bars, healthcare, shops, parks_leisure, transport_stations, bus_stops, total, highlights };
    } catch (err) {
      console.log(`    [overpass] ${new URL(endpoint).host} threw: ${err instanceof Error ? err.message : err}`);
      continue;
    }
  }
  console.log(`    [overpass] all mirrors failed`);
  return null;
}

const LOCATIONS: Array<{ key: string; postcode: string; display: string }> = [
  { key: "manchester", postcode: "M1 1AE",  display: "Manchester" },
  { key: "clapham",    postcode: "SW4 0LG", display: "Clapham" },
  { key: "edinburgh",  postcode: "EH1 1BB", display: "Edinburgh" },
  { key: "bristol",    postcode: "BS1 4DJ", display: "Bristol" },
];

const INTENTS: Intent[] = ["moving", "business", "investing", "research"];

function buildSummary(
  display: string,
  overall: number,
  crime: Awaited<ReturnType<typeof getCrimeData>>,
  deprivation: Awaited<ReturnType<typeof getDeprivationData>>,
  amenities: AmenitiesData | null,
): string {
  const parts: string[] = [];
  parts.push(`${display} scores ${overall}/100.`);

  if (amenities) {
    const stations = amenities.transport_stations;
    const food = amenities.restaurants_cafes + amenities.pubs_bars;
    parts.push(
      `${amenities.total} amenities within 1km including ${amenities.schools} schools, ${food} food/drink, ${stations} rail/tube stations.`,
    );
  }

  if (crime) {
    const monthly = Math.round(crime.total_crimes / Math.max(crime.months_covered, 1));
    parts.push(
      `${crime.total_crimes.toLocaleString()} crimes over ${crime.months_covered} months (${monthly}/mo).`,
    );
  }

  if (deprivation) {
    const ctx = deprivation.lsoa_code.startsWith("W") ? "WIMD 2019"
      : deprivation.lsoa_code.startsWith("S") ? "SIMD 2020"
      : "IMD 2025";
    parts.push(`${ctx} decile ${deprivation.imd_decile}.`);
  }

  return parts.join(" ");
}

async function seedOne(key: string, postcode: string, display: string) {
  console.log(`\n[${key}] Scoring ${display} (${postcode})…`);

  const geo = await geocodeArea(postcode);
  if (!geo) {
    console.error(`[${key}] FAILED: geocode returned null`);
    return null;
  }
  console.log(`[${key}] Geocoded: ${geo.admin_district}, ${geo.region} (${geo.area_type}) LSOA ${geo.lsoa}`);

  // Run non-overpass sources in parallel, then amenities sequentially so
  // the long fetch isn't cancelled by a flaky mirror.
  const [crime, deprivation, flood] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    getDeprivationData(geo.lsoa, geo.lsoa11),
    getFloodRisk(geo.latitude, geo.longitude),
  ]);
  const amenities = await getNearbyAmenitiesResilient(geo.latitude, geo.longitude);

  console.log(
    `[${key}] Raw: crime=${crime?.total_crimes ?? "n/a"} imd=${deprivation?.imd_decile ?? "n/a"} amen=${amenities?.total ?? "n/a"} flood=${flood?.flood_areas_nearby ?? "n/a"}`,
  );

  const areaType = geo.area_type ?? "suburban";
  const intents: Record<string, unknown> = {};

  for (const intent of INTENTS) {
    const scores = computeScores(intent, crime, deprivation, amenities, flood, areaType);
    intents[intent] = {
      overall: scores.overall,
      dimensions: scores.dimensions.map((d) => ({
        label: d.label,
        score: d.score,
        weight: d.weight,
        reasoning: d.reasoning,
      })),
      summary: buildSummary(display, scores.overall, crime, deprivation, amenities),
    };
    console.log(`[${key}]   ${intent.padEnd(10)} ${scores.overall}/100`);
  }

  return {
    key,
    display,
    postcode: postcode.toUpperCase(),
    region: geo.region || geo.admin_district,
    areaType,
    lsoa: geo.lsoa,
    intents,
  };
}

async function main() {
  console.log(`\n[design-v2 seed] ${LOCATIONS.length} locations × ${INTENTS.length} intents = ${LOCATIONS.length * INTENTS.length} scored reports\n`);

  const out: Record<string, unknown> = {};
  const failures: string[] = [];

  for (let i = 0; i < LOCATIONS.length; i++) {
    const loc = LOCATIONS[i];
    try {
      const result = await seedOne(loc.key, loc.postcode, loc.display);
      if (result) out[loc.key] = result;
      else failures.push(loc.key);
    } catch (err) {
      console.error(`[${loc.key}] ERROR:`, err);
      failures.push(loc.key);
    }
    if (i < LOCATIONS.length - 1) {
      console.log(`[seed] waiting 75s before next location to avoid overpass rate limit…`);
      await new Promise((r) => setTimeout(r, 75_000));
    }
  }

  const outPath = join(__dirname, "..", "src", "app", "design-v2", "sample-reports.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DONE. ${Object.keys(out).length}/${LOCATIONS.length} seeded.`);
  if (failures.length) console.log(`Failed: ${failures.join(", ")}`);
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error("[design-v2 seed] Fatal:", err);
  process.exit(1);
});
