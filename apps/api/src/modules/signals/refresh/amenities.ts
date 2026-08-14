/* AR-804/AR-821: background refresh for OSM amenities data.

   Phase 4 (write-on-miss) primes the store on first query per LSOA; this job
   keeps those rows fresh. It scans signal_values for amenities rows whose
   updated_at is older than the staleness window, resolves each LSOA to a
   coordinate (the geo_lookup centroid — the per-postcode NSPL lat/lng averaged
   per LSOA), re-fetches from Overpass, and upserts in place.

   The Overpass fetch path (getNearbyAmenities) already handles mirror racing,
   cooldowns and Retry-After; the job adds its own pacing between LSOAs
   (gapMsBetweenCalls) so a full sweep never slams the upstream. See ADR 0003.

   Entry points:
     npm run refresh:amenities -w @onegoodarea/api            (one-shot)
     npm run refresh:amenities:daemon -w @onegoodarea/api     (long-running)
   Both call the same core runAmenitiesRefresh; the daemon wraps it in a loop
   sleeping sweepIntervalMs between sweeps. */

import { getNearbyAmenities } from "../data-sources/openstreetmap";
import { getConfig } from "../../../infrastructure/config";
import { METHODOLOGY_VERSION } from "../../engine/methodology";
import { logger } from "../../tracking/structured-logger";
import { query as defaultQuery } from "../../../infrastructure/db/client";
import { writeAmenitiesToStore, type QueryRunner } from "./store-writer";

export interface AmenitiesRefreshSummary {
  candidates: number;
  stale: number;
  refreshed: number;
  skipped_no_coords: number;
  failures: number;
  duration_ms: number;
}

/** LSOA -> centroid coordinate from geo_lookup (mean of its postcodes). */
export async function findLsoaCentroids(
  lsoas: string[],
  run: QueryRunner,
): Promise<Map<string, { latitude: number; longitude: number }>> {
  if (lsoas.length === 0) return new Map();
  const rows = (await run(
    `SELECT lsoa_code, AVG(latitude)::float8 AS lat, AVG(longitude)::float8 AS lng
       FROM geo_lookup
      WHERE lsoa_code = ANY($1)
      GROUP BY lsoa_code`,
    [lsoas],
  )) as unknown as Array<{ lsoa_code: string; lat: number | null; lng: number | null }>;
  const out = new Map<string, { latitude: number; longitude: number }>();
  for (const r of rows) {
    if (r.lat !== null && r.lng !== null && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
      out.set(r.lsoa_code, { latitude: r.lat, longitude: r.lng });
    }
  }
  return out;
}

export interface AmenitiesRefreshDeps {
  run?: QueryRunner;
  gapMsBetweenCalls?: number;
  staleAfterHours?: number;
  fetchLive?: (lat: number, lng: number) => Promise<import("../inputs").AmenitiesData | null>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runAmenitiesRefresh(deps: AmenitiesRefreshDeps = {}): Promise<AmenitiesRefreshSummary> {
  const t0 = Date.now();
  const cfg = getConfig().amenities;
  const run = deps.run ?? ((text, params) => defaultQuery(text, params));
  const gapMs = deps.gapMsBetweenCalls ?? cfg.gapMsBetweenCalls;
  const staleAfterHours = deps.staleAfterHours ?? cfg.refreshStaleAfterHours;
  const fetchLive = deps.fetchLive ?? getNearbyAmenities;

  const candidates = (await run(
    `SELECT DISTINCT geo_code
       FROM signal_values
      WHERE signal_key LIKE 'amenities.%'
        AND updated_at < NOW() - ($1::int * INTERVAL '1 hour')`,
    [staleAfterHours],
  )) as unknown as Array<{ geo_code: string }>;
  const lsoas = candidates.map((c) => c.geo_code);
  const centroids = await findLsoaCentroids(lsoas, run);

  let stale = 0;
  let refreshed = 0;
  let skipped_no_coords = 0;
  let failures = 0;

  for (const { geo_code } of candidates) {
    stale++;
    const c = centroids.get(geo_code);
    if (!c) { skipped_no_coords++; continue; }

    try {
      const data = await fetchLive(c.latitude, c.longitude);
      if (data === null) { failures++; continue; }
      await writeAmenitiesToStore(geo_code, data, METHODOLOGY_VERSION, "lsoa", run);
      refreshed++;
    } catch (err) {
      failures++;
      logger.warn(`[refresh:amenities] failed for ${geo_code}`, { error: err instanceof Error ? err.message : String(err) });
    }

    if (gapMs > 0) await sleep(gapMs);
  }

  const durationMs = Date.now() - t0;
  logger.info(
    `[refresh:amenities] candidates=${stale} stale=${stale} refreshed=${refreshed} skipped_no_coords=${skipped_no_coords} failures=${failures} duration_ms=${durationMs}`,
    { candidates: stale, stale, refreshed, skipped_no_coords, failures, duration_ms: Math.round(durationMs) },
  );

  return { candidates: stale, stale, refreshed, skipped_no_coords, failures, duration_ms: Math.round(durationMs) };
}

/* CLI: npm run refresh:amenities -w @onegoodarea/api — one-shot sweep.
   The daemon lives in ./amenities-daemon.ts (separate entry point). */
const invokedDirectly = /[\\/]refresh[\\/]amenities\.(ts|cjs)$/.test(process.argv[1] ?? "");
if (invokedDirectly) {
  runAmenitiesRefresh()
    .then((s) => { logger.info("[refresh:amenities] done", s); process.exit(0); })
    .catch((err) => { logger.error("[refresh:amenities] failed", err); process.exit(1); });
}

export async function runAmenitiesRefreshDaemon(deps: AmenitiesRefreshDeps = {}): Promise<void> {
  const intervalMs = getConfig().amenities.sweepIntervalMs;
  logger.info(`[refresh:amenities:daemon] starting; sweep every ${intervalMs}ms`);
  for (;;) {
    const started = Date.now();
    try {
      const summary = await runAmenitiesRefresh(deps);
      logger.info("[refresh:amenities:daemon] sweep complete", summary);
    } catch (err) {
      logger.error("[refresh:amenities:daemon] sweep failed", { error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(Math.max(intervalMs - (Date.now() - started), 0));
  }
}
