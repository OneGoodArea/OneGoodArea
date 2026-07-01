/* Playground rate limits.

   Three tiers, evaluated in order (cheapest check first):
     1. Per-cookie: total calls + NL calls, tracked in the signed cookie
        itself (no DB round-trip). Cheap. First to catch.
     2. Per-IP daily: DB-backed via existing rate_limit_entries table.
        Prevents cookie rotation.
     3. Global daily: DB-backed. Hard cost ceiling; alerting-friendly.

   The per-cookie counters live on the PlaygroundSession object (see
   session.ts). The two DB-backed tiers use the existing rateLimit()
   helper. */

import { rateLimit } from "../../infrastructure/rate-limit";
import type { PlaygroundSession } from "./session";

/* Defaults chosen for a public API-infrastructure product. Every value
   is env-tunable so we can tighten if abuse spikes without a redeploy. */
const DEFAULT_COOKIE_TOTAL = 30;
const DEFAULT_COOKIE_NL = 3;
const DEFAULT_IP_DAILY = 60;
const DEFAULT_GLOBAL_DAILY = 5000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface PlaygroundLimitCheckResult {
  ok: boolean;
  reason?: "cookie_total" | "cookie_nl" | "ip_daily" | "global_daily";
  message?: string;
  /** Suggested Retry-After seconds. Present when ok is false. */
  retry_after?: number;
}

/** Check ALL rate-limit tiers. Returns first failure or ok=true. Never
    throws; DB errors bubble up as ok=false with reason "global_daily"
    (safest fallback: assume we're at cap). */
export async function checkPlaygroundLimits(opts: {
  session: PlaygroundSession;
  ip: string | null;
  isNlCall: boolean;
}): Promise<PlaygroundLimitCheckResult> {
  const cookieTotal = envInt("PLAYGROUND_COOKIE_TOTAL", DEFAULT_COOKIE_TOTAL);
  const cookieNl = envInt("PLAYGROUND_COOKIE_NL", DEFAULT_COOKIE_NL);
  const ipDaily = envInt("PLAYGROUND_IP_DAILY", DEFAULT_IP_DAILY);
  const globalDaily = envInt("PLAYGROUND_GLOBAL_DAILY", DEFAULT_GLOBAL_DAILY);
  const dayWindow = 60 * 60 * 24;

  /* Tier 1: cookie. Cheapest — no I/O. */
  if (opts.session.tc >= cookieTotal) {
    return {
      ok: false,
      reason: "cookie_total",
      message: `Session limit reached (${cookieTotal} calls). Sign up for a free sandbox key for unlimited use.`,
    };
  }
  if (opts.isNlCall && opts.session.nc >= cookieNl) {
    return {
      ok: false,
      reason: "cookie_nl",
      message: `Session NL query limit reached (${cookieNl}). Try the direct endpoints or sign up for unlimited.`,
    };
  }

  /* Tier 2: per-IP daily. Best-effort — if the IP is null (unusual on
     prod through Vercel + Render) we skip this tier rather than fail-
     closed. */
  if (opts.ip) {
    try {
      const result = await rateLimit(`playground:ip:${opts.ip}`, {
        max: ipDaily,
        windowSeconds: dayWindow,
      });
      if (!result.success) {
        return {
          ok: false,
          reason: "ip_daily",
          message: `Daily IP limit reached (${ipDaily} calls per 24h). Try again tomorrow or sign up.`,
          retry_after: Math.max(0, Math.ceil(result.reset - Date.now() / 1000)),
        };
      }
    } catch {
      // Non-fatal; fall through to global tier so we don't block a legit
      // user because of a transient rate_limit_entries write failure.
    }
  }

  /* Tier 3: global daily. Hard cost ceiling. Fail-CLOSED on DB error —
     we'd rather deny during an outage than let costs spike unbounded. */
  try {
    const result = await rateLimit("playground:global", {
      max: globalDaily,
      windowSeconds: dayWindow,
    });
    if (!result.success) {
      return {
        ok: false,
        reason: "global_daily",
        message: "Playground is at its daily global cap. Sign up for a sandbox key to keep exploring.",
        retry_after: Math.max(0, Math.ceil(result.reset - Date.now() / 1000)),
      };
    }
  } catch {
    return {
      ok: false,
      reason: "global_daily",
      message: "Playground temporarily unavailable. Please retry in a moment.",
    };
  }

  return { ok: true };
}
