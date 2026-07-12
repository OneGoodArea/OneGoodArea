/* @onegoodarea/contracts — Levers (AR-197): per-org methodology pinning.

   A pin is the engine_version every response from this org will be
   stamped with when no explicit X-Engine-Version header is sent. The
   header still wins per-request. See ADR 0031. */

import { z } from "zod";

/** GET /v1/orgs/:id/methodology — `engine_version` is null when no pin
    is set (the caller will get the latest stamp on subsequent requests).
    `pinned` mirrors `engine_version !== null` and is the friendlier
    boolean for clients that just want to know "are we locked?". */
export const MethodologyPinSchema = z.object({
  engine_version: z.string().nullable(),
  pinned: z.boolean(),
}).strict();
export type MethodologyPin = z.infer<typeof MethodologyPinSchema>;

/** PUT /v1/orgs/:id/methodology — body. The server validates the value
    against SUPPORTED_ENGINE_VERSIONS (no equivalent contract-level
    enum here because the supported window evolves on the server side
    and we don't want to ship a new contracts release every time). */
export const SetMethodologyPinRequestSchema = z.object({
  engine_version: z.string().min(1),
}).strict();
export type SetMethodologyPinRequest = z.infer<typeof SetMethodologyPinRequestSchema>;

/* ────────────────────────────────────────────────────────────────────
   Methodology version registry — single source of truth imported by
   both apps/api and apps/web (AR-352).

   Two purposes:
     1. Stamp every response with the engine version that produced it
        (regulated buyers need this in their model risk register).
     2. Power the public methodology changelog page.

   Versioning convention (semver):
     - MAJOR: breaking change to dimension structure, preset set, or
              core weight (anything that would invalidate prior scores)
     - MINOR: new dimension, new data source, new preset — additive
     - PATCH: formula tuning, threshold adjustment, confidence rubric
              refinement

   Newest version is always at the END of METHODOLOGY_VERSIONS.

   Versioning is rebaselined at 1.0.0 for the public launch; pre-launch
   iterations are collapsed into this first release.
   ──────────────────────────────────────────────────────────────────── */

export interface MethodologyVersion {
  version: string;            // semver-ish, e.g. "1.0.0"
  released_at: string;        // ISO date YYYY-MM-DD
  summary: string;            // one-line summary, used in API response and changelog hero
  changes: string[];          // bullet list of changes shipped in this version
}

export const METHODOLOGY_VERSIONS: MethodologyVersion[] = [
  {
    version: "1.0.0",
    released_at: "2026-07-08",
    summary:
      "Deterministic UK area-intelligence engine. Four decision presets, five weighted dimensions each, per-dimension confidence, and full source attribution. Scores are computed from public data by fixed formulas; no AI in the scoring path.",
    changes: [
      "Deterministic scoring: the same input and engine version always produce the same score. No LLM in the scoring path.",
      "Four decision presets (moving, business, investing, research), each with five weighted dimensions summing to 100.",
      "Area-type benchmarks (urban, suburban, rural) so scores are fair across settlement types.",
      "Per-dimension confidence (0.0 to 1.0) with a plain-language reason, aggregated weight-averaged across dimensions. Property confidence is variance-aware: wide year-on-year swings cap it.",
      "Seven signal categories from public data: crime, deprivation, property, schools, amenities, transport, environment. Every value carries its source and observed period.",
      "Normalised values plus national and regional percentiles for cross-area comparison.",
      "Engine version stamped on every response and pinnable via the X-Engine-Version header for regulated buyers' model risk registers.",
    ],
  },
];

/* The list is hard-coded above with at least one entry. We assert this
   once at module load so consumers can read `METHODOLOGY_VERSION` as a
   non-nullable string under `noUncheckedIndexedAccess`. */
function getLatest(): MethodologyVersion {
  const last = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
  if (!last) {
    throw new Error("METHODOLOGY_VERSIONS must contain at least one entry");
  }
  return last;
}

/** Current methodology version. Stamped on every response. */
export const METHODOLOGY_VERSION = getLatest().version;

export function getCurrentMethodology(): MethodologyVersion {
  return getLatest();
}

export function getMethodologyByVersion(version: string): MethodologyVersion | undefined {
  return METHODOLOGY_VERSIONS.find((m) => m.version === version);
}
