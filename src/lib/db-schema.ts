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
