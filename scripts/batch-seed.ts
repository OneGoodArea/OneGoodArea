/**
 * Batch seed area data for SEO pages.
 * Usage: npx tsx scripts/batch-seed.ts
 *
 * Runs the same live API calls + scoring engine as seed-area.ts,
 * but processes multiple areas sequentially and writes output to
 * scripts/batch-output.ts — ready to paste into the AREAS object.
 *
 * Each area takes ~15-30s (Overpass API is the bottleneck).
 * 20 areas ≈ 8-10 minutes.
 */

import { geocodeArea } from "../src/lib/data-sources/postcodes";
import { getCrimeData } from "../src/lib/data-sources/police";
import { getDeprivationData } from "../src/lib/data-sources/deprivation";
import { getNearbyAmenities } from "../src/lib/data-sources/openstreetmap";
import { getFloodRisk } from "../src/lib/data-sources/flood";
import { computeScores } from "../src/lib/scoring-engine";
import type { Intent } from "../src/lib/types";
import { writeFileSync } from "fs";
import { join } from "path";

/* ── Areas to seed ──
 * Format: [postcode, slug, displayName, population, avgPropertyPrice]
 * Only add areas NOT already in the AREAS object.
 *
 * Already seeded (12): london, manchester, cardiff, liverpool,
 * glasgow, belfast, edinburgh, birmingham, leeds, bristol,
 * sheffield, nottingham
 */

const AREAS_TO_SEED: [string, string, string, string, string][] = [
  // South / South East
  ["BN1 1EE", "brighton", "Brighton City Centre", "~230,000 (city)", "£420,000"],
  ["SO14 7DU", "southampton", "Southampton City Centre", "~260,000 (city)", "£230,000"],
  ["PO1 2AH", "portsmouth", "Portsmouth City Centre", "~215,000 (city)", "£220,000"],
  ["RG1 1AZ", "reading", "Reading Town Centre", "~175,000 (city)", "£340,000"],

  // South West
  ["BA1 1SU", "bath", "Bath City Centre", "~100,000 (city)", "£420,000"],
  ["EX1 1EE", "exeter", "Exeter City Centre", "~130,000 (city)", "£300,000"],
  ["PL1 1EA", "plymouth", "Plymouth City Centre", "~265,000 (city)", "£210,000"],

  // East / East Midlands
  ["CB2 1TN", "cambridge", "Cambridge City Centre", "~145,000 (city)", "£500,000"],
  ["NR1 3QY", "norwich", "Norwich City Centre", "~145,000 (city)", "£250,000"],
  ["LE1 5AR", "leicester", "Leicester City Centre", "~370,000 (city)", "£210,000"],
  ["DE1 1QA", "derby", "Derby City Centre", "~260,000 (city)", "£180,000"],

  // West Midlands
  ["CV1 1DA", "coventry", "Coventry City Centre", "~370,000 (city)", "£200,000"],
  ["ST1 1LZ", "stoke", "Stoke-on-Trent City Centre", "~260,000 (city)", "£140,000"],
  ["WV1 1HB", "wolverhampton", "Wolverhampton City Centre", "~265,000 (city)", "£170,000"],

  // North West
  ["PR1 2HE", "preston", "Preston City Centre", "~145,000 (city)", "£155,000"],

  // North East
  ["NE1 7RU", "newcastle", "Newcastle City Centre", "~300,000 (city)", "£185,000"],
  ["SR1 1RE", "sunderland", "Sunderland City Centre", "~175,000 (city)", "£120,000"],

  // Yorkshire
  ["HU1 1NQ", "hull", "Hull City Centre", "~260,000 (city)", "£130,000"],
  ["YO1 9TL", "york", "York City Centre", "~210,000 (city)", "£330,000"],

  // Wales
  ["SA1 3QW", "swansea", "Swansea City Centre", "~245,000 (city)", "£180,000"],

  // Scotland
  ["AB10 1AQ", "aberdeen", "Aberdeen City Centre", "~230,000 (city)", "£170,000"],
  ["DD1 1DB", "dundee", "Dundee City Centre", "~150,000 (city)", "£145,000"],
];

const INTENTS: Intent[] = ["moving", "business", "investing", "research"];

async function seedOne(
  postcode: string,
  slug: string,
  displayName: string,
  population: string,
  avgPropertyPrice: string,
): Promise<{ slug: string; entry: Record<string, unknown> } | null> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${slug}] Seeding ${displayName} (${postcode})...`);
  console.log("=".repeat(60));

  // 1. Geocode
  const geo = await geocodeArea(postcode);
  if (!geo) {
    console.error(`[${slug}] FAILED: Could not geocode. Skipping.`);
    return null;
  }

  console.log(`[${slug}] Geocoded: ${geo.admin_district}, ${geo.region} (${geo.area_type})`);
  console.log(`[${slug}] LSOA: ${geo.lsoa}${geo.lsoa11 ? ` (2011: ${geo.lsoa11})` : ""}`);

  // 2. Fetch all data sources in parallel
  const [crime, deprivation, amenities, flood] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    getDeprivationData(geo.lsoa, geo.lsoa11),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
  ]);

  console.log(`[${slug}] Crime: ${crime?.total_crimes ?? "N/A"}`);
  console.log(`[${slug}] Deprivation: decile ${deprivation?.imd_decile ?? "N/A"}`);
  console.log(`[${slug}] Amenities: ${amenities?.total ?? "N/A"}`);
  console.log(`[${slug}] Flood zones: ${flood?.flood_areas_nearby ?? "N/A"}`);

  // 3. Compute scores for all 4 intents
  const areaType = geo.area_type ?? "suburban";
  const intentScores = INTENTS.map((intent) => {
    const scores = computeScores(intent, crime, deprivation, amenities, flood, areaType);
    return { intent, overall: scores.overall, dimensions: scores.dimensions };
  });

  // 4. Use "research" as the default display intent
  const research = intentScores.find((i) => i.intent === "research")!;

  console.log(`[${slug}] Research score: ${research.overall}/100`);
  for (const d of research.dimensions) {
    const bar = "█".repeat(Math.round(d.score / 5)) + "░".repeat(20 - Math.round(d.score / 5));
    console.log(`[${slug}]   ${d.label.padEnd(28)} ${bar} ${d.score}`);
  }

  // 5. Build summary from real data
  const summaryParts: string[] = [];
  summaryParts.push(`${displayName} scores ${research.overall}/100 overall.`);

  if (amenities) {
    const stationText = amenities.transport_stations > 0
      ? `${amenities.transport_stations} rail station${amenities.transport_stations !== 1 ? "s" : ""}`
      : null;
    const busText = amenities.bus_stops > 0 ? `${amenities.bus_stops} bus stops` : null;
    const transportBits = [stationText, busText].filter(Boolean).join(" and ");
    if (transportBits) summaryParts.push(`Transport links include ${transportBits}.`);
    summaryParts.push(`${amenities.total} amenities nearby including ${amenities.schools} schools and ${amenities.restaurants_cafes + amenities.pubs_bars} food/drink venues.`);
  }

  if (crime) {
    const monthlyRate = Math.round(crime.total_crimes / Math.max(crime.months_covered, 1));
    const violentPatterns = ["violen", "robbery"];
    const categoryKeys = Object.keys(crime.by_category);
    const violentCount = violentPatterns.reduce((sum, pattern) => {
      const match = categoryKeys.find(k => k.toLowerCase().includes(pattern));
      return sum + (match ? crime.by_category[match] : 0);
    }, 0);
    const violentPct = Math.round((violentCount / crime.total_crimes) * 100);
    summaryParts.push(`Crime: ${crime.total_crimes.toLocaleString()} incidents over ${crime.months_covered} months (${monthlyRate}/month), with violent crime at ${violentPct}%.`);
  }

  if (deprivation) {
    const ctx = deprivation.lsoa_code.startsWith("W") ? "WIMD 2019"
      : deprivation.lsoa_code.startsWith("S") ? "SIMD 2020" : "IMD 2019";
    const level = deprivation.imd_decile <= 3 ? "high" : deprivation.imd_decile <= 7 ? "moderate" : "low";
    summaryParts.push(`${ctx} decile ${deprivation.imd_decile} indicates ${level} deprivation.`);
  }

  // Best intent
  const best = intentScores.reduce((a, b) => a.overall > b.overall ? a : b);
  if (best.intent !== "research") {
    summaryParts.push(`${best.intent.charAt(0).toUpperCase() + best.intent.slice(1)} intent scores highest at ${best.overall}/100.`);
  }

  const summary = summaryParts.join(" ");

  // 6. Build output entry
  const entry = {
    name: displayName,
    region: geo.region || geo.admin_district,
    postcode: postcode.toUpperCase().replace(/^(.+?)(\d\w{2})$/, "$1 $2"),
    areaType,
    overallScore: research.overall,
    population,
    avgPropertyPrice,
    summary,
    dimensions: research.dimensions.map((d) => ({
      label: d.label,
      score: d.score,
      weight: d.weight,
      summary: d.reasoning,
    })),
    lockedSections: research.dimensions.map((d) => `${d.label} Analysis`),
    lockedRecommendations: 4,
    intents: intentScores.map((i) => ({
      label: i.intent.charAt(0).toUpperCase() + i.intent.slice(1),
      score: i.overall,
      slug: i.intent,
    })),
    dataSources: [
      crime ? "Police.uk" : null,
      deprivation ? "ONS / IMD" : null,
      amenities ? "OpenStreetMap" : null,
      flood ? "Environment Agency" : null,
      "Postcodes.io",
    ].filter(Boolean),
  };

  return { slug, entry };
}

async function main() {
  console.log(`\n[batch] Starting batch seed for ${AREAS_TO_SEED.length} areas...\n`);

  const results: { slug: string; entry: Record<string, unknown> }[] = [];
  const failures: string[] = [];

  for (const [postcode, slug, name, population, price] of AREAS_TO_SEED) {
    try {
      const result = await seedOne(postcode, slug, name, population, price);
      if (result) {
        results.push(result);
      } else {
        failures.push(slug);
      }
    } catch (err) {
      console.error(`[${slug}] ERROR: ${err}`);
      failures.push(slug);
    }

    // Small delay between areas to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Write output file
  const outputPath = join(__dirname, "batch-output.json");
  const outputObj: Record<string, unknown> = {};
  for (const r of results) {
    outputObj[r.slug] = r.entry;
  }
  writeFileSync(outputPath, JSON.stringify(outputObj, null, 2));

  // Print summary
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("BATCH SEED COMPLETE");
  console.log("=".repeat(60));
  console.log(`\n  Succeeded: ${results.length}/${AREAS_TO_SEED.length}`);
  if (failures.length > 0) {
    console.log(`  Failed: ${failures.join(", ")}`);
  }
  console.log(`\n  Output written to: ${outputPath}`);
  console.log(`\n  Score summary:`);
  for (const r of results) {
    const entry = r.entry as { name: string; overallScore: number; areaType: string; dataSources: string[] };
    const sources = (entry.dataSources as string[]).length;
    console.log(`    ${(r.slug).padEnd(16)} ${String(entry.overallScore).padStart(3)}/100  (${entry.areaType}, ${sources} sources)`);
  }

  console.log(`\n  Next step: Run 'npx tsx scripts/inject-areas.ts' to merge into area pages.\n`);
}

main().catch((err) => {
  console.error("[batch] Fatal error:", err);
  process.exit(1);
});
