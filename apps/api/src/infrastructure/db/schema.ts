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
    // ORPHANED in production: the live billing routes (stripe/checkout,
    // /cancel, /webhook) read+write `subscriptions`, but no CREATE TABLE for it
    // exists anywhere in the repo (legacy db-schema.ts has no ensureSubscriptionsTable).
    // Reconstructed here from the SubscriptionRow type + the INSERT/UPDATE/ON
    // CONFLICT (user_id) shapes in those routes. CREATE IF NOT EXISTS is a no-op
    // against prod where the table already exists; this lets a fresh DB run the
    // billing module. user_id is UNIQUE because the routes upsert ON CONFLICT
    // (user_id); the period + subscription-id columns are nullable because the
    // webhook nulls them on cancellation.
    name: "subscriptions",
    statements: [
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        plan TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
        ON subscriptions (stripe_customer_id)`,
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
    // Real prod schema. The legacy src/lib/db-schema.ts ensureWatchlistTable()
    // DDL (area/score/UNIQUE(user_id,area)) is STALE dead code: the live
    // dashboard pages (src/app/{,design-v2/}dashboard/page.tsx) create this
    // table inline with the schema below, and CREATE IF NOT EXISTS makes the
    // stale version a no-op. The watchlist route (INSERT without id, label
    // column, ON CONFLICT(user_id,postcode)) only works against THIS schema,
    // which both dashboards + the route agree on. CREATE IF NOT EXISTS is a
    // no-op against prod; this just makes a fresh DB match.
    name: "saved_areas",
    statements: [
      `CREATE TABLE IF NOT EXISTS saved_areas (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        postcode TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        intent TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, postcode)
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
      // Were self-created by the legacy /api/track route (ensureTable). The
      // migrator owns all DDL now.
      `CREATE INDEX IF NOT EXISTS idx_pageviews_created ON pageviews (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_pageviews_path ON pageviews (path)`,
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
  {
    // Was self-created by the legacy rate-limit.ts (ensureRateLimitTable).
    // Centralised here so the migrator owns all DDL; byte-identical to legacy.
    name: "rate_limit_entries",
    statements: [
      `CREATE TABLE IF NOT EXISTS rate_limit_entries (
        id SERIAL PRIMARY KEY,
        identifier TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_entries (identifier, created_at)`,
    ],
  },
  {
    // The user-facing reports table the generator writes to and the dashboard
    // reads. It was ORPHANED in the legacy codebase: no ensure*Table() helper
    // and no migration created it (it exists only in the production DB, so a
    // fresh database could never run the app). Reconstructed here from the
    // generate-report INSERT + the ReportRow type. CREATE IF NOT EXISTS is a
    // no-op against prod where the table already exists.
    name: "reports",
    statements: [
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        area TEXT NOT NULL,
        intent TEXT NOT NULL,
        report JSONB NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reports_user_created
        ON reports (user_id, created_at DESC)`,
    ],
  },
  {
    // Was self-created by the legacy data-sources/ofsted.ts (ensureOfstedTable).
    // Centralised here so the migrator owns all DDL; the table + index
    // definitions are byte-identical to the legacy CREATE statements.
    name: "ofsted_schools",
    statements: [
      `CREATE TABLE IF NOT EXISTS ofsted_schools (
        id SERIAL PRIMARY KEY,
        urn INTEGER UNIQUE NOT NULL,
        school_name TEXT NOT NULL,
        phase TEXT,
        postcode TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        overall_effectiveness INTEGER,
        rating_text TEXT,
        inspection_date TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ofsted_lat ON ofsted_schools (latitude)`,
      `CREATE INDEX IF NOT EXISTS idx_ofsted_lng ON ofsted_schools (longitude)`,
    ],
  },

  /* ====================================================================
     SIGNAL STORE (restructure Phase 1, AR-171 / epic AR-169)
     --------------------------------------------------------------------
     NEW + ADDITIVE. These tables are not yet read by any live path; they
     are populated by the Phase 1 refresh jobs, and getAreaProfile flips to
     read them (fetch_mode: "store") in a later sub-task. Nothing here
     touches an existing table (expand-contract). The shape mirrors
     MASTER-PROPOSAL §3 and the @onegoodarea/contracts Signal/AreaProfile
     primitive. Natural keys + app-level integrity, matching this codebase's
     convention (no FK constraints anywhere above). Mixed-type signal values
     (the contract allows number | string | null) are split into raw_value
     (numeric) + raw_value_text (text); the serve layer reconstructs which.
     See ADR 0002.
     ==================================================================== */
  {
    // The universe of addressable geographies. geo_type is one of
    // postcode|oa|lsoa|msoa|lad|region (uprn later). Natural composite key
    // (geo_type, geo_code) is what every signal_* row references.
    name: "geo_entities",
    statements: [
      `CREATE TABLE IF NOT EXISTS geo_entities (
        geo_type TEXT NOT NULL,
        geo_code TEXT NOT NULL,
        name TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        country TEXT,
        boundary_version TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (geo_type, geo_code)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_geo_entities_country ON geo_entities (country)`,
    ],
  },
  {
    // The ONS spine (ONSPD/NSPL): postcode -> OA/LSOA/MSOA/LAD/region.
    // Boundary-versioned (2011 vs 2021 is a real gotcha). Postcode is stored
    // normalized (uppercased, single internal space) as the primary key.
    name: "geo_lookup",
    statements: [
      `CREATE TABLE IF NOT EXISTS geo_lookup (
        postcode TEXT PRIMARY KEY,
        oa_code TEXT,
        lsoa_code TEXT,
        msoa_code TEXT,
        lad_code TEXT,
        lad_name TEXT,
        region TEXT,
        country TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        boundary_version TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_geo_lookup_lsoa ON geo_lookup (lsoa_code)`,
      `CREATE INDEX IF NOT EXISTS idx_geo_lookup_lad ON geo_lookup (lad_code)`,
    ],
  },
  {
    // Provenance of each ingest: which source, what release, when ingested,
    // licence + checksum + row count. Every signal_value points at the
    // snapshot it came from (lineage / auditability — part of the moat).
    name: "source_snapshots",
    statements: [
      `CREATE TABLE IF NOT EXISTS source_snapshots (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        release_date DATE,
        ingested_at TIMESTAMPTZ DEFAULT NOW(),
        licence TEXT,
        checksum TEXT,
        row_count INTEGER,
        notes TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_source_snapshots_source
        ON source_snapshots (source, ingested_at DESC)`,
    ],
  },
  {
    // The signal CATALOG: one row per signal key (e.g. crime.total_12m). The
    // catalog metadata that mirrors the contract's Signal (category, unit,
    // direction, source, methodology_version). Seeded by the refresh path,
    // not here (the migrator is DDL-only).
    name: "signals",
    statements: [
      `CREATE TABLE IF NOT EXISTS signals (
        key TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        label TEXT NOT NULL,
        unit TEXT,
        direction TEXT NOT NULL DEFAULT 'neutral',
        source TEXT NOT NULL,
        methodology_version TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_signals_category ON signals (category)`,
    ],
  },
  {
    // The CURRENT value of each signal for each area (one row per
    // signal+geo; history goes to signal_timeseries). raw_value (numeric) and
    // raw_value_text (text) cover the contract's number | string union; the
    // serve layer picks whichever is non-null. normalized_value is populated
    // once the normalization models land.
    name: "signal_values",
    statements: [
      `CREATE TABLE IF NOT EXISTS signal_values (
        signal_key TEXT NOT NULL,
        geo_type TEXT NOT NULL,
        geo_code TEXT NOT NULL,
        raw_value DOUBLE PRECISION,
        raw_value_text TEXT,
        normalized_value DOUBLE PRECISION,
        confidence NUMERIC(3,2),
        confidence_reason TEXT,
        source_snapshot_id TEXT,
        observed_period TEXT,
        engine_version TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (signal_key, geo_type, geo_code)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_signal_values_geo
        ON signal_values (geo_type, geo_code)`,
      `CREATE INDEX IF NOT EXISTS idx_signal_values_signal
        ON signal_values (signal_key)`,
    ],
  },
  {
    // Percentile rank per signal+geo within a comparison scope
    // (national | regional | lad | peer_group). scope_key carries the scope's
    // identifier (region/lad code or peer-group id); national uses '' so the
    // composite key stays well-defined (no NULLs in the PK).
    name: "signal_percentiles",
    statements: [
      `CREATE TABLE IF NOT EXISTS signal_percentiles (
        signal_key TEXT NOT NULL,
        geo_type TEXT NOT NULL,
        geo_code TEXT NOT NULL,
        scope TEXT NOT NULL,
        scope_key TEXT NOT NULL DEFAULT '',
        percentile NUMERIC(5,2),
        computed_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (signal_key, geo_type, geo_code, scope, scope_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_signal_percentiles_geo
        ON signal_percentiles (geo_type, geo_code)`,
    ],
  },
  {
    // The MOAT asset: append-only historical snapshots, one row per
    // signal+geo+observed_period. The UNIQUE-by-PK on observed_period makes
    // monthly appends safe to re-run (no double-append). captured_at is when
    // WE snapshotted it; observed_period is what the value describes.
    name: "signal_timeseries",
    statements: [
      `CREATE TABLE IF NOT EXISTS signal_timeseries (
        signal_key TEXT NOT NULL,
        geo_type TEXT NOT NULL,
        geo_code TEXT NOT NULL,
        observed_period TEXT NOT NULL,
        raw_value DOUBLE PRECISION,
        raw_value_text TEXT,
        normalized_value DOUBLE PRECISION,
        confidence NUMERIC(3,2),
        source_snapshot_id TEXT,
        engine_version TEXT,
        captured_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (signal_key, geo_type, geo_code, observed_period)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_signal_timeseries_series
        ON signal_timeseries (signal_key, geo_type, geo_code, observed_period DESC)`,
    ],
  },

  /* ====================================================================
     MONITOR (restructure Phase 5, the 3rd product — AR-169)
     --------------------------------------------------------------------
     A portfolio is a user's tracked book of areas (enrich now; change
     detection + alerts once the time-series accrues). Scoped to user_id
     today; re-scopes to org_id when Levers (tenancy) land. Additive.
     ==================================================================== */
  {
    name: "portfolios",
    statements: [
      `CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios (user_id, created_at DESC)`,
    ],
  },
  {
    name: "portfolio_areas",
    statements: [
      `CREATE TABLE IF NOT EXISTS portfolio_areas (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        area TEXT NOT NULL,
        label TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (portfolio_id, area)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_portfolio_areas_portfolio ON portfolio_areas (portfolio_id)`,
    ],
  },
];
