/* @onegoodarea/contracts — Levers (AR-198): per-org peer cohorts.

   A cohort is a named, per-org subset of LSOA codes that scopes
   /v1/peers results. When a caller passes `cohort_id`, peers are
   filtered to the cohort's geo_codes universe. See ADR 0032. */

import { z } from "zod";

/** Cap on cohort size — keeps the request body bounded + the SQL
    array param manageable. A real-world enterprise pilot footprint
    rarely exceeds a few thousand LSOAs. */
export const COHORT_MAX_GEO_CODES = 10000;

/** A LSOA code matches roughly E01nnnnnnn (England), W01nnnnnnn (Wales),
    S01nnnnnnn (Scotland). The application layer uses a permissive
    pattern; we don't reject non-LSOA codes at the contract layer in
    case the geo spine evolves (the cohort silently won't match
    anything if the codes are bad). */
const GeoCodeSchema = z.string().min(1).max(20);

/** A peer cohort row as returned to the public API. */
export const PeerCohortSchema = z.object({
  id: z.string().min(1),
  org_id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  geo_codes: z.array(GeoCodeSchema),
  created_at: z.string(),
  updated_at: z.string(),
}).strict();
export type PeerCohort = z.infer<typeof PeerCohortSchema>;

/* ── request bodies ──────────────────────────────────────────────────── */

/** POST /v1/orgs/:id/cohorts — at least 1 geo_code, max
    COHORT_MAX_GEO_CODES. */
export const CreateCohortRequestSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  geo_codes: z.array(GeoCodeSchema).min(1).max(COHORT_MAX_GEO_CODES),
}).strict();
export type CreateCohortRequest = z.infer<typeof CreateCohortRequestSchema>;

/** PATCH /v1/orgs/:id/cohorts/:cohortId — any subset; at least one set. */
export const UpdateCohortRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  geo_codes: z.array(GeoCodeSchema).min(1).max(COHORT_MAX_GEO_CODES).optional(),
}).strict().refine(
  (b) => b.name !== undefined || b.slug !== undefined || b.geo_codes !== undefined,
  { message: "At least one of name, slug, or geo_codes must be provided." },
);
export type UpdateCohortRequest = z.infer<typeof UpdateCohortRequestSchema>;

/* ── response shapes ─────────────────────────────────────────────────── */

export const ListCohortsResponseSchema = z.array(PeerCohortSchema);
export type ListCohortsResponse = z.infer<typeof ListCohortsResponseSchema>;
