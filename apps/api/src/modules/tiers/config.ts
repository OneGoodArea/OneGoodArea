import type { Tier } from "./index";
import type { UserType } from "@onegoodarea/contracts";

/** Base rate per tier (currency units / month). Env-var overridable
 *  so ops can tune pricing without a deploy. null = not a billable
 *  tier (internal/gateway tiers). */
export const BASE_RATES: Record<Tier, number | null> = {
  anonymous:   0,
  logged_in:   0,
  basic:       0,
  high_tier:   4900,
  engineering: null,
  superuser:   null,
};

/** Per-user-type multiplier applied to the base rate.
 *  null = unlimited (no billing cap for this user type). */
export const USER_TYPE_MULTIPLIER: Record<UserType, number | null> = {
  user:        1,
  engineering: null,
  admin:       1,
  superuser:   null,
};

/** Resolve the effective monthly rate for a user.
 *  Returns null when the user type has no billing cap. */
export function getEffectiveRate(userType: UserType, tier: Tier): number | null {
  const multiplier = USER_TYPE_MULTIPLIER[userType];
  if (multiplier === null) return null;
  const base = BASE_RATES[tier];
  if (base === null) return null;
  return base * multiplier;
}