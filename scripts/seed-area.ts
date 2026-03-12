/**
 * Seed area data for SEO pages.
 * Usage: npx tsx scripts/seed-area.ts WC2N5DU london "Central London"
 *
 * Fetches real data from all 5 sources, runs the scoring engine for all 4 intents,
 * and outputs JSON ready to paste into the AREAS object.
 */

import { geocodeArea } from "../src/lib/data-sources/postcodes";
import { getCrimeData } from "../src/lib/data-sources/police";
import { getDeprivationData } from "../src/lib/data-sources/deprivation";
import { getNearbyAmenities } from "../src/lib/data-sources/openstreetmap";
import { getFloodRisk } from "../src/lib/data-sources/flood";
import { computeScores } from "../src/lib/scoring-engine";
import type { Intent } from "../src/lib/types";

async function main() {
  const postcode = process.argv[2];
  const slug = process.argv[3];
  const displayName = process.argv[4];

  if (!postcode || !slug || !displayName) {
    console.error("Usage: npx tsx scripts/seed-area.ts <postcode> <slug> <display-name>");
    console.error("Example: npx tsx scripts/seed-area.ts WC2N5DU london \"Central London\"");
    process.exit(1);
  }

  console.log(`\n[seed] Fetching data for ${displayName} (${postcode})...\n`);

  // 1. Geocode
  const geo = await geocodeArea(postcode);
  if (!geo) {
    console.error("[seed] Failed to geocode postcode. Aborting.");
    process.exit(1);
  }

  console.log(`[seed] Geocoded: ${geo.admin_district}, ${geo.region} (${geo.area_type})`);
  console.log(`[seed] LSOA: ${geo.lsoa}`);

  // 2. Fetch all data sources in parallel
  const [crime, deprivation, amenities, flood] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    getDeprivationData(geo.lsoa),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
  ]);

  console.log(`[seed] Crime: ${crime?.total_crimes ?? "N/A"} total`);
  console.log(`[seed] IMD: decile ${deprivation?.imd_decile ?? "N/A"}`);
  console.log(`[seed] Amenities: ${amenities?.total ?? "N/A"} total`);
  console.log(`[seed] Flood zones: ${flood?.flood_areas_nearby ?? "N/A"}`);

  // 3. Compute scores for all 4 intents
  const intents: Intent[] = ["moving", "business", "investing", "research"];
  const areaType = geo.area_type ?? "suburban";

  const intentScores = intents.map((intent) => {
    const scores = computeScores(intent, crime, deprivation, amenities, flood, areaType);
    return { intent, overall: scores.overall, dimensions: scores.dimensions };
  });

  // 4. Use "research" as the default display intent (most balanced)
  const research = intentScores.find((i) => i.intent === "research")!;

  // 5. Build the output
  const output = {
    name: displayName,
    region: geo.region || geo.admin_district,
    postcode: postcode.toUpperCase().replace(/^(.+?)(\d\w{2})$/, "$1 $2"),
    areaType,
    overallScore: research.overall,
    population: "—",
    avgPropertyPrice: "—",
    image: "https://images.unsplash.com/photo-REPLACE-ME?w=1600&q=80",
    summary: "REPLACE WITH REAL SUMMARY",
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

  console.log("\n" + "=".repeat(60));
  console.log("AREA SEED DATA — paste into AREAS object:");
  console.log("=".repeat(60) + "\n");
  console.log(JSON.stringify(output, null, 2));

  // Also print a summary
  console.log("\n" + "=".repeat(60));
  console.log("SCORE SUMMARY:");
  console.log("=".repeat(60));
  for (const i of intentScores) {
    console.log(`\n  ${i.intent.toUpperCase()} — Overall: ${i.overall}/100`);
    for (const d of i.dimensions) {
      const bar = "█".repeat(Math.round(d.score / 5)) + "░".repeat(20 - Math.round(d.score / 5));
      console.log(`    ${d.label.padEnd(30)} ${bar} ${d.score}`);
    }
  }
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
