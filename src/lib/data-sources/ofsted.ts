import { sql } from "@/lib/db";
import { logger } from "@/lib/logger";

/* ── Types ── */

export interface OfstedSchool {
  urn: number;
  school_name: string;
  phase: string;
  overall_rating: number | null;
  rating_text: string;
  inspection_date: string;
  distance_km: number;
}

export interface OfstedData {
  schools: OfstedSchool[];
  total_rated: number;
  rating_breakdown: Record<string, number>;
  inspectorate: string;
}

/* ── Table ── */

let tableChecked = false;

async function ensureOfstedTable(): Promise<void> {
  if (tableChecked) return;

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

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ofsted_lat ON ofsted_schools (latitude)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ofsted_lng ON ofsted_schools (longitude)
  `;

  tableChecked = true;
}

/* ── Helpers ── */

function ratingToText(rating: number | null): string {
  switch (rating) {
    case 1: return "Outstanding";
    case 2: return "Good";
    case 3: return "Requires Improvement";
    case 4: return "Inadequate";
    default: return "Not rated";
  }
}

/* ── Main query ── */

export async function getOfstedSchools(
  lat: number,
  lng: number,
  country?: string
): Promise<OfstedData | null> {
  // Ofsted only covers England
  if (country && country !== "England") return null;

  try {
    await ensureOfstedTable();

    // Bounding box ~1.5km at UK latitudes (51-56 N)
    const latDelta = 0.0135;
    const lngDelta = 0.0215;

    const rows = await sql`
      SELECT urn, school_name, phase, overall_effectiveness, rating_text,
             inspection_date, latitude, longitude
      FROM ofsted_schools
      WHERE latitude BETWEEN ${lat - latDelta} AND ${lat + latDelta}
        AND longitude BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
      ORDER BY overall_effectiveness ASC NULLS LAST, school_name ASC
    `;

    if (rows.length === 0) return null;

    // Haversine filter to exactly 1.5km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const schools: OfstedSchool[] = [];

    for (const row of rows) {
      const dLat = toRad(row.latitude - lat);
      const dLng = toRad(row.longitude - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(row.latitude)) * Math.sin(dLng / 2) ** 2;
      const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distance <= 1.5) {
        schools.push({
          urn: row.urn,
          school_name: row.school_name,
          phase: row.phase || "Unknown",
          overall_rating: row.overall_effectiveness,
          rating_text: row.rating_text || ratingToText(row.overall_effectiveness),
          inspection_date: row.inspection_date || "",
          distance_km: Math.round(distance * 100) / 100,
        });
      }
    }

    if (schools.length === 0) return null;

    // Build rating breakdown
    const breakdown: Record<string, number> = {};
    for (const s of schools) {
      breakdown[s.rating_text] = (breakdown[s.rating_text] || 0) + 1;
    }

    return {
      schools,
      total_rated: schools.length,
      rating_breakdown: breakdown,
      inspectorate: "Ofsted",
    };
  } catch (err) {
    logger.error("[AreaIQ] Ofsted lookup failed:", err);
    return null;
  }
}

/* ── Prompt formatting ── */

export function formatOfstedForPrompt(data: OfstedData): string {
  const lines = [
    `SCHOOL INSPECTION DATA (Source: ${data.inspectorate}):`,
    `Rated schools within 1.5km: ${data.total_rated}`,
  ];

  const breakdownStr = Object.entries(data.rating_breakdown)
    .map(([rating, count]) => `${count} ${rating}`)
    .join(", ");

  if (breakdownStr) {
    lines.push(`Rating breakdown: ${breakdownStr}`);
  }

  lines.push("");
  lines.push("Nearby schools:");
  for (const s of data.schools.slice(0, 10)) {
    const datePart = s.inspection_date ? ` (inspected ${s.inspection_date})` : "";
    lines.push(`  - ${s.school_name} (${s.phase}): ${s.rating_text}${datePart} [${s.distance_km}km]`);
  }

  return lines.join("\n");
}
