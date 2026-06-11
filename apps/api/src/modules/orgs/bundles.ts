/* modules/orgs/bundles — Levers (AR-195): per-org signal bundle CRUD +
   plan-signal extraction + the pure filter used by /v1/area / /v1/areas
   / /v1/query when ?bundle= is set.

   Sibling of modules/orgs/index.ts (orgs CRUD). Together they own the
   tenancy-config slice of Levers. See ADR 0029. */

import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import type { SignalBundleRow } from "../../infrastructure/db/types";
import { rows } from "../../infrastructure/db/types";
import type { SignalBundle, QueryPlan } from "@onegoodarea/contracts";
import { SUPPORTED_SIGNALS } from "../intelligence/planner";
import { slugify } from "./index";

/* ── pure helpers ────────────────────────────────────────────────────── */

/** PURE: validate a list of proposed signal_keys against the active
    SUPPORTED_SIGNALS taxonomy. Returns the set of disallowed keys
    (empty array on success). Application enforces; DB stores the
    raw TEXT[] (taxonomy evolves). */
export function findUnknownSignalKeys(keys: readonly string[]): string[] {
  const allowed = new Set<string>(SUPPORTED_SIGNALS);
  const unknown: string[] = [];
  for (const k of keys) {
    if (!allowed.has(k)) unknown.push(k);
  }
  return unknown;
}

/** PURE: dedupe + preserve insertion order. The DB stores keys as a
    TEXT[]; we don't enforce uniqueness in the schema so a malformed
    write doesn't 500 — we tidy at the application boundary. */
export function dedupeSignalKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** PURE: filter an array of Signal-shaped objects to those whose `.key`
    is in the bundle's whitelist. If `allowed` is undefined the original
    array is returned unchanged (no bundle = no filter). */
export function filterSignalsByBundle<T extends { key: string }>(
  signals: T[],
  allowed: string[] | undefined,
): T[] {
  if (!allowed) return signals;
  const set = new Set<string>(allowed);
  return signals.filter((s) => set.has(s.key));
}

/** PURE: extract every signal key a plan REFERENCES, for bundle
    gating on /v1/query. get_area + score_area don't reference specific
    signal keys (they return all signals or compute a score over the
    full engine), so they contribute zero keys — the bundle still
    affects the eventual response via downstream filters but no plan-
    level 422 fires. */
export function extractSignalKeysFromPlan(plan: QueryPlan): string[] {
  switch (plan.op) {
    case "rank_areas": {
      if ("signal" in plan.params) {
        // Singular shape.
        return [plan.params.signal];
      }
      // Compound shape.
      return plan.params.signals.map((s) => s.key);
    }
    case "find_peers": {
      // signals[] is OPTIONAL — if omitted, the executor uses every
      // normalized signal the target has. Bundle gating at the plan
      // level only applies when the caller explicitly listed signals.
      return plan.params.signals ?? [];
    }
    case "find_insights":
      return [plan.params.signal_key];
    case "find_forecast":
      return [plan.params.signal_key];
    case "get_area":
    case "score_area":
      return [];
  }
}

/** PURE: of the signal keys referenced by a plan, return those NOT in
    the bundle's whitelist. Empty array = plan is allowed. */
export function planSignalsOutsideBundle(plan: QueryPlan, allowed: string[]): string[] {
  const referenced = extractSignalKeysFromPlan(plan);
  const set = new Set<string>(allowed);
  return referenced.filter((k) => !set.has(k));
}

/* ── row → DTO shaper ────────────────────────────────────────────────── */

function bundleFromRow(r: SignalBundleRow): SignalBundle {
  return {
    id: r.id,
    org_id: r.org_id,
    slug: r.slug,
    name: r.name,
    signal_keys: r.signal_keys ?? [],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

/* ── reads ───────────────────────────────────────────────────────────── */

/** List all bundles for an org. Caller membership is verified at the
    endpoint layer. */
export async function listBundles(orgId: string): Promise<SignalBundle[]> {
  const result = rows<SignalBundleRow>(await sql`
    SELECT id, org_id, slug, name, signal_keys, created_at, updated_at
      FROM signal_bundles
     WHERE org_id = ${orgId}
     ORDER BY created_at ASC
  `);
  return result.map(bundleFromRow);
}

/** Fetch one bundle, scoped to its org (so callers can't read across
    orgs by guessing a bundle id). Matches on EITHER id or slug —
    the dashboard surfaces the slug as the public identifier (it's
    what shows on the bundle row and what the "How bundles work" copy
    tells customers to pass in `?bundle=`), but legacy internal callers
    pass the bndl_xxxxx id. Both work; both are scoped by org. Returns
    null if neither matches. (AR-274 fix: pre-274 this only matched
    by id, so passing the user-facing slug 404'd silently — exactly
    the trap the engine-gap tests caught.) */
export async function getBundle(orgId: string, bundleIdOrSlug: string): Promise<SignalBundle | null> {
  const result = rows<SignalBundleRow>(await sql`
    SELECT id, org_id, slug, name, signal_keys, created_at, updated_at
      FROM signal_bundles
     WHERE org_id = ${orgId} AND (id = ${bundleIdOrSlug} OR slug = ${bundleIdOrSlug})
     LIMIT 1
  `);
  if (result.length === 0) return null;
  return bundleFromRow(result[0]);
}

/* ── writes ──────────────────────────────────────────────────────────── */

/** Create a bundle. Owner-only — caller role is checked upstream.
    Returns the created bundle. Caller should have already validated
    `signal_keys` via `findUnknownSignalKeys`. */
export async function createBundle(input: {
  orgId: string;
  name: string;
  slug?: string;
  signalKeys: readonly string[];
}): Promise<SignalBundle> {
  const id = generateId("bndl");
  const derived = input.slug ?? slugify(input.name);
  const slug = derived || slugify(id);
  const keys = dedupeSignalKeys(input.signalKeys);
  const result = rows<SignalBundleRow>(await sql`
    INSERT INTO signal_bundles (id, org_id, slug, name, signal_keys)
    VALUES (${id}, ${input.orgId}, ${slug}, ${input.name}, ${keys})
    RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
  `);
  if (result.length === 0) throw new Error("signal_bundles insert returned no row");
  return bundleFromRow(result[0]);
}

/** Update a bundle — any subset of {name, slug, signal_keys}. Owner-only
    upstream. Returns the updated bundle or null if not found. */
export async function updateBundle(
  orgId: string,
  bundleId: string,
  patch: { name?: string; slug?: string; signalKeys?: readonly string[] },
): Promise<SignalBundle | null> {
  // 8 branches (each combination). The Neon tagged template binds are
  // typed so we can't compose dynamically — explicit branching keeps the
  // SQL readable. updated_at always bumps.
  let result: SignalBundleRow[] = [];
  const keys = patch.signalKeys ? dedupeSignalKeys(patch.signalKeys) : undefined;
  const set = {
    name: patch.name !== undefined,
    slug: patch.slug !== undefined,
    keys: keys !== undefined,
  };
  if (set.name && set.slug && set.keys) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET name = ${patch.name!}, slug = ${patch.slug!}, signal_keys = ${keys!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.name && set.slug) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET name = ${patch.name!}, slug = ${patch.slug!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.name && set.keys) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET name = ${patch.name!}, signal_keys = ${keys!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.slug && set.keys) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET slug = ${patch.slug!}, signal_keys = ${keys!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.name) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET name = ${patch.name!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.slug) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET slug = ${patch.slug!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else if (set.keys) {
    result = rows<SignalBundleRow>(await sql`
      UPDATE signal_bundles SET signal_keys = ${keys!}, updated_at = NOW()
       WHERE org_id = ${orgId} AND id = ${bundleId}
       RETURNING id, org_id, slug, name, signal_keys, created_at, updated_at
    `);
  } else {
    // Zod refines this away; defensive.
    return null;
  }
  if (result.length === 0) return null;
  return bundleFromRow(result[0]);
}

/** Delete a bundle. Owner-only upstream. Returns true if a row was
    removed. Org scope on the WHERE prevents cross-org deletes. */
export async function deleteBundle(orgId: string, bundleId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM signal_bundles
     WHERE org_id = ${orgId} AND id = ${bundleId}
     RETURNING id
  `;
  return deleted.length > 0;
}
