import type { AreaReport } from "@onegoodarea/contracts";
import { sql } from "../../infrastructure/db/client";
import {
  row,
  rows as typedRows,
  type CacheRow,
  type CountRow,
  type TotalRow,
  type AreaHitsRow,
} from "../../infrastructure/db/types";
import { logger } from "../tracking/structured-logger";

/* Read/write cache for generated reports. Migrated from the legacy
   src/lib/report-cache.ts. Behaviour-identical EXCEPT the legacy
   `ensureReportCacheTable()` self-create is dropped: in the monorepo the
   `report_cache` table (and its index) are owned by the migrator
   (infrastructure/db/schema.ts), so modules never issue DDL. The table DDL
   there is byte-identical to the legacy CREATE TABLE, so the data layer is
   unchanged. */

/* ── Types ── */

export interface CachedReport {
  report: AreaReport;
  area: string;
  score: number;
  created_at: string;
}

/* ── Cache key normalisation ── */

export function normaliseCacheKey(area: string, intent: string): string {
  const normalisedArea = area
    .toLowerCase()
    .replace(/[\s,.\-]/g, "");

  return `${normalisedArea}:${intent.toLowerCase()}`;
}

/* ── Read from cache ── */

export async function getCachedReport(
  area: string,
  intent: string,
  ttlHours: number = 24
): Promise<CachedReport | null> {
  const key = normaliseCacheKey(area, intent);

  // Opportunistic cleanup: ~1 in 50 requests
  if (Math.random() < 0.02) {
    cleanupExpiredCache(48).catch((err) =>
      logger.error("[OneGoodArea] Cache cleanup error:", err)
    );
  }

  const cacheRows = await sql`
    SELECT report, area, score, created_at
    FROM report_cache
    WHERE cache_key = ${key}
      AND created_at > NOW() - MAKE_INTERVAL(hours => ${ttlHours})
    LIMIT 1
  `;

  if (cacheRows.length === 0) return null;

  // Increment hit count (fire-and-forget)
  sql`
    UPDATE report_cache SET hit_count = hit_count + 1 WHERE cache_key = ${key}
  `.catch((err) =>
    logger.error("[OneGoodArea] Cache hit_count update error:", err)
  );

  const hit = row<CacheRow>(cacheRows[0]);
  return {
    report: (typeof hit.report === "string" ? JSON.parse(hit.report) : hit.report) as AreaReport,
    area: hit.area,
    score: hit.score,
    created_at: hit.created_at,
  };
}

/* ── Write to cache ── */

export async function setCachedReport(
  area: string,
  intent: string,
  report: AreaReport,
  score: number
): Promise<void> {
  const key = normaliseCacheKey(area, intent);

  await sql`
    INSERT INTO report_cache (cache_key, report, area, score)
    VALUES (${key}, ${JSON.stringify(report)}, ${area}, ${score})
    ON CONFLICT (cache_key) DO UPDATE SET
      report = EXCLUDED.report,
      area = EXCLUDED.area,
      score = EXCLUDED.score,
      created_at = NOW(),
      hit_count = 0
  `;
}

/* ── Admin stats ── */

export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  topCached: Array<{ area: string; hits: number }>;
}> {
  const [countResult, hitsResult, topResult] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM report_cache`,
    sql`SELECT COALESCE(SUM(hit_count), 0)::int AS total FROM report_cache`,
    sql`
      SELECT area, hit_count::int AS hits
      FROM report_cache
      ORDER BY hit_count DESC
      LIMIT 10
    `,
  ]);

  return {
    totalEntries: row<CountRow>(countResult[0]).count,
    totalHits: row<TotalRow>(hitsResult[0]).total,
    topCached: typedRows<AreaHitsRow>(topResult),
  };
}

/* ── Cleanup expired entries ── */

export async function cleanupExpiredCache(
  ttlHours: number = 48
): Promise<number> {
  const result = await sql`
    DELETE FROM report_cache
    WHERE created_at < NOW() - MAKE_INTERVAL(hours => ${ttlHours})
    RETURNING id
  `;

  const deleted = result.length;
  if (deleted > 0) {
    logger.info(`[OneGoodArea] Cache cleanup: removed ${deleted} expired entries`);
  }
  return deleted;
}
