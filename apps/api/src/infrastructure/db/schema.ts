/* Consolidated schema for the OneGoodArea backend.

   Ported VERBATIM from the legacy src/lib/db-schema.ts (the production DDL),
   restructured from per-request ensureXTable() calls into one ordered,
   idempotent migration registry that runs once via migrate.ts.

   Every statement is idempotent (CREATE TABLE/INDEX IF NOT EXISTS, ADD COLUMN
   IF NOT EXISTS, ALTER ... DROP NOT NULL) so the migrator is safe to re-run.

   This is the canonical schema for apps/api. The legacy src/lib/db-schema.ts
   stays the live app's source until the Phase 1 cutover; keep the two in sync
   until then. */

export interface Migration {
  /** Logical table name (for logging + tests). */
  name: string;
  /** Ordered idempotent DDL statements. */
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    name: "users",
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        password_hash TEXT,
        provider TEXT DEFAULT 'credentials',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
    ],
  },
  {
    name: "email_verification_tokens",
    statements: [
      `CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    name: "activity_events",
    statements: [
      `CREATE TABLE IF NOT EXISTS activity_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    name: "api_keys",
    statements: [
      `CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE,
        key_hash TEXT,
        key_prefix TEXT,
        user_id TEXT NOT NULL,
        name TEXT DEFAULT 'Default',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked BOOLEAN DEFAULT FALSE
      )`,
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT`,
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT`,
      `ALTER TABLE api_keys ALTER COLUMN key DROP NOT NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash)`,
    ],
  },
  {
    name: "subscription_addons",
    statements: [
      `CREATE TABLE IF NOT EXISTS subscription_addons (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_subscription_addons_user_active
        ON subscription_addons (user_id) WHERE status = 'active'`,
    ],
  },
  {
    name: "mcp_usage",
    statements: [
      `CREATE TABLE IF NOT EXISTS mcp_usage (
        user_id TEXT NOT NULL,
        period TEXT NOT NULL,
        call_count INTEGER NOT NULL DEFAULT 0,
        last_call_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, period)
      )`,
    ],
  },
  {
    name: "report_cache",
    statements: [
      `CREATE TABLE IF NOT EXISTS report_cache (
        id SERIAL PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        report JSONB NOT NULL,
        area TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        hit_count INTEGER DEFAULT 0
      )`,
    ],
  },
  {
    name: "password_reset_tokens",
    statements: [
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    name: "saved_areas",
    statements: [
      `CREATE TABLE IF NOT EXISTS saved_areas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        area TEXT NOT NULL,
        postcode TEXT NOT NULL,
        intent TEXT NOT NULL DEFAULT 'research',
        score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, area)
      )`,
    ],
  },
  {
    name: "idempotency_records",
    statements: [
      `CREATE TABLE IF NOT EXISTS idempotency_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        response_status INTEGER NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        UNIQUE (user_id, idempotency_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_idempotency_records_expires
        ON idempotency_records (expires_at)`,
    ],
  },
  {
    name: "webhook_events",
    statements: [
      `CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        processed_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    name: "webhook_subscriptions",
    statements: [
      `CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        events TEXT[] NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_success_at TIMESTAMPTZ,
        last_failure_at TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_active
        ON webhook_subscriptions (user_id) WHERE status = 'active'`,
    ],
  },
  {
    name: "webhook_deliveries",
    statements: [
      `CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        http_status INTEGER,
        response_body TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        next_retry_at TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
        ON webhook_deliveries (status, next_retry_at)
        WHERE status IN ('pending', 'failed')`,
    ],
  },
  {
    name: "pageviews",
    statements: [
      `CREATE TABLE IF NOT EXISTS pageviews (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        referrer TEXT,
        country TEXT,
        device TEXT,
        session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    name: "report_history",
    statements: [
      `CREATE TABLE IF NOT EXISTS report_history (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_report_history_postcode_intent
        ON report_history (postcode, intent, generated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_report_history_run
        ON report_history (run_id)`,
      `CREATE INDEX IF NOT EXISTS idx_report_history_engine_version
        ON report_history (engine_version)`,
    ],
  },
];
