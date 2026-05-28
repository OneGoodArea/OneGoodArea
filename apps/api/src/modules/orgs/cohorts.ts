/* modules/orgs/cohorts — Levers (AR-198): per-org peer cohorts CRUD.

   A cohort is a named, per-org subset of LSOA codes. /v1/peers consumes
   it as a candidate filter on the existing global k-NN peer graph
   (no materialized per-org graph in v1).

   Sibling of modules/orgs/{index,bundles,presets,methodology}.ts.
   See ADR 0032. */

import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import type { PeerCohortRow } from "../../infrastructure/db/types";
import { rows } from "../../infrastructure/db/types";
import type { PeerCohort } from "@onegoodarea/contracts";
import { slugify } from "./index";

/* ── pure helpers ────────────────────────────────────────────────────── */

/** PURE: dedupe + preserve insertion order. Same pattern as
    bundles.dedupeSignalKeys — guards against an upstream caller posting
    duplicates without 500'ing the DB. */
export function dedupeGeoCodes(codes: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of codes) {
    const trimmed = c.trim();
    if (trimmed.length === 0) continue;
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

/* ── row → DTO shaper ────────────────────────────────────────────────── */

function cohortFromRow(r: PeerCohortRow): PeerCohort {
  return {
    id: r.id,
    org_id: r.org_id,
    slug: r.slug,
    name: r.name,
    geo_codes: r.geo_codes ?? [],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

/* ── reads ───────────────────────────────────────────────────────────── */

export async function listCohorts(orgId: string): Promise<PeerCohort[]> {
  const result = rows<PeerCohortRow>(await sql`
    SELECT id, org_id, slug, name, geo_codes, created_at, updated_at
      FROM peer_cohorts
     WHERE org_id = ${orgId}
     ORDER BY created_at ASC
  `);
  return result.map(cohortFromRow);
}

export async function getCohort(orgId: string, cohortId: string): Promise<PeerCohort | null> {
  const result = rows<PeerCohortRow>(await sql`
    SELECT id, org_id, slug, name, geo_codes, created_at, updated_at
      FROM peer_cohorts
     WHERE org_id = ${orgId} AND id = ${cohortId}
     LIMIT 1
  `);
  if (result.length === 0) return null;
  return cohortFromRow(result[0]);
}

/* ── writes ──────────────────────────────────────────────────────────── */

export async function createCohort(input: {
  orgId: string;
  name: string;
  slug?: string;
  geoCodes: readonly string[];
}): Promise<PeerCohort> {
  const id = generateId("coh");
  const derived = input.slug ?? slugify(input.name);
  const slug = derived || slugify(id);
  const codes = dedupeGeoCodes(input.geoCodes);
  const result = rows<PeerCohortRow>(await sql`
    INSERT INTO peer_cohorts (id, org_id, slug, name, geo_codes)
    VALUES (${id}, ${input.orgId}, ${slug}, ${input.name}, ${codes})
    RETURNING id, org_id, slug, name, geo_codes, created_at, updated_at
  `);
  if (result.length === 0) throw new Error("peer_cohorts insert returned no row");
  return cohortFromRow(result[0]);
}

/** Update a cohort. Owner-only upstream. Same read-modify-write pattern
    as scoring_presets/updatePreset — the table is tiny per-org so the
    extra SELECT is cheaper than 8 SQL branches. */
export async function updateCohort(
  orgId: string,
  cohortId: string,
  patch: { name?: string; slug?: string; geoCodes?: readonly string[] },
): Promise<PeerCohort | null> {
  const current = await getCohort(orgId, cohortId);
  if (!current) return null;
  const next = {
    name: patch.name ?? current.name,
    slug: patch.slug ?? current.slug,
    geoCodes: patch.geoCodes !== undefined ? dedupeGeoCodes(patch.geoCodes) : current.geo_codes,
  };
  const result = rows<PeerCohortRow>(await sql`
    UPDATE peer_cohorts
       SET name = ${next.name},
           slug = ${next.slug},
           geo_codes = ${next.geoCodes},
           updated_at = NOW()
     WHERE org_id = ${orgId} AND id = ${cohortId}
     RETURNING id, org_id, slug, name, geo_codes, created_at, updated_at
  `);
  if (result.length === 0) return null;
  return cohortFromRow(result[0]);
}

export async function deleteCohort(orgId: string, cohortId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM peer_cohorts
     WHERE org_id = ${orgId} AND id = ${cohortId}
     RETURNING id
  `;
  return deleted.length > 0;
}
