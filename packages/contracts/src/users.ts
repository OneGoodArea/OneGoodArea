/* @onegoodarea/contracts — User identity + onboarding-derived fields.

   AR-218 (Dashboard redesign Epic AR-217): the `/welcome` flow persists three
   onboarding signals on the users row:
   - `intent` — which of the 5 ICPs the user is here for (Step 1)
   - `signup_source` — the marketing surface that referred them via `?from=`
   - `role_preference` — how they'll use the product (Step 3); determines
     which surface the dashboard lands them on (engineer → /api-usage,
     analyst → /dashboard/intelligence, explorer → /dashboard)

   All three are nullable. `intent` + `role_preference` are validated
   against fixed enums at write time (Zod here, enforced by /welcome
   steps + any future admin write paths). `signup_source` is free-form:
   it's the marketing surface slug (e.g. "lenders", "proptech",
   "homepage"), data-driven by the marketing pages and not worth pinning
   at the contract layer.

   Hard rule for this file (same as the package): Zod schemas + pure
   types only. No DB drivers, no Node-only APIs — imported by the
   browser bundle. */

import { z } from "zod";

/** The five ICPs the marketing site routes from. Mirrors the cards on
    /for/* and the Products mega-menu. Canonical list (don't add an ICP
    here without coordinating with the marketing pages + the /welcome
    intent picker). */
export const USER_INTENTS = ["proptech", "lenders", "insurance", "cre", "public-sector"] as const;
export type UserIntent = (typeof USER_INTENTS)[number];

/** Schema for `users.intent` — either a known ICP or null (user
    skipped /welcome step 1, or pre-AR-218 row). Empty string is NOT
    a valid value (would be ambiguous with null). */
export const UserIntentSchema = z.enum(USER_INTENTS).nullable();

/** Runtime guard for trust boundaries. */
export function isUserIntent(value: unknown): value is UserIntent {
  return typeof value === "string" && (USER_INTENTS as readonly string[]).includes(value);
}

/** Schema for `users.signup_source` — the marketing surface slug that
    referred this user. Free-form because the marketing pages own the
    slug taxonomy. Trimmed + max 64 chars to bound storage; null when
    the user signed up directly (no `?from=` query param). */
export const SignupSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .nullable();

/** The three roles surfaced in /welcome Step 3. Each maps to a different
    arrival page so returning users land where they're productive:
    - engineer → /api-usage (API key + traffic)
    - analyst  → /dashboard/intelligence (query + insights surface)
    - explorer → /dashboard (overview)
    Persisted on `users.role_preference`. Re-promptable later if the
    user's role changes (a Settings affordance ships in Phase 5). */
export const USER_ROLE_PREFERENCES = ["engineer", "analyst", "explorer"] as const;
export type UserRolePreference = (typeof USER_ROLE_PREFERENCES)[number];

/** Schema for `users.role_preference` — known role or null (skipped). */
export const UserRolePreferenceSchema = z.enum(USER_ROLE_PREFERENCES).nullable();

/** Runtime guard for trust boundaries. */
export function isUserRolePreference(value: unknown): value is UserRolePreference {
  return typeof value === "string" && (USER_ROLE_PREFERENCES as readonly string[]).includes(value);
}

/** Read-shape for the users table. Mirrors apps/web/src/lib/db-types.ts
    UserRow + the apps/api migration. Used by any code that reads a
    user record from /v1/me or the BFF proxy. password_hash is server-
    only; consumers reading user info via the API never receive it. */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  provider: z.string(),
  email_verified: z.boolean(),
  created_at: z.string(),
  intent: UserIntentSchema,
  signup_source: SignupSourceSchema,
  role_preference: UserRolePreferenceSchema,
}).strict();
export type User = z.infer<typeof UserSchema>;
