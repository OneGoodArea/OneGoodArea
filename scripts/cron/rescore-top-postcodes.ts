/* Re-score top UK postcodes monthly, persist to report_history.
 *
 * Pure deterministic scoring — no AI narration. Cheaper to run
 * (just public API calls), faster, and gives us a clean numeric trend
 * dataset that compounds month over month.
 *
 * Usage:
 *   npx tsx scripts/cron/rescore-top-postcodes.ts             # full run
 *   npx tsx scripts/cron/rescore-top-postcodes.ts --limit 5   # first 5 only
 *   npx tsx scripts/cron/rescore-top-postcodes.ts --dry-run   # no DB writes
 *
 * Wired into Vercel Cron via vercel.json with monthly schedule. The
 * handler at src/app/api/cron/rescore/route.ts invokes the same logic
 * over HTTP, gated by CRON_SECRET.
 */

import { sql } from "../../src/lib/db";
import { ensureReportHistoryTable } from "../../src/lib/db-schema";
import { geocodeArea } from "../../src/lib/data-sources/postcodes";
import { getCrimeData } from "../../src/lib/data-sources/police";
import { getDeprivationData } from "../../src/lib/data-sources/deprivation";
import { getNearbyAmenities } from "../../src/lib/data-sources/openstreetmap";
import { getFloodRisk } from "../../src/lib/data-sources/flood";
import { getPropertyPrices } from "../../src/lib/data-sources/land-registry";
import { getOfstedSchools } from "../../src/lib/data-sources/ofsted";
import { computeScores } from "../../src/lib/scoring-engine";
import { METHODOLOGY_VERSION } from "../../src/lib/methodology-versions";
import { TOP_POSTCODES } from "../../src/lib/top-postcodes";
import { generateId } from "../../src/lib/id";
import { Intent } from "../../src/lib/types";

const INTENTS: Intent[] = ["moving", "business", "investing", "research"];

interface RunOptions {
  limit?: number;
  dryRun: boolean;
  postcodes?: string[];
}

interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string;
  postcodes_attempted: number;
  rows_written: number;
  failed: { postcode: string; reason: string }[];
}

/* Score a single postcode against all 4 intents. Returns the deterministic
   ScoreResult plus area_type. No AI call, no cache lookup. */
async function scorePostcode(postcode: string): Promise<Array<{
  intent: Intent;
  score: number;
  confidence: number;
  area_type: string;
  dimensions: unknown;
}> | null> {
  const geo = await geocodeArea(postcode);
  if (!geo) return null;

  const [crime, deprivation, amenities, flood, propertyPrices, ofsted] = await Promise.all([
    getCrimeData(geo.latitude, geo.longitude),
    getDeprivationData(geo.lsoa, geo.lsoa11),
    getNearbyAmenities(geo.latitude, geo.longitude),
    getFloodRisk(geo.latitude, geo.longitude),
    getPropertyPrices(geo.query),
    getOfstedSchools(geo.latitude, geo.longitude, geo.country),
  ]);

  const areaType = geo.area_type ?? "suburban";

  return INTENTS.map((intent) => {
    const result = computeScores(intent, crime, deprivation, amenities, flood, areaType, propertyPrices, ofsted);
    return {
      intent,
      score: result.overall,
      confidence: result.confidence,
      area_type: result.area_type,
      dimensions: result.dimensions,
    };
  });
}

export async function runRescoreCron(opts: RunOptions): Promise<RunSummary> {
  const run_id = generateId("run", 12);
  const started_at = new Date().toISOString();
  const list = (opts.postcodes ?? TOP_POSTCODES).slice(0, opts.limit ?? Number.MAX_SAFE_INTEGER);

  if (!opts.dryRun) {
    await ensureReportHistoryTable();
  }

  let rows_written = 0;
  const failed: { postcode: string; reason: string }[] = [];

  console.log(`[rescore] run_id=${run_id} postcodes=${list.length} dry_run=${opts.dryRun}`);

  for (const postcode of list) {
    try {
      const results = await scorePostcode(postcode);
      if (!results) {
        failed.push({ postcode, reason: "geocode failed" });
        console.log(`[rescore] ${postcode} - geocode failed, skipping`);
        continue;
      }

      for (const r of results) {
        if (opts.dryRun) {
          console.log(`[rescore] ${postcode} ${r.intent} score=${r.score} conf=${r.confidence}`);
        } else {
          await sql`
            INSERT INTO report_history
              (run_id, postcode, intent, area_type, overall_score, confidence, dimensions, engine_version, generated_at)
            VALUES
              (${run_id}, ${postcode}, ${r.intent}, ${r.area_type}, ${r.score}, ${r.confidence}, ${JSON.stringify(r.dimensions)}::jsonb, ${METHODOLOGY_VERSION}, ${new Date().toISOString()})
            ON CONFLICT (run_id, postcode, intent) DO NOTHING
          `;
        }
        rows_written += 1;
      }

      console.log(`[rescore] ${postcode} - 4 intents scored`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ postcode, reason: msg });
      console.log(`[rescore] ${postcode} - error: ${msg}`);
    }
  }

  const finished_at = new Date().toISOString();
  const summary: RunSummary = {
    run_id,
    started_at,
    finished_at,
    postcodes_attempted: list.length,
    rows_written,
    failed,
  };

  console.log(`[rescore] done. run_id=${run_id} rows=${rows_written} failed=${failed.length}`);
  return summary;
}

/* CLI entry point.
   Run with: npx tsx scripts/cron/rescore-top-postcodes.ts [--limit N] [--dry-run] */
async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;
  const dryRun = args.includes("--dry-run");

  const summary = await runRescoreCron({ limit, dryRun });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed.length > 0 && summary.rows_written === 0 ? 1 : 0);
}

const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
               process.argv[1]?.endsWith("rescore-top-postcodes.ts");
if (isMain) {
  main().catch((err) => {
    console.error("[rescore] fatal:", err);
    process.exit(1);
  });
}
