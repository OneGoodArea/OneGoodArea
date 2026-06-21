import type { FastifyReply } from "fastify";
import { sql } from "../infrastructure/db/client";
import { rows } from "../infrastructure/db/types";
import { getBundle } from "../modules/orgs/bundles";
import { getMethodologyPin } from "../modules/orgs/methodology";
import { resolveEngineVersion } from "../modules/reports/engine-version";
import { METHODOLOGY_VERSION } from "../modules/reports/methodology";
import { logger } from "../modules/tracking/structured-logger";

/** Levers (AR-197): resolve the caller's effective org pin. Same lazy
   first-owner fallback as the bundle resolver — if the api-key row had
   `org_id = NULL` (legacy), find the caller's first-owner org and
   read its pin from there. Returns null when no pin is set (or when
   no org context is resolvable). */
export async function resolveOrgPinForCaller(
  orgId: string | null,
  userId: string,
): Promise<string | null> {
  let effectiveOrgId = orgId;
  if (!effectiveOrgId) {
    const fallback = rows<{ org_id: string }>(await sql`
      SELECT org_id FROM org_members WHERE user_id = ${userId} AND role = 'owner'
       ORDER BY joined_at ASC LIMIT 1
    `);
    effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
  }
  if (!effectiveOrgId) return null;
  return await getMethodologyPin(effectiveOrgId);
}

/** Levers (AR-197): produce the X-Engine-Version stamp for a caller.
    Returns the org's pin (if set + still supported) else
    METHODOLOGY_VERSION (latest). Used by every product endpoint that
    stamps the response header. Pure passthrough of resolveEngineVersion's
    org-pin path; no per-request header consulted (the legacy AR-131
    header path on /v1/report continues to take precedence where wired).

    Defensive: a DB hiccup on the pin lookup must not 500 the product
    endpoint. Pin is opt-in; absent it, fall back to METHODOLOGY_VERSION. */
export async function effectiveEngineVersionForCaller(
  orgId: string | null,
  userId: string,
): Promise<string> {
  let pin: string | null = null;
  try {
    pin = await resolveOrgPinForCaller(orgId, userId);
  } catch (e) {
    logger.error("[methodology] pin lookup failed; falling back to latest:", e);
    return METHODOLOGY_VERSION;
  }
  if (!pin) return METHODOLOGY_VERSION;
  const result = resolveEngineVersion(undefined, { orgPin: pin });
  return result.ok ? result.requestedVersion : METHODOLOGY_VERSION;
}

export async function resolveBundleForCaller(
  bundleId: string | undefined,
  orgId: string | null,
  userId: string,
  reply: FastifyReply,
): Promise<{ ok: true; allowed: string[] | undefined } | { ok: false }> {
  if (!bundleId) return { ok: true, allowed: undefined };
  // Legacy-key fallback: if the api-key row had org_id = NULL (pre-
  // AR-193 backfill, or a future code path that created a key without
  // setting it), look up the caller's first-owner org. Most production
  // calls skip this branch because AR-193's backfill populated every
  // existing key.
  let effectiveOrgId = orgId;
  if (!effectiveOrgId) {
    const fallback = rows<{ org_id: string }>(await sql`
      SELECT org_id FROM org_members WHERE user_id = ${userId} AND role = 'owner'
       ORDER BY joined_at ASC LIMIT 1
    `);
    effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
  }
  if (!effectiveOrgId) {
    reply.code(422).send({
      error: "Cannot apply bundle filter: caller has no resolvable org context.",
      code: "no_org_context",
    });
    return { ok: false };
  }
  const bundle = await getBundle(effectiveOrgId, bundleId);
  if (!bundle) {
    reply.code(404).send({ error: "Bundle not found in your org." });
    return { ok: false };
  }
  return { ok: true, allowed: bundle.signal_keys };
}
