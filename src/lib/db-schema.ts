import { sql } from "@/lib/db";

/**
 * Centralised schema definitions for all database tables.
 * Each function is safe to call multiple times (CREATE TABLE IF NOT EXISTS).
 * Individual modules import the specific function they need.
 */

let allTablesReady = false;

export async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      password_hash TEXT,
      provider TEXT DEFAULT 'credentials',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
  `;
}

export async function ensureVerificationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function ensureActivityTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function ensureApiKeysTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT DEFAULT 'Default',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    )
  `;
}

/**
 * Subscription add-ons (AR-144 Session 5).
 *
 * One row per (user_id, addon_key) — composite uniqueness enforced. addon_key
 * is a short string from the ADDONS map in src/lib/stripe.ts (currently only
 * "mcp"; future: "estyn-scotland", "time-series", "premium-sla", "slack").
 *
 * status mirrors the Stripe subscription status for the add-on:
 *   - "active" = paid + valid
 *   - "cancelled" = user cancelled, kept until current_period_end then row deleted
 *   - "past_due" = payment failed, addon temporarily disabled
 *
 * stripe_subscription_id ties back to the Stripe Subscription that funds this
 * add-on. We use a SEPARATE Stripe Subscription per add-on (not a
 * SubscriptionItem) so cancellation is isolated from the main plan.
 */
export async function ensureSubscriptionAddonsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS subscription_addons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      addon_key TEXT NOT NULL,
      stripe_subscription_id TEXT,
      stripe_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, addon_key)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_subscription_addons_user_active
      ON subscription_addons (user_id) WHERE status = 'active'
  `;
}

/**
 * MCP usage tracking (AR-144 Session 5).
 *
 * Per-user, per-month counter incremented every time the /api/v1/report
 * endpoint receives a request with the MCP User-Agent header. Lets us:
 *   - Show usage on the dashboard ("X MCP calls this month")
 *   - Bill differently in future if MCP usage diverges from API usage
 *   - Spot heavy users to upsell
 *
 * Period is YYYY-MM string for cheap aggregation. month_total resets each month.
 */
export async function ensureMcpUsageTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mcp_usage (
      user_id TEXT NOT NULL,
      period TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0,
      last_call_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, period)
    )
  `;
}

export async function ensureReportCacheTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS report_cache (
      id SERIAL PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      report JSONB NOT NULL,
      area TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      hit_count INTEGER DEFAULT 0
    )
  `;
}

export async function ensurePasswordResetTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function ensureWatchlistTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS saved_areas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      area TEXT NOT NULL,
      postcode TEXT NOT NULL,
      intent TEXT NOT NULL DEFAULT 'research',
      score INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, area)
    )
  `;
}

export async function ensureWebhookEventsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function ensurePageviewTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pageviews (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      country TEXT,
      device TEXT,
      session_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * report_history — time-series record of deterministic scores for the
 * top UK postcodes, written by the monthly re-scoring cron.
 *
 * Pure scoring data: no AI narrative, no user binding. Each row is a
 * deterministic score for (postcode, intent) at a point in time, stamped
 * with the engine_version that produced it. Compounds into a saleable
 * UK area trend dataset that no UK competitor has.
 *
 * The unique key (run_id, postcode, intent) lets the cron be safely re-run
 * within a single batch without producing duplicates.
 */
export async function ensureReportHistoryTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS report_history (
      id BIGSERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      postcode TEXT NOT NULL,
      intent TEXT NOT NULL,
      area_type TEXT,
      overall_score INTEGER NOT NULL,
      confidence NUMERIC(3,2) NOT NULL,
      dimensions JSONB NOT NULL,
      engine_version TEXT NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (run_id, postcode, intent)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_report_history_postcode_intent
      ON report_history (postcode, intent, generated_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_report_history_run
      ON report_history (run_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_report_history_engine_version
      ON report_history (engine_version)
  `;
}

/**
 * Ensure all tables exist. Call once on app startup or first request.
 * Safe to call multiple times due to IF NOT EXISTS and the guard flag.
 */
export async function ensureAllTables() {
  if (allTablesReady) return;
  await Promise.all([
    ensureUsersTable(),
    ensureVerificationTable(),
    ensureActivityTable(),
    ensureApiKeysTable(),
    ensureReportCacheTable(),
    ensurePasswordResetTable(),
    ensureWatchlistTable(),
    ensureWebhookEventsTable(),
    ensurePageviewTable(),
    ensureReportHistoryTable(),
  ]);
  allTablesReady = true;
}
