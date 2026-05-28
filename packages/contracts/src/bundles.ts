/* @onegoodarea/contracts — Levers (AR-195): custom signal bundles.

   A bundle is a named per-org whitelist of signal keys. Callers opt-in
   to the whitelist by passing `?bundle=<id>` on /v1/area / /v1/areas
   /v1/query — absent the param, behavior is unchanged (full taxonomy).

   See ADR 0029. */

import { z } from "zod";

/** A bundle row as returned to the public API. `signal_keys` is the
    canonical whitelist — every key here is a real key from the active
    SUPPORTED_SIGNALS taxonomy (validated at write time, not enforced
    at the schema level because the taxonomy evolves). */
export const SignalBundleSchema = z.object({
  id: z.string().min(1),
  org_id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  signal_keys: z.array(z.string().min(1)),
  created_at: z.string(),
  updated_at: z.string(),
}).strict();
export type SignalBundle = z.infer<typeof SignalBundleSchema>;

/* ── request bodies ──────────────────────────────────────────────────── */

/** POST /v1/orgs/:id/bundles — at least 1 signal key, max 100 to keep
    the request body bounded. Server validates every key against the
    SUPPORTED_SIGNALS taxonomy and rejects unknowns with 400. */
export const CreateBundleRequestSchema = z.object({
  name: z.string().min(1).max(200),
  /** Optional explicit slug. If omitted, derived from name. */
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  signal_keys: z.array(z.string().min(1)).min(1).max(100),
}).strict();
export type CreateBundleRequest = z.infer<typeof CreateBundleRequestSchema>;

/** PATCH /v1/orgs/:id/bundles/:bundleId — all fields optional; at least
    one must be set. Same validation: signal_keys go through taxonomy
    check; rename is a free-text update. */
export const UpdateBundleRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  signal_keys: z.array(z.string().min(1)).min(1).max(100).optional(),
}).strict().refine(
  (b) => b.name !== undefined || b.slug !== undefined || b.signal_keys !== undefined,
  { message: "At least one of name, slug, or signal_keys must be provided." },
);
export type UpdateBundleRequest = z.infer<typeof UpdateBundleRequestSchema>;

/* ── response shapes ─────────────────────────────────────────────────── */

export const ListBundlesResponseSchema = z.array(SignalBundleSchema);
export type ListBundlesResponse = z.infer<typeof ListBundlesResponseSchema>;
