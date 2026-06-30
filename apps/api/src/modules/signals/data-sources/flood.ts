import type { FloodRiskData, FloodWarning } from "../inputs";
import { logger } from "../../tracking/structured-logger";

/* Environment Agency flood lookups (areas + active warnings).

   AR-396: this was the latency tail behind /v1/score's 3-4s wall time
   (AR-394 instrumentation captured 3206ms on M1 1AE while every other
   source resolved in &lt;800ms). Two layered fixes here:

     1. Bounded TTL cache (5 min) keyed by rounded (lat, lng).
        EA flood AREAS update weekly at most; live WARNINGS update at
        most hourly. A 5-min TTL is safe for both and turns the hot
        path into a single-digit-ms lookup. LRU cap prevents memory
        growth across long-running Render instances.
     2. Timeout tightened from 10s to 5s. The EA API either responds
        in 1-3s or hangs; 10s was theoretical headroom we never used.
        On timeout we return null (graceful degrade), same as before.

   Long-term: persist flood to the signal store via a refresh job
   (the same pattern as crime/deprivation/property). Out of scope
   here; this is the smallest fix that closes audit finding #6.

   Coord rounding: 3 decimal places = ~110m precision. Two postcodes
   inside the same LSOA round to the same key, so the cache amortizes
   across an entire LSOA without leaking precision past what EA's
   ?dist=3km / ?dist=5km radius queries already smear. */

const FLOOD_TIMEOUT_MS = 5000;
const FLOOD_CACHE_TTL_MS = 5 * 60 * 1000;
const FLOOD_CACHE_MAX = 1000;
const FLOOD_COORD_PRECISION = 1000; // 3 decimal places

interface FloodArea {
  label: string;
  riverOrSea: string;
}

interface CacheEntry {
  value: FloodRiskData | null;
  expires_at: number;
}

/* Module-scoped insertion-ordered Map. JS Maps iterate in insertion
   order, so the oldest entry is always Map.keys().next().value — a
   correct LRU when paired with "delete on hit + reinsert" below.
   Exposed via clearFloodCache() for tests. */
const cache = new Map<string, CacheEntry>();

export function clearFloodCache(): void {
  cache.clear();
}

function cacheKey(lat: number, lng: number): string {
  const rLat = Math.round(lat * FLOOD_COORD_PRECISION) / FLOOD_COORD_PRECISION;
  const rLng = Math.round(lng * FLOOD_COORD_PRECISION) / FLOOD_COORD_PRECISION;
  return `${rLat},${rLng}`;
}

function cacheGet(key: string, now: number): FloodRiskData | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires_at <= now) {
    cache.delete(key);
    return undefined;
  }
  // LRU touch: re-insert to push to the most-recent end.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: FloodRiskData | null, now: number): void {
  if (cache.size >= FLOOD_CACHE_MAX && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires_at: now + FLOOD_CACHE_TTL_MS });
}

export async function getFloodRisk(lat: number, lng: number): Promise<FloodRiskData | null> {
  const now = Date.now();
  const key = cacheKey(lat, lng);
  const cached = cacheGet(key, now);
  if (cached !== undefined) return cached;

  try {
    const [areasRes, warningsRes] = await Promise.all([
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=3`,
        { signal: AbortSignal.timeout(FLOOD_TIMEOUT_MS) }
      ),
      fetch(
        `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${lat}&long=${lng}&dist=5`,
        { signal: AbortSignal.timeout(FLOOD_TIMEOUT_MS) }
      ),
    ]);

    let floodAreas: FloodArea[] = [];
    let activeWarnings: FloodWarning[] = [];

    if (areasRes.ok) {
      const areasData = (await areasRes.json()) as { items?: FloodArea[] };
      floodAreas = areasData.items || [];
    }

    if (warningsRes.ok) {
      const warningsData = (await warningsRes.json()) as {
        items?: { description?: string; severity?: string; severityLevel?: number; message?: string }[];
      };
      activeWarnings = (warningsData.items || []).map(
        (w: { description?: string; severity?: string; severityLevel?: number; message?: string }) => ({
          description: w.description || "",
          severity: w.severity || "Unknown",
          severityLevel: w.severityLevel || 4,
          message: w.message || "",
        })
      );
    }

    const rivers = [
      ...new Set(
        floodAreas
          .map((a) => a.riverOrSea)
          .filter(Boolean)
      ),
    ];

    const data: FloodRiskData = {
      flood_areas_nearby: floodAreas.length,
      rivers_at_risk: rivers,
      active_warnings: activeWarnings,
    };
    cacheSet(key, data, now);
    return data;
  } catch (err) {
    /* Cache the null too so a sustained EA outage doesn't keep
       paying the 5s timeout per request. Same TTL, so the EA API
       gets a retry every 5 minutes. */
    logger.warn(`[flood] EA API failed for (${lat}, ${lng}); caching null for ${FLOOD_CACHE_TTL_MS / 1000}s`, { error: err });
    cacheSet(key, null, now);
    return null;
  }
}

export function formatFloodRiskForPrompt(data: FloodRiskData): string {
  const lines = [
    `FLOOD RISK DATA (Source: Environment Agency):`,
    `Flood risk areas within 3km: ${data.flood_areas_nearby}`,
  ];

  if (data.rivers_at_risk.length > 0) {
    lines.push(`Water bodies posing flood risk: ${data.rivers_at_risk.join(", ")}`);
  } else {
    lines.push(`No significant flood risk water bodies identified nearby`);
  }

  if (data.active_warnings.length > 0) {
    lines.push("");
    lines.push(`ACTIVE FLOOD WARNINGS (${data.active_warnings.length}):`);
    for (const w of data.active_warnings) {
      lines.push(`  - [${w.severity}] ${w.description}`);
    }
  } else {
    lines.push(`Active flood warnings: None`);
  }

  const riskLevel =
    data.active_warnings.some((w) => w.severityLevel <= 2)
      ? "Elevated; active warnings in force"
      : data.flood_areas_nearby > 5
        ? "Moderate; multiple flood risk zones nearby"
        : data.flood_areas_nearby > 0
          ? "Low; some flood risk zones exist nearby"
          : "Very Low; no flood risk zones identified";

  lines.push(`Overall flood risk assessment: ${riskLevel}`);

  return lines.join("\n");
}
