import { sql } from "@/lib/db";
import { AreaReport } from "@/lib/types";
import { row, rows as typedRows, CacheRow, CountRow, TotalRow, AreaHitsRow } from "@/lib/db-types";

/* ── Types ── */

export interface CachedReport {
  report: AreaReport;
  area: string;
  score: number;
  created_at: string;
}

/* ── Table setup ── */

let cacheTableReady = false;

export async function ensureReportCacheTable(): Promise<void> {
  if (cacheTableReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS report_cache (
      id SERIAL PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      report JSONB NOT NULL,
      area TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      hit_count INTEGER DEFAULT 0
    )
  `;

  // Index on cache_key for fast lookups (idempotent)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_report_cache_key ON report_cache (cache_key)
  `;

  cacheTableReady = true;
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
      console.error("[AreaIQ] Cache cleanup error:", err)
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
    console.error("[AreaIQ] Cache hit_count update error:", err)
  );

  const hit = row<CacheRow>(cacheRows[0]);
  return {
    report: (typeof hit.report === "string" ? JSON.parse(hit.report) : hit.report) as unknown as AreaReport,
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
    console.log(`[AreaIQ] Cache cleanup: removed ${deleted} expired entries`);
  }
  return deleted;
}
