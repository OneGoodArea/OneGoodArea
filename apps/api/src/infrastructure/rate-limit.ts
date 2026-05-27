import { sql } from "./db/client";

/* Neon-backed sliding-window rate limiter. Migrated from legacy
   src/lib/rate-limit.ts. The ensureRateLimitTable() self-create is dropped:
   the migrator owns the byte-identical rate_limit_entries table + index.
   Persists across cold starts and is shared across all instances. */

interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  // Count recent requests and insert the new one in parallel
  const [countResult] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM rate_limit_entries WHERE identifier = ${identifier} AND created_at > ${windowStart}`,
    sql`INSERT INTO rate_limit_entries (identifier) VALUES (${identifier})`,
  ]);

  const count = (countResult[0].count as number) + 1; // +1 for the one we just inserted
  const resetTime = Math.ceil((Date.now() + windowMs) / 1000);

  if (count > config.max) {
    return { success: false, remaining: 0, reset: resetTime };
  }

  return { success: true, remaining: config.max - count, reset: resetTime };
}

/**
 * Build rate limit headers for the response.
 *
 * When the limit is exhausted (result.success === false), also emits a
 * `Retry-After` header with delay-seconds per RFC 7231. `result.reset` is a
 * Unix epoch in seconds, so Retry-After = max(0, ceil(reset - now_seconds)).
 */
export function rateLimitHeaders(
  limit: number,
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (!result.success) {
    const nowSeconds = Date.now() / 1000;
    const retryAfter = Math.max(0, Math.ceil(result.reset - nowSeconds));
    headers["Retry-After"] = String(retryAfter);
  }

  return headers;
}
