/**
 * Seed Ofsted school inspection data into Neon Postgres.
 *
 * Downloads the Ofsted Management Information CSV (latest inspections for ~22k state schools),
 * geocodes postcodes via postcodes.io bulk API, and inserts into the ofsted_schools table.
 *
 * Usage:
 *   npx tsx scripts/seed-ofsted.ts
 *   npx tsx scripts/seed-ofsted.ts "https://assets.publishing.service.gov.uk/media/.../file.csv"
 *
 * Requires DATABASE_URL in .env.local
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

/* ── Load .env.local ── */
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found, rely on environment variables
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[seed-ofsted] DATABASE_URL not set. Check .env.local or environment.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/* ── Default Ofsted CSV URL (latest inspections, updated monthly on gov.uk) ── */
const DEFAULT_OFSTED_URL =
  "https://assets.publishing.service.gov.uk/media/681cd390275cb67b18d870fc/Management_information_-_state-funded_schools_-_latest_inspections_as_at_30_Apr_2025.csv";

/* ── CSV parser (handles quoted fields with commas) ── */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
  }
  fields.push(field.trim());
  return fields;
}

/* ── Geocode postcodes via postcodes.io bulk API ── */
async function bulkGeocode(postcodes: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  const batchSize = 100;

  for (let i = 0; i < postcodes.length; i += batchSize) {
    const batch = postcodes.slice(i, i + batchSize);
    try {
      const res = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: batch }),
      });

      if (!res.ok) {
        console.warn(`[seed-ofsted] Geocode batch ${Math.floor(i / batchSize) + 1} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.result || []) {
        if (item.result && item.result.latitude && item.result.longitude) {
          results.set(item.query.toUpperCase().replace(/\s+/g, ""), {
            lat: item.result.latitude,
            lng: item.result.longitude,
          });
        }
      }
    } catch (err) {
      console.warn(`[seed-ofsted] Geocode batch ${Math.floor(i / batchSize) + 1} error:`, err);
    }

    // Small delay to respect rate limits
    if (i + batchSize < postcodes.length) {
      await new Promise((r) => setTimeout(r, 200));
    }

    if ((Math.floor(i / batchSize) + 1) % 25 === 0) {
      console.log(`[seed-ofsted] Geocoded ${Math.min(i + batchSize, postcodes.length)}/${postcodes.length} postcodes...`);
    }
  }

  return results;
}

/* ── Rating code to text ── */
function ratingText(code: string): string | null {
  switch (code) {
    case "1": return "Outstanding";
    case "2": return "Good";
    case "3": return "Requires Improvement";
    case "4": return "Inadequate";
    default: return null;
  }
}

/* ── Main ── */
async function main() {
  const csvUrl = process.argv[2] || DEFAULT_OFSTED_URL;
  console.log(`[seed-ofsted] Downloading Ofsted CSV...`);
  console.log(`[seed-ofsted] URL: ${csvUrl.slice(0, 80)}...`);

  const res = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    console.error(`[seed-ofsted] Failed to download CSV: ${res.status} ${res.statusText}`);
    console.error("[seed-ofsted] Try providing a direct URL as argument:");
    console.error("[seed-ofsted]   npx tsx scripts/seed-ofsted.ts \"https://...csv\"");
    console.error("[seed-ofsted] Find the latest at: https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes");
    process.exit(1);
  }

  const csvText = await res.text();
  const lines = csvText.split("\n").filter((l) => l.trim());
  console.log(`[seed-ofsted] Parsed ${lines.length} rows (including header)`);

  // Parse header to find column indices
  const headers = parseCSVLine(lines[0]);
  const col = (name: string): number => {
    const idx = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
    if (idx === -1) console.warn(`[seed-ofsted] Column "${name}" not found in headers`);
    return idx;
  };

  const urnCol = col("URN");
  const nameCol = col("School name");
  const phaseCol = col("Ofsted phase");
  const postcodeCol = col("Postcode");
  const ratingCol = col("Overall effectiveness");
  const dateCol = col("Inspection start date");

  if (urnCol === -1 || nameCol === -1 || postcodeCol === -1) {
    console.error("[seed-ofsted] Critical columns missing. Check CSV format.");
    console.error("[seed-ofsted] Headers found:", headers.slice(0, 20).join(", "));
    process.exit(1);
  }

  // Parse all schools
  interface SchoolRow {
    urn: number;
    name: string;
    phase: string;
    postcode: string;
    rating: number | null;
    ratingText: string | null;
    inspectionDate: string;
  }

  const schools: SchoolRow[] = [];
  const postcodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const urn = parseInt(fields[urnCol], 10);
    if (isNaN(urn)) continue;

    const postcode = (fields[postcodeCol] || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!postcode) continue;

    const ratingCode = ratingCol >= 0 ? (fields[ratingCol] || "").trim() : "";
    const rating = ["1", "2", "3", "4"].includes(ratingCode) ? parseInt(ratingCode, 10) : null;

    schools.push({
      urn,
      name: fields[nameCol] || "Unknown",
      phase: phaseCol >= 0 ? (fields[phaseCol] || "Unknown") : "Unknown",
      postcode,
      rating,
      ratingText: ratingText(ratingCode),
      inspectionDate: dateCol >= 0 ? (fields[dateCol] || "") : "",
    });

    postcodes.add(postcode);
  }

  console.log(`[seed-ofsted] ${schools.length} schools parsed, ${postcodes.size} unique postcodes`);

  // Geocode all unique postcodes
  console.log(`[seed-ofsted] Geocoding ${postcodes.size} postcodes via postcodes.io...`);
  const geoMap = await bulkGeocode(Array.from(postcodes));
  console.log(`[seed-ofsted] Successfully geocoded ${geoMap.size}/${postcodes.size} postcodes`);

  // Create table
  console.log("[seed-ofsted] Creating ofsted_schools table...");
  await sql`
    CREATE TABLE IF NOT EXISTS ofsted_schools (
      id SERIAL PRIMARY KEY,
      urn INTEGER UNIQUE NOT NULL,
      school_name TEXT NOT NULL,
      phase TEXT,
      postcode TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      overall_effectiveness INTEGER,
      rating_text TEXT,
      inspection_date TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofsted_lat ON ofsted_schools (latitude)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ofsted_lng ON ofsted_schools (longitude)`;

  // Clear existing data
  await sql`TRUNCATE ofsted_schools RESTART IDENTITY`;
  console.log("[seed-ofsted] Table ready (cleared old data)");

  // Insert schools one at a time using tagged template literals (neon requirement)
  let inserted = 0;
  let skippedNoGeo = 0;
  let skippedNoRating = 0;

  // Filter to valid schools first
  interface ValidSchool {
    urn: number;
    name: string;
    phase: string;
    postcode: string;
    lat: number;
    lng: number;
    rating: number;
    ratingText: string;
    inspectionDate: string;
  }

  const validSchools: ValidSchool[] = [];
  for (const s of schools) {
    const geo = geoMap.get(s.postcode);
    if (!geo) { skippedNoGeo++; continue; }
    if (s.rating === null) { skippedNoRating++; continue; }

    const displayPostcode = s.postcode.length > 3
      ? s.postcode.slice(0, -3) + " " + s.postcode.slice(-3)
      : s.postcode;

    validSchools.push({
      urn: s.urn,
      name: s.name,
      phase: s.phase,
      postcode: displayPostcode,
      lat: geo.lat,
      lng: geo.lng,
      rating: s.rating,
      ratingText: s.ratingText || "",
      inspectionDate: s.inspectionDate,
    });
  }

  console.log(`[seed-ofsted] ${validSchools.length} schools to insert (${skippedNoGeo} no geo, ${skippedNoRating} no rating)`);

  // Insert in concurrent batches for speed
  const concurrency = 10;
  for (let i = 0; i < validSchools.length; i += concurrency) {
    const batch = validSchools.slice(i, i + concurrency);
    await Promise.all(
      batch.map((s) =>
        sql`
          INSERT INTO ofsted_schools (urn, school_name, phase, postcode, latitude, longitude, overall_effectiveness, rating_text, inspection_date)
          VALUES (${s.urn}, ${s.name}, ${s.phase}, ${s.postcode}, ${s.lat}, ${s.lng}, ${s.rating}, ${s.ratingText}, ${s.inspectionDate})
          ON CONFLICT (urn) DO UPDATE SET
            school_name = EXCLUDED.school_name,
            phase = EXCLUDED.phase,
            postcode = EXCLUDED.postcode,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            overall_effectiveness = EXCLUDED.overall_effectiveness,
            rating_text = EXCLUDED.rating_text,
            inspection_date = EXCLUDED.inspection_date
        `
      )
    );
    inserted += batch.length;

    if (inserted % 500 === 0 || i + concurrency >= validSchools.length) {
      console.log(`[seed-ofsted] Inserted ${inserted}/${validSchools.length} schools...`);
    }
  }

  // Summary
  const counts = await sql`
    SELECT rating_text, COUNT(*) as count
    FROM ofsted_schools
    GROUP BY rating_text
    ORDER BY count DESC
  `;

  console.log("\n" + "=".repeat(50));
  console.log("SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`Total inserted:    ${inserted}`);
  console.log(`Skipped (no geo):  ${skippedNoGeo}`);
  console.log(`Skipped (no rating): ${skippedNoRating}`);
  console.log("\nRating distribution:");
  for (const row of counts) {
    console.log(`  ${(row.rating_text || "Unknown").padEnd(25)} ${row.count}`);
  }
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("[seed-ofsted] Fatal error:", err);
  process.exit(1);
});
