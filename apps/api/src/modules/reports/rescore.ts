import type { Intent } from "@onegoodarea/contracts";
import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { logger } from "../tracking/structured-logger";
import { geocodeArea } from "../signals/data-sources/postcodes";
import { getCrimeData } from "../signals/data-sources/police";
import { getDeprivationData } from "../signals/data-sources/deprivation";
import { getNearbyAmenities } from "../signals/data-sources/openstreetmap";
import { getFloodRisk } from "../signals/data-sources/flood";
import { getPropertyPrices } from "../signals/data-sources/land-registry";
import { getOfstedSchools } from "../signals/data-sources/ofsted";
import { computeScores } from "../engine/scoring-engine";
import { METHODOLOGY_VERSION } from "./methodology";
import { TOP_POSTCODES } from "./top-postcodes";

/* Re-score top UK postcodes, persist to report_history (the time-series moat).

   Migrated from legacy scripts/cron/rescore-top-postcodes.ts. Changes: imports
   repointed to apps/api; the ensureReportHistoryTable() self-create is dropped
   (the migrator owns report_history); console.log -> the structured logger; the
   tsx CLI entrypoint is dropped (apps/api invokes runRescoreCron via the
   CRON_SECRET-gated GET /cron/rescore route, run by the container scheduler).
   The scoring is deterministic — no AI narration, no cache — so it is cheap to
   run and yields a clean numeric trend dataset that compounds month over month. */

const INTENTS: Intent[] = ["moving", "business", "investing", "research"];

export interface RescoreOptions {
  limit?: number;
  dryRun: boolean;
  postcodes?: string[];
}

export interface RescoreSummary {
  run_id: string;
  started_at: string;
  finished_at: string;
  postcodes_attempted: number;
  rows_written: number;
  failed: { postcode: string; reason: string }[];
}

/* Score a single postcode against all 4 intents. Deterministic; no AI, no cache. */
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

export async function runRescoreCron(opts: RescoreOptions): Promise<RescoreSummary> {
  const run_id = generateId("run", 12);
  const started_at = new Date().toISOString();
  const list = (opts.postcodes ?? TOP_POSTCODES).slice(0, opts.limit ?? Number.MAX_SAFE_INTEGER);

  let rows_written = 0;
  const failed: { postcode: string; reason: string }[] = [];

  logger.info(`[rescore] run_id=${run_id} postcodes=${list.length} dry_run=${opts.dryRun}`);

  for (const postcode of list) {
    try {
      const results = await scorePostcode(postcode);
      if (!results) {
        failed.push({ postcode, reason: "geocode failed" });
        logger.info(`[rescore] ${postcode} - geocode failed, skipping`);
        continue;
      }

      for (const r of results) {
        if (opts.dryRun) {
          logger.info(`[rescore] ${postcode} ${r.intent} score=${r.score} conf=${r.confidence}`);
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

      logger.info(`[rescore] ${postcode} - 4 intents scored`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ postcode, reason: msg });
      logger.warn(`[rescore] ${postcode} - error: ${msg}`);
    }
  }

  const finished_at = new Date().toISOString();
  const summary: RescoreSummary = {
    run_id,
    started_at,
    finished_at,
    postcodes_attempted: list.length,
    rows_written,
    failed,
  };

  logger.info(`[rescore] done. run_id=${run_id} rows=${rows_written} failed=${failed.length}`);
  return summary;
}
