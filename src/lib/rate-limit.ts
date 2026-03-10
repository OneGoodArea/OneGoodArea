/**
 * Lightweight in-memory rate limiter using a sliding window.
 * Each Vercel serverless instance gets its own Map, which provides
 * basic per-instance protection without external dependencies.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix timestamp (seconds) when the oldest request in the window expires */
  reset: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check and consume a rate limit token for the given identifier.
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Periodic cleanup
  cleanup(windowMs);

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.max) {
    // Rate limited - calculate when the earliest request expires
    const oldest = entry.timestamps[0];
    const resetMs = oldest + windowMs;
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(resetMs / 1000),
    };
  }

  // Allow the request
  entry.timestamps.push(now);
  const remaining = config.max - entry.timestamps.length;
  const resetTime = entry.timestamps[0] + windowMs;

  return {
    success: true,
    remaining,
    reset: Math.ceil(resetTime / 1000),
  };
}

/**
 * Build rate limit headers for the response.
 */
export function rateLimitHeaders(
  limit: number,
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
