/* Ofsted refresh job, state-funded school inspections into ofsted_schools.

   Ports the one-shot apps/web/scripts/seed-ofsted.ts into a proper apps/api
   refresh CLI on the monthly cron. Differences from the seed (AR-482):
     - Resolves the latest gov.uk CSV automatically. The filename is dated
       monthly with no stable URL, so we read the index page and pick the
       "latest inspections as at <date>" snapshot (not the smaller
       "all inspections year-to-date" file).
     - Upsert + delete-stale instead of TRUNCATE, so there is no empty window
       during the refresh and closed schools drop out.
     - Writes provenance: an updated_at stamp per row plus a source_snapshots
       row, so "when did Ofsted last update" is answerable.

   ofsted_schools is a standalone table (nearest-school lookups in
   area-profile), not part of the signal store, so this job does not touch
   signal_values / signal_timeseries.

   CLI:  npm run refresh:ofsted -w @onegoodarea/api [-- <csv-url>] */

import { sql, query } from "../../../infrastructure/db/client";
import { bulkUpsert, writeSnapshots, type QueryRunner } from "./store-writer";
import { generateId } from "../../../infrastructure/utils/id";
import { logger } from "../../tracking/structured-logger";

const OFSTED_SOURCE = "Ofsted state-funded school inspections";
const GOV_UK_INDEX =
  "https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes";

const run: QueryRunner = (text, params) => query(text, params);

/* ── pure helpers (unit-testable, no IO) ── */

/** PURE: pick the "latest inspections as at <date>" CSV link out of the gov.uk
    index page HTML. Ignores the smaller "all inspections year-to-date" file.
    Returns null if none found. */
export function extractLatestCsvUrl(html: string): string | null {
  const urls = [
    ...html.matchAll(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"'\s<>]+\.csv/gi),
  ]
    .map((m) => m[0])
    .filter((u) => /latest_inspections_as_at/i.test(u));
  if (urls.length === 0) return null;
  // The page lists every monthly snapshot (dozens, oldest-first), so pick the
  // newest by its as-at date rather than trusting document order.
  let best = urls[0];
  let bestKey = parseAsAtDate(best) ?? "";
  for (const u of urls.slice(1)) {
    const key = parseAsAtDate(u) ?? "";
    if (key > bestKey) {
      bestKey = key;
      best = u;
    }
  }
  return best;
}

/** PURE: "..._as_at_30_June_2026.csv" -> "2026-06-30" (ISO date), or null. */
export function parseAsAtDate(url: string): string | null {
  const m = url.match(/as_at_(\d{1,2})_([A-Za-z]+)_(\d{4})/);
  if (!m) return null;
  // gov.uk mixes abbreviated and full month names (Oct, June, October, ...),
  // so match on the first three letters.
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const mm = months[m[2].slice(0, 3).toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

/** PURE: split one CSV line, honouring double-quoted fields with commas. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { fields.push(field.trim()); field = ""; }
    else field += ch;
  }
  fields.push(field.trim());
  return fields;
}

/** PURE: Ofsted overall-effectiveness code -> label. */
export function ratingText(code: string): string | null {
  switch (code) {
    case "1": return "Outstanding";
    case "2": return "Good";
    case "3": return "Requires Improvement";
    case "4": return "Inadequate";
    default: return null;
  }
}

export interface OfstedSchool {
  urn: number;
  school_name: string;
  phase: string;
  postcode: string; // normalized: UPPER, no spaces
  overall_effectiveness: number;
  rating_text: string;
  inspection_date: string;
}

/** PURE: parse the Ofsted CSV into schools with a valid URN, postcode and a
    current 1-4 rating. Postcodes are normalized (UPPER, no spaces). */
export function parseSchools(csvText: string): OfstedSchool[] {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const col = (name: string) => headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
  const urnCol = col("URN");
  const nameCol = col("School name");
  const phaseCol = col("Ofsted phase");
  const postcodeCol = col("Postcode");
  const ratingCol = col("Overall effectiveness");
  const dateCol = col("Inspection start date");
  if (urnCol < 0 || nameCol < 0 || postcodeCol < 0) {
    throw new Error(
      `Ofsted CSV missing required columns (URN/School name/Postcode); headers: ${headers.slice(0, 12).join(", ")}`,
    );
  }
  const out: OfstedSchool[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const urn = parseInt(f[urnCol], 10);
    if (Number.isNaN(urn)) continue;
    const postcode = (f[postcodeCol] ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!postcode) continue;
    const code = ratingCol >= 0 ? (f[ratingCol] ?? "").trim() : "";
    if (!["1", "2", "3", "4"].includes(code)) continue; // schools without a current rating are skipped
    out.push({
      urn,
      school_name: f[nameCol] || "Unknown",
      phase: phaseCol >= 0 ? (f[phaseCol] || "Unknown") : "Unknown",
      postcode,
      overall_effectiveness: parseInt(code, 10),
      rating_text: ratingText(code) ?? "",
      inspection_date: dateCol >= 0 ? (f[dateCol] || "") : "",
    });
  }
  return out;
}

/* ── IO ── */

async function resolveLatestCsvUrl(): Promise<string> {
  const res = await fetch(GOV_UK_INDEX, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`gov.uk Ofsted index page returned ${res.status}`);
  const url = extractLatestCsvUrl(await res.text());
  if (!url) throw new Error("could not find the 'latest inspections' CSV link on the gov.uk index page");
  return url;
}

/** Geocode postcodes via the postcodes.io bulk API (batches of 100). Returns a
    map keyed by the normalized (UPPER, no-space) postcode. */
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
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        logger.warn(`[refresh:ofsted] geocode batch ${Math.floor(i / batchSize) + 1} -> ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        result?: Array<{ query: string; result: { latitude: number; longitude: number } | null }>;
      };
      for (const item of data.result ?? []) {
        if (item.result?.latitude != null && item.result?.longitude != null) {
          results.set(item.query.toUpperCase().replace(/\s+/g, ""), {
            lat: item.result.latitude,
            lng: item.result.longitude,
          });
        }
      }
    } catch (err) {
      logger.warn(`[refresh:ofsted] geocode batch ${Math.floor(i / batchSize) + 1} error`, err);
    }
    if (i + batchSize < postcodes.length) await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}

/* Row shape as a `type` alias (not interface) so it satisfies bulkUpsert's
   Record<string, unknown> param. See store-writer.ts. */
type OfstedRow = {
  urn: number;
  school_name: string;
  phase: string;
  postcode: string;
  latitude: number;
  longitude: number;
  overall_effectiveness: number;
  rating_text: string;
  inspection_date: string;
  updated_at: string;
};

export interface OfstedRefreshSummary {
  csvUrl: string;
  asAt: string | null;
  parsed: number;
  geocoded: number;
  loaded: number;
  deletedStale: number;
  snapshotId: string;
}

export async function runOfstedRefresh(csvUrlArg?: string): Promise<OfstedRefreshSummary> {
  const csvUrl = csvUrlArg || (await resolveLatestCsvUrl());
  const asAt = parseAsAtDate(csvUrl);
  logger.info(`[refresh:ofsted] source ${csvUrl}`);

  const res = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Ofsted CSV download returned ${res.status}`);
  const schools = parseSchools(await res.text());

  const uniquePostcodes = [...new Set(schools.map((s) => s.postcode))];
  const geo = await bulkGeocode(uniquePostcodes);

  const runStart = new Date().toISOString();
  const rows: OfstedRow[] = [];
  for (const s of schools) {
    const g = geo.get(s.postcode);
    if (!g) continue; // no geocode, skip
    const display = s.postcode.length > 3
      ? `${s.postcode.slice(0, -3)} ${s.postcode.slice(-3)}`
      : s.postcode;
    rows.push({
      urn: s.urn,
      school_name: s.school_name,
      phase: s.phase,
      postcode: display,
      latitude: g.lat,
      longitude: g.lng,
      overall_effectiveness: s.overall_effectiveness,
      rating_text: s.rating_text,
      inspection_date: s.inspection_date,
      updated_at: runStart,
    });
  }

  const loaded = await bulkUpsert(
    run,
    {
      table: "ofsted_schools",
      columns: [
        "urn", "school_name", "phase", "postcode", "latitude", "longitude",
        "overall_effectiveness", "rating_text", "inspection_date", "updated_at",
      ],
      conflict: {
        target: ["urn"],
        set: [
          "school_name = EXCLUDED.school_name",
          "phase = EXCLUDED.phase",
          "postcode = EXCLUDED.postcode",
          "latitude = EXCLUDED.latitude",
          "longitude = EXCLUDED.longitude",
          "overall_effectiveness = EXCLUDED.overall_effectiveness",
          "rating_text = EXCLUDED.rating_text",
          "inspection_date = EXCLUDED.inspection_date",
          "updated_at = EXCLUDED.updated_at",
        ],
      },
    },
    rows,
  );

  // Safety floor: there are ~22k state schools, and a healthy run loads well
  // over 10k. If far fewer loaded, something upstream broke (bad CSV, geocoder
  // down), so abort BEFORE the delete rather than wipe the live table. The
  // upserted rows stay; a later good run reconciles.
  if (loaded < 10000) {
    throw new Error(
      `[refresh:ofsted] only ${loaded} schools loaded (expected ~20k); aborting before delete to protect ofsted_schools`,
    );
  }

  // Drop schools not in the latest CSV (closed) and any pre-provenance NULL rows.
  const deleted = (
    await sql`DELETE FROM ofsted_schools WHERE updated_at IS NULL OR updated_at < ${runStart} RETURNING urn`
  ).length;

  const snapshotId = generateId("snap", 12);
  await writeSnapshots([
    {
      id: snapshotId,
      source: OFSTED_SOURCE,
      release_date: asAt,
      licence: "Open Government Licence v3.0",
      checksum: null,
      row_count: loaded,
      notes: `${loaded} schools loaded${asAt ? `, as at ${asAt}` : ""}; ${deleted} stale removed`,
    },
  ]);

  logger.info(
    `[refresh:ofsted] ${schools.length} parsed -> ${geo.size} geocoded -> ${loaded} loaded, ${deleted} stale removed`,
  );

  return {
    csvUrl, asAt, parsed: schools.length, geocoded: geo.size,
    loaded, deletedStale: deleted, snapshotId,
  };
}

const invokedDirectly = /[\\/]refresh[\\/]ofsted\.(ts|cjs)$/.test(process.argv[1] ?? "");
if (invokedDirectly) {
  runOfstedRefresh(process.argv[2])
    .then((s) => {
      console.log(
        `[refresh:ofsted] ${s.parsed} parsed, ${s.geocoded} geocoded, ${s.loaded} loaded, ${s.deletedStale} stale removed (snapshot ${s.snapshotId})`,
      );
      console.log(`  source: ${s.csvUrl}${s.asAt ? ` (as at ${s.asAt})` : ""}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[refresh:ofsted] failed:", err);
      process.exit(1);
    });
}
