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
  /* AR-312: superuser flag. Optional in the type so existing callers
     that SELECT a narrower set of columns still typecheck — only
     isSuperuser actually reads this field. */
  is_superuser?: boolean;
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
  /** Levers (AR-193) — nullable during the expand phase of expand-contract.
      The Foundation migration backfills every existing key; new keys get an
      explicit org_id at creation time. Legacy `aiq_` keys that haven't been
      backfilled keep validating with org_id = null. */
  org_id: string | null;
  /** Levers (AR-200) — per-key IP allowlist. Empty array (the default) =
      no restriction; existing keys are unaffected. validateApiKey checks
      the request IP against each CIDR when non-empty. */
  allowed_ip_cidrs: string[];
  /** AR-375 / plan 029: per-key opt-out from proprietary training-data
      capture (AR-376 query_planner_logs, AR-377 brief_composer_logs).
      Default FALSE = participate. When TRUE, both training-table
      inserts skip silently. Adoption tracking still happens. */
  training_optout: boolean;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

/** Levers (AR-193) — per-org tenancy primitives. White-label fields
    `display_name` + `brand_url` added by AR-200 (both nullable; reads
    fall back to `name` when display_name is null). AR-284 adds
    `logo_url` for the dashboard's org-mark surfaces (paste-URL for
    v1; Vercel Blob upload is a follow-up). */
export interface OrgRow {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  brand_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMemberRow {
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  /* AR-310: populated by listMembers via LEFT JOIN users — undefined on
     paths that don't join. Nullable email handles the "user deleted but
     FK stub remains" edge case. */
  email?: string | null;
  name?: string | null;
}

/** AR-272 — org_invitations row. Plaintext token NEVER lives here; we
    keep only the SHA-256 hash. The email is stored lowercased so the
    partial-unique pending index doesn't get bypassed by mixed-case
    duplicates. */
export interface OrgInvitationRow {
  id: string;
  org_id: string;
  email: string;
  role: "member" | "admin";
  token_hash: string;
  invited_by_user_id: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** Levers (AR-195) — signal_bundles row. signal_keys is a Postgres TEXT[]
    that the Neon driver surfaces as a JS string[]. */
export interface SignalBundleRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  signal_keys: string[];
  created_at: string;
  updated_at: string;
}

/** Levers (AR-196) — scoring_presets row. weights is JSONB; the Neon
    driver surfaces it as the parsed JS object. base_preset is one of
    moving | business | investing | research (validated at write time). */
export interface ScoringPresetRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  base_preset: string;
  weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

/** Levers (AR-197) — org_methodology_pins row. One row per org (org_id
    is the PK). engine_version is validated at write time against
    SUPPORTED_ENGINE_VERSIONS so reads never have to worry about
    invalid values. */
export interface OrgMethodologyPinRow {
  org_id: string;
  engine_version: string;
  created_at: string;
  updated_at: string;
}

/** Levers (AR-198) — peer_cohorts row. geo_codes is a Postgres TEXT[]
    of LSOA codes; the Neon driver surfaces it as a JS string[]. */
export interface PeerCohortRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  geo_codes: string[];
  created_at: string;
  updated_at: string;
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
