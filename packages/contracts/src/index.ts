/* @onegoodarea/contracts — the shared type surface for apps/web + apps/api.

   Phase 0 scaffold (separation impl plan): the canonical Intent type and the
   core query shape, so frontend and backend share ONE definition instead of
   drifting. Zod runtime schemas + the full DTO set land in Phase 2.

   Hard rule for this package: types + pure helpers only. No DB drivers, no
   secrets, no Node-only APIs — it is imported by the browser bundle. */

/** The four scoring intents the engine supports. Canonical source of truth. */
export const INTENTS = ["moving", "business", "investing", "research"] as const;
export type Intent = (typeof INTENTS)[number];

/** Runtime guard — use at trust boundaries (API input, query params). */
export function isIntent(value: unknown): value is Intent {
  return typeof value === "string" && (INTENTS as readonly string[]).includes(value);
}

/** A single-area scoring query (the shape behind POST /v1/report today). */
export interface AreaQuery {
  /** Free-text area or postcode, e.g. "M1 1AE" or "Clapham". */
  area: string;
  intent: Intent;
}
