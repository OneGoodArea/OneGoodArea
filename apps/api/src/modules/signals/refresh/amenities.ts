/**
 * AR-801/AR-804: Background refresh for OSM amenities data.
 *
 * This job refreshes amenities for LSOAs that have stale data in the store.
 * Without this job, amenities are only refreshed on cache miss (first query
 * after the 24h TTL expires). This job keeps the store warm for frequently
 * queried areas.
 *
 * Run: npm run refresh:amenities -w @onegoodarea/api
 *
 * IMPORTANT: This job is a PLACEHOLDER. The warm-cache architecture works
 * without it — the DB is populated on first query per LSOA. But without
 * periodic refresh, stale data persists until the next query triggers a
 * re-fetch. Implement this job when:
 *   - You need guaranteed freshness for all LSOAs
 *   - You want to pre-warm the cache for known areas
 *   - The query-driven refresh is insufficient for your use case
 *
 * TODO: Implement the following:
 *   1. Query signal_values for amenities.data where updated_at < now() - interval '24 hours'
 *   2. For each stale LSOA, fetch from Overpass (with rate limiting)
 *   3. Update signal_values with fresh data
 *   4. Log summary (refreshed count, failures, duration)
 */

import { logger } from "../tracking/structured-logger";

export async function runAmenitiesRefresh(): Promise<void> {
  logger.warn("[refresh:amenities] PLACEHOLDER — not yet implemented. See docs in this file.");
  throw new Error("amenities refresh not implemented — see placeholder documentation");
}