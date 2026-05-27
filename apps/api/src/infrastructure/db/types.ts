/**
 * Typed row interfaces for Neon SQL query results.
 * Use these instead of `as string` / `as number` casting.
 */

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password_hash: string | null;
  provider: string;
  email_verified: boolean;
  created_at: string;
}

export interface ReportRow {
  id: string;
  user_id: string;
  area: string;
  intent: string;
  report: string | Record<string, unknown>;
  score: number;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  key: string;
  user_id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface ActivityEventRow {
  id: string;
  user_id: string | null;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  created_at: string;
}

export interface CacheRow {
  id: number;
  cache_key: string;
  report: string | Record<string, unknown>;
  area: string;
  score: number;
  created_at: string;
  hit_count: number;
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

/* ── Lightweight row shapes for analytics / aggregate queries ── */

export interface CountRow {
  count: number;
}

export interface TotalRow {
  total: number;
}

export interface DayCountRow {
  day: string;
  count: number;
}

export interface AreaCountRow {
  area: string;
  count: number;
}

export interface IntentCountRow {
  intent: string;
  count: number;
}

export interface PlanCountRow {
  plan: string;
  count: number;
}

export interface RecentActivityRow {
  event: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  name: string | null;
  email: string | null;
}

export interface PathCountRow {
  path: string;
  count: number;
}

export interface ReferrerCountRow {
  referrer: string;
  count: number;
}

export interface DeviceCountRow {
  device: string;
  count: number;
}

export interface CountryCountRow {
  country: string;
  count: number;
}

export interface AreaHitsRow {
  area: string;
  hits: number;
}

export interface SavedAreaRow {
  id: string;
  user_id: string;
  area: string;
  postcode: string;
  label: string;
  intent: string | null;
  score: number | null;
  created_at: string;
}

export interface VerificationTokenRow {
  id: string;
  user_id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

/**
 * Type-safe row accessor. Cast a Neon result row once at the boundary.
 * Usage: const user = row<UserRow>(rows[0]);
 */
export function row<T>(r: Record<string, unknown>): T {
  return r as T;
}

/**
 * Type-safe rows accessor for arrays.
 * Usage: const users = rows<UserRow>(result);
 */
export function rows<T>(r: Record<string, unknown>[]): T[] {
  return r as T[];
}
