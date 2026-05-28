/* modules/orgs/presets — Levers (AR-196): per-org custom scoring presets.

   A preset is a saved {base_preset, weights} bundle. POST /v1/score
   accepts `preset_id` which resolves to one of these rows. The base_preset
   selects the dimension set (PRESET_DIMENSION_KEYS in scoring/score.ts);
   the weights override the aggregation. The deterministic scoring engine
   is reused untouched.

   Sibling of modules/orgs/index.ts (orgs) + bundles.ts (signal bundles).
   See ADR 0030. */

import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import type { ScoringPresetRow } from "../../infrastructure/db/types";
import { rows } from "../../infrastructure/db/types";
import type { ScoringPreset, ScoringBasePreset } from "@onegoodarea/contracts";
import { PRESET_DIMENSION_KEYS } from "../scoring";
import { slugify } from "./index";

/* ── pure helpers ────────────────────────────────────────────────────── */

/** PURE: validate a weights map against the dimension set of a given
    base_preset. Returns the set of disallowed keys (empty array on
    success). The application enforces this on both create and update —
    a weights map referencing dimensions the base_preset doesn't expose
    would silently aggregate to nothing in the engine and surprise the
    customer. */
export function findUnknownWeightKeys(
  basePreset: ScoringBasePreset,
  weights: Record<string, number>,
): string[] {
  const valid = new Set<string>(PRESET_DIMENSION_KEYS[basePreset]);
  const out: string[] = [];
  for (const key of Object.keys(weights)) {
    if (!valid.has(key)) out.push(key);
  }
  return out;
}

/* ── row → DTO shaper ────────────────────────────────────────────────── */

function presetFromRow(r: ScoringPresetRow): ScoringPreset {
  // Defensive coercion: weights round-trips through JSONB; in tests where
  // a raw mock returns a string we'd want to fail loudly rather than
  // surface a bad type. In production the Neon driver parses JSONB.
  const weights = (r.weights ?? {}) as Record<string, number>;
  return {
    id: r.id,
    org_id: r.org_id,
    slug: r.slug,
    name: r.name,
    base_preset: r.base_preset as ScoringBasePreset,
    weights,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

/* ── reads ───────────────────────────────────────────────────────────── */

/** List all scoring presets for an org. Caller membership is checked at
    the endpoint layer. */
export async function listPresets(orgId: string): Promise<ScoringPreset[]> {
  const result = rows<ScoringPresetRow>(await sql`
    SELECT id, org_id, slug, name, base_preset, weights, created_at, updated_at
      FROM scoring_presets
     WHERE org_id = ${orgId}
     ORDER BY created_at ASC
  `);
  return result.map(presetFromRow);
}

/** Fetch one preset, scoped to its org (so callers can't read across
    orgs by guessing a preset id). Returns null if not found. */
export async function getPreset(orgId: string, presetId: string): Promise<ScoringPreset | null> {
  const result = rows<ScoringPresetRow>(await sql`
    SELECT id, org_id, slug, name, base_preset, weights, created_at, updated_at
      FROM scoring_presets
     WHERE org_id = ${orgId} AND id = ${presetId}
     LIMIT 1
  `);
  if (result.length === 0) return null;
  return presetFromRow(result[0]);
}

/* ── writes ──────────────────────────────────────────────────────────── */

/** Create a preset. Owner-only — caller role is checked upstream.
    Caller should have already validated weights via `findUnknownWeightKeys`. */
export async function createPreset(input: {
  orgId: string;
  name: string;
  slug?: string;
  basePreset: ScoringBasePreset;
  weights: Record<string, number>;
}): Promise<ScoringPreset> {
  const id = generateId("spr");
  const derived = input.slug ?? slugify(input.name);
  const slug = derived || slugify(id);
  const result = rows<ScoringPresetRow>(await sql`
    INSERT INTO scoring_presets (id, org_id, slug, name, base_preset, weights)
    VALUES (${id}, ${input.orgId}, ${slug}, ${input.name}, ${input.basePreset}, ${JSON.stringify(input.weights)}::jsonb)
    RETURNING id, org_id, slug, name, base_preset, weights, created_at, updated_at
  `);
  if (result.length === 0) throw new Error("scoring_presets insert returned no row");
  return presetFromRow(result[0]);
}

/** Update a preset. Owner-only upstream. Any subset of fields; at least
    one must be set (refined by the Zod contract). Returns the updated
    row or null if not found. */
export async function updatePreset(
  orgId: string,
  presetId: string,
  patch: {
    name?: string;
    slug?: string;
    basePreset?: ScoringBasePreset;
    weights?: Record<string, number>;
  },
): Promise<ScoringPreset | null> {
  // 16 combinations of {name, slug, basePreset, weights} are possible;
  // most updates change one or two fields. To keep the SQL readable
  // (Neon tagged-template binds are typed, no dynamic composition), we
  // do a read-modify-write inside one round-trip: fetch the current
  // row, apply the patch in JS, write back. The whole table is tiny
  // per-org so the extra SELECT is cheap.
  const current = await getPreset(orgId, presetId);
  if (!current) return null;
  const next = {
    name: patch.name ?? current.name,
    slug: patch.slug ?? current.slug,
    basePreset: (patch.basePreset ?? current.base_preset) as ScoringBasePreset,
    weights: patch.weights ?? current.weights,
  };
  const result = rows<ScoringPresetRow>(await sql`
    UPDATE scoring_presets
       SET name = ${next.name},
           slug = ${next.slug},
           base_preset = ${next.basePreset},
           weights = ${JSON.stringify(next.weights)}::jsonb,
           updated_at = NOW()
     WHERE org_id = ${orgId} AND id = ${presetId}
     RETURNING id, org_id, slug, name, base_preset, weights, created_at, updated_at
  `);
  if (result.length === 0) return null;
  return presetFromRow(result[0]);
}

/** Delete a preset. Owner-only upstream. Org scope on the WHERE prevents
    cross-org deletes. */
export async function deletePreset(orgId: string, presetId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM scoring_presets
     WHERE org_id = ${orgId} AND id = ${presetId}
     RETURNING id
  `;
  return deleted.length > 0;
}
