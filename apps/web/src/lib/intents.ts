import type { Intent } from "@/lib/types";

/* AR-149: canonical intent → B2B workflow label mapping.
 *
 * The API enum names (moving / business / investing / research) are
 * historical: they came from the v1 consumer product. We keep them for
 * backwards compatibility on the API surface and in the database; renaming
 * would be a breaking change for any caller parsing `response.intent` and
 * would conflict with AR-131's v2.x equivalence promise on engine_version.
 *
 * Internally and in any user-visible surface (dashboard, report view,
 * marketing pages, emails), use the workflow labels in INTENT_WORKFLOW
 * below. They map each historical enum to the regulated B2B workflow it
 * actually serves:
 *
 *   moving    → Origination       (residential mortgage origination)
 *   business  → Site selection    (retail / F&B / CRE site selection)
 *   investing → Investment        (BTL / BTR / investment committee)
 *   research  → Reference         (neutral baseline for analysts)
 *
 * Per AR-149, the homepage intents section and the OpenAPI spec also use
 * these workflow labels as the customer-facing names. The enum names stay
 * in the API contract only.
 *
 * If a v3.0.0 engine bump ever happens, that would be the moment to migrate
 * the enum strings themselves to the workflow names. Not before. */

export const INTENT_WORKFLOW: Record<Intent, string> = {
  moving: "Origination",
  business: "Site selection",
  investing: "Investment",
  research: "Reference",
};

/** Long-form workflow description, for hover/tooltip surfaces. */
export const INTENT_WORKFLOW_DESCRIPTION: Record<Intent, string> = {
  moving: "Residential mortgage origination scoring. Used by lenders for portfolio screening, origination decisions, and demand-side risk enrichment.",
  business: "Commercial site selection. Used by retail, F&B, and CRE teams scoring candidate locations across thousands of postcodes.",
  investing: "Residential property investment screening. Used by BTL operators, BTR funds, and investment committees evaluating acquisitions.",
  research: "Neutral baseline scoring for analysts, planners, and researchers. Equal weight across the five dimensions.",
};

/** Returns the customer-facing workflow label for an intent enum. Falls back
 *  to the raw enum string for unknown values (forward-compatible if a new
 *  enum value is ever added without a matching label). */
export function intentLabel(intent: Intent | string | null | undefined): string {
  if (!intent) return "";
  return INTENT_WORKFLOW[intent as Intent] ?? intent;
}
