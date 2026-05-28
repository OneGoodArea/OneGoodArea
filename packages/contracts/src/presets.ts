/* @onegoodarea/contracts — Levers (AR-196): custom scoring presets.

   A preset is a per-org saved {base_preset, weights} bundle that a
   caller references on POST /v1/score via `preset_id`. The base_preset
   selects the dimension set (one of the four hardcoded intents); the
   weights override the aggregation. The deterministic scoring engine
   is reused UNTOUCHED — Levers config sits on top.

   See ADR 0030. */

import { z } from "zod";

/** The four base presets that select a dimension set. Mirrors the Intent
    enum in the report shape — keeping it duplicated here so this file
    doesn't pull in the report-side types just for the enum. Drift is
    guarded by the SCORING_BASE_PRESETS test. */
export const SCORING_BASE_PRESETS = ["moving", "business", "investing", "research"] as const;
export const ScoringBasePresetSchema = z.enum(SCORING_BASE_PRESETS);
export type ScoringBasePreset = z.infer<typeof ScoringBasePresetSchema>;

/** A weights map: dimension_key -> positive number. Validation against
    the dimension set for a given base_preset happens at the application
    layer (PRESET_DIMENSION_KEYS in apps/api/src/modules/scoring/score.ts)
    because the dimension catalog isn't part of the public contract. */
const WeightsRecordSchema = z.record(z.string().min(1), z.number().positive());

/** A scoring preset row as returned to the public API. */
export const ScoringPresetSchema = z.object({
  id: z.string().min(1),
  org_id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  base_preset: ScoringBasePresetSchema,
  weights: WeightsRecordSchema,
  created_at: z.string(),
  updated_at: z.string(),
}).strict();
export type ScoringPreset = z.infer<typeof ScoringPresetSchema>;

/* ── request bodies ──────────────────────────────────────────────────── */

/** POST /v1/orgs/:id/presets — name + base_preset + non-empty weights. */
export const CreatePresetRequestSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  base_preset: ScoringBasePresetSchema,
  weights: WeightsRecordSchema.refine((w) => Object.keys(w).length > 0, {
    message: "weights cannot be empty",
  }),
}).strict();
export type CreatePresetRequest = z.infer<typeof CreatePresetRequestSchema>;

/** PATCH /v1/orgs/:id/presets/:presetId — any subset; at least one set.
    Changing base_preset re-validates weights against the new dimension
    set at the application layer (the contract layer can't know which
    dimension keys are valid for a given base_preset). */
export const UpdatePresetRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  base_preset: ScoringBasePresetSchema.optional(),
  weights: WeightsRecordSchema.refine((w) => Object.keys(w).length > 0, {
    message: "weights cannot be empty",
  }).optional(),
}).strict().refine(
  (b) =>
    b.name !== undefined ||
    b.slug !== undefined ||
    b.base_preset !== undefined ||
    b.weights !== undefined,
  { message: "At least one of name, slug, base_preset, or weights must be provided." },
);
export type UpdatePresetRequest = z.infer<typeof UpdatePresetRequestSchema>;

/* ── response shapes ─────────────────────────────────────────────────── */

export const ListPresetsResponseSchema = z.array(ScoringPresetSchema);
export type ListPresetsResponse = z.infer<typeof ListPresetsResponseSchema>;
