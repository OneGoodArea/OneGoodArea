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
      // AR-218 (Dashboard redesign Epic AR-217): /welcome flow needs to persist
      // three onboarding signals. All nullable + expand-only; existing rows
      // unaffected. Values validated at the application layer (Zod in
      // @onegoodarea/contracts) rather than via CHECK constraints so the
      // taxonomies can evolve without schema changes.
      //   - intent: which of the 5 ICPs the user is here for (/welcome Step 1)
      //   - signup_source: marketing surface that referred them via ?from= (/sign-up)
      //   - role_preference: how they'll use the product (/welcome Step 3) —
      //     determines arrival page (engineer → /api-usage, analyst →
      //     /dashboard/intelligence, explorer → /dashboard)
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS intent TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role_preference TEXT`,
      // AR-312: superuser status moves from a hardcoded SUPERUSER_EMAILS
      // array in source to a DB column so a real customer can be toggled
      // on/off without a deploy, and so Pedro can dogfood the product as
      // a real Sandbox/Build/Scale customer in prod without bypass-by-code.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT FALSE`,
      // AR-312 self-healing backfill: ONLY runs if no superuser currently
      // exists. After first deploy, ptengelmann@gmail.com gets the flag.
      // Subsequent boots no-op. If admins later add more superusers this
      // still no-ops (NOT EXISTS clause). The only path that re-promotes
      // ptengelmann is "all superusers demoted" — useful safety net
      // against an accidental UPDATE that strips superuser from everyone.
      `UPDATE users SET is_superuser = TRUE
         WHERE email = 'ptengelmann@gmail.com'
           AND NOT EXISTS (SELECT 1 FROM users WHERE is_superuser = TRUE)`,
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
      // AR-289: org-scoping for /api-usage. Nullable so legacy events
      // (where no api_key org was resolvable) stay representable. The
      // composite index matches the four queries /keys/usage runs
      // (totalRequests, requestsThisMonth, requestsByDay, lastRequest)
      // when an ?org filter is in play.
      `ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS org_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_activity_events_user_org_event_created
         ON activity_events (user_id, org_id, event, created_at)`,
      // AR-289 backfill: copy org_id from api_keys for legacy rows.
      // WHERE ae.org_id IS NULL makes this a no-op on subsequent runs
      // (idempotent — matches the migrator's contract).
      `UPDATE activity_events ae
          SET org_id = ak.org_id
         FROM api_keys ak
        WHERE ae.org_id IS NULL
          AND ae.user_id = ak.user_id
          AND ak.org_id IS NOT NULL`,
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
      // org_id added by the Levers Foundation (AR-193, ADR 0027). Nullable in
      // this phase of expand-contract so legacy `aiq_` keys + any not-yet-
      // backfilled rows keep validating. NOT NULL constraint lands in a
      // follow-up commit after observing prod for a release.
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id TEXT`,
      // Levers AR-200: per-key IP allowlist. Empty array = no
      // restriction (existing keys are byte-identical). When non-empty,
      // validateApiKey checks the request IP against each CIDR and
      // surfaces 403 ip_not_allowed if no match. See ADR 0034.
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_ip_cidrs TEXT[] NOT NULL DEFAULT '{}'`,
      // AR-375 / plan 029: per-key opt-out from proprietary training-data
      // capture (AR-376 query_planner_logs, AR-377 brief_composer_logs).
      // Default FALSE = customer participates in training. When TRUE, both
      // training-table inserts skip silently — adoption tracking via
      // activity_events still happens. Documented in docs/DATA_POLICY.md.
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS training_optout BOOLEAN NOT NULL DEFAULT FALSE`,
      `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash)`,
      `CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys (org_id)`,
    ],
  },
  {
    // Levers Foundation (AR-193, ADR 0027): per-org tenancy. Every existing
    // user auto-gets a personal org via the backfill statements at the end of
    // this migration. New users get one created on signup (handled at the
    // application layer, not here). Forward-compatible: peer_assignments,
    // org_signal_bundles, org_score_presets, org_methodology, etc. will all
    // reference orgs.id via scope_key / org_id columns in later commits.
    name: "orgs",
    statements: [
      `CREATE TABLE IF NOT EXISTS orgs (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Levers AR-200: white-label fields. Both nullable; null
      // display_name falls back to `name` on read. brand_url is the
      // org's public homepage for "Powered by X" links. See ADR 0034.
      `ALTER TABLE orgs ADD COLUMN IF NOT EXISTS display_name TEXT`,
      `ALTER TABLE orgs ADD COLUMN IF NOT EXISTS brand_url TEXT`,
      // AR-284: org logo URL (paste-URL for v1; Vercel Blob upload
      // pipeline is a follow-up). Nullable; falls back to initials
      // in the dashboard chrome when null.
      `ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      `CREATE INDEX IF NOT EXISTS orgs_slug_idx ON orgs (slug)`,
    ],
  },
  {
    name: "org_members",
    statements: [
      `CREATE TABLE IF NOT EXISTS org_members (
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS org_members_user_idx ON org_members (user_id)`,
    ],
  },
  {
    // BACKFILL — runs after the schema is in place. Idempotent (ON CONFLICT
    // DO NOTHING / WHERE org_id IS NULL). Re-running this migration on a DB
    // that already has the orgs backfilled is a no-op. Auto-creates a
    // personal org for every existing user; auto-adds them as owner; sets
    // their api_keys.org_id. New users post-merge get this handled in the
    // application signup flow (TODO in a follow-up commit).
    name: "orgs_backfill",
    statements: [
      // 1. Personal org per user. id = "org_" + user_id (UNIQUE by
      //    construction); slug = email-local-part + first-12-chars of user_id.
      //    Target-free ON CONFLICT DO NOTHING catches ANY unique violation
      //    (id OR slug) so re-runs after partial failure stay idempotent
      //    even if two users with identical email local-parts collided on
      //    a shorter slug suffix in a previous attempt.
      `INSERT INTO orgs (id, slug, name)
         SELECT 'org_' || u.id,
                LOWER(REGEXP_REPLACE(SPLIT_PART(u.email, '@', 1), '[^a-z0-9-]', '-', 'g')) || '-' || SUBSTRING(u.id, 1, 12),
                SPLIT_PART(u.email, '@', 1) || ' workspace'
           FROM users u
       ON CONFLICT DO NOTHING`,
      // 2. User is owner of their personal org.
      `INSERT INTO org_members (org_id, user_id, role)
         SELECT 'org_' || u.id, u.id, 'owner'
           FROM users u
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      // 3. Backfill api_keys.org_id (nullable -> populated). Only touches
      //    rows where org_id IS NULL so this is safe to re-run after future
      //    keys have been created with explicit org_id.
      `UPDATE api_keys
          SET org_id = 'org_' || user_id
        WHERE org_id IS NULL`,
    ],
  },
  {
    // Levers AR-195 — custom signal bundles. A bundle is a named per-org
    // whitelist of signal keys that scopes a caller's view of the data
    // layer when they pass ?bundle=<id> on /v1/area / /v1/areas / /v1/query.
    // Signal keys are validated against the SUPPORTED_SIGNALS taxonomy at
    // the application layer (no CHECK constraint — taxonomy evolves).
    // (slug, org_id) is UNIQUE so two bundles in the same org can't share
    // a slug; slugs across different orgs can repeat. See ADR 0029.
    name: "signal_bundles",
    statements: [
      `CREATE TABLE IF NOT EXISTS signal_bundles (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        signal_keys TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (org_id, slug)
      )`,
      `CREATE INDEX IF NOT EXISTS signal_bundles_org_idx ON signal_bundles (org_id)`,
    ],
  },
  {
    // Levers AR-196 — custom scoring presets. A preset is a saved
    // {base_preset, weights} bundle keyed by id; callers reference it
    // on POST /v1/score via `preset_id`. base_preset is one of the
    // hardcoded intents (selects the dimension set); weights override
    // the aggregation. The deterministic engine is reused untouched.
    // See ADR 0030.
    name: "scoring_presets",
    statements: [
      `CREATE TABLE IF NOT EXISTS scoring_presets (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        base_preset TEXT NOT NULL,
        weights JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (org_id, slug)
      )`,
      `CREATE INDEX IF NOT EXISTS scoring_presets_org_idx ON scoring_presets (org_id)`,
    ],
  },
  {
    // Levers AR-197 — methodology pinning. One row per org (org_id is
    // the PK). engine_version is validated at WRITE time against the
    // SUPPORTED_ENGINE_VERSIONS list so a downstream caller never sees
    // a 400 because their org's pin became EOL. See ADR 0031.
    name: "org_methodology_pins",
    statements: [
      `CREATE TABLE IF NOT EXISTS org_methodology_pins (
        org_id TEXT PRIMARY KEY,
        engine_version TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ],
  },
  {
    // Levers AR-198 — per-org peer cohorts. A cohort is a named subset
    // of LSOAs that scopes /v1/peers results when the caller passes
    // ?cohort_id. The existing global k-NN peer graph is reused;
    // cohorts act as a candidate filter at query time (no materialized
    // per-org graph). See ADR 0032.
    name: "peer_cohorts",
    statements: [
      `CREATE TABLE IF NOT EXISTS peer_cohorts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        geo_codes TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (org_id, slug)
      )`,
      `CREATE INDEX IF NOT EXISTS peer_cohorts_org_idx ON peer_cohorts (org_id)`,
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
    /* AR-331 (epic AR-324): renamed from report_cache. The cache holds area
       data keyed by (postcode, intent) and is consumed by the Signals route
       (Scores product), not reports. The ALTER renames an existing prod
       table; the CREATE handles fresh databases. Both are idempotent. */
    // AR-379: area_cache table dropped. The CREATE block stays in git
    // history; this block now only enforces "the table should not
    // exist" via DROP TABLE IF EXISTS. Idempotent — runs once on
    // existing DBs, no-op on fresh ones. See plan/030.
    name: "area_cache",
    statements: [
      `DROP TABLE IF EXISTS area_cache`,
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
    /* AR-331 (epic AR-324): renamed from report_history. The content is
       score time-series — the rescore cron writes one row per (postcode,
       intent) per monthly run. The name "report_history" was misleading
       from day one; the table was always score data. */
    name: "score_history",
    statements: [
      `ALTER TABLE IF EXISTS report_history RENAME TO score_history`,
      `ALTER INDEX IF EXISTS idx_report_history_postcode_intent RENAME TO idx_score_history_postcode_intent`,
      `ALTER INDEX IF EXISTS idx_report_history_run RENAME TO idx_score_history_run`,
      `ALTER INDEX IF EXISTS idx_report_history_engine_version RENAME TO idx_score_history_engine_version`,
      `CREATE TABLE IF NOT EXISTS score_history (
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
      `CREATE INDEX IF NOT EXISTS idx_score_history_postcode_intent
        ON score_history (postcode, intent, generated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_score_history_run
        ON score_history (run_id)`,
      `CREATE INDEX IF NOT EXISTS idx_score_history_engine_version
        ON score_history (engine_version)`,
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
    /* AR-331 (epic AR-324): the legacy reports table. After Phase 6 deleted
       report-generator.ts (the only writer) and the /v1/report + /me/reports
       routes (the only readers), the table is unreferenced. DROP CASCADE
       to clean up any leftover constraints. Migration is idempotent on
       both prod (table exists, gets dropped) and fresh DBs (no-op). */
    name: "reports",
    statements: [
      `DROP TABLE IF EXISTS reports CASCADE`,
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
     MASTER-PROPOSAL section 3 and the @onegoodarea/contracts Signal/AreaProfile
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
  {
    // Materialized k-NN peer assignments per LSOA (AR-189, ADR 0024). Computed
    // by refresh:peers from signal_values' normalized vectors, then JOINed by
    // the peer-relative-z derive AND served by POST /v1/peers / /v1/insights.
    // Idempotent: refresh re-computes in place. Default k=20, so ~840k rows
    // (42k LSOAs × 20 peers each).
    name: "peer_assignments",
    statements: [
      `CREATE TABLE IF NOT EXISTS peer_assignments (
        geo_type TEXT NOT NULL,
        geo_code TEXT NOT NULL,
        peer_geo_code TEXT NOT NULL,
        peer_rank INT NOT NULL,
        distance DOUBLE PRECISION NOT NULL,
        n_dims_used INT NOT NULL,
        computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        engine_version TEXT NOT NULL,
        PRIMARY KEY (geo_type, geo_code, peer_geo_code)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_peer_assignments_target
        ON peer_assignments (geo_type, geo_code, peer_rank)`,
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
  // AR-272 (Phase 3 / Levers UI backend): org invitation flow. The
  // existing POST /v1/orgs/:id/members only adds an existing user_id,
  // so this table backs the email-driven invite path. Token is stored
  // as a SHA-256 hash (token_hash); the plaintext exists only in the
  // outbound email. role is CHECK-constrained to (member, admin) —
  // owner cannot be granted via invite by design.
  //
  // Partial unique index uq_org_invitations_pending prevents two
  // concurrent open invites for the same (org, email) pair —
  // simpler than a "resend" endpoint and cheaper than a soft retry.
  // Revoked or accepted invites drop out of the predicate so an
  // admin can re-invite after revoking.
  {
    name: "org_invitations",
    statements: [
      `CREATE TABLE IF NOT EXISTS org_invitations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
        token_hash TEXT NOT NULL UNIQUE,
        invited_by_user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        accepted_by_user_id TEXT,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON org_invitations (org_id, created_at DESC)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_org_invitations_pending
         ON org_invitations (org_id, email)
         WHERE accepted_at IS NULL AND revoked_at IS NULL`,
    ],
  },
  // AR-376 / plan 029: planner training pairs. Captures (NL question →
  // emitted typed plan) on every /v1/query call where `question` is
  // present (programmatic {plan} calls skip — nothing to learn).
  //
  // Separate from activity_events because (1) different lifecycle —
  // training data may be exported / archived / dropped per-customer; (2)
  // different access controls — superuser only; (3) row size is
  // unbounded by design (NL question + full plan JSON).
  //
  // Per-key opt-out: insert path checks api_keys.training_optout before
  // writing. When TRUE for the calling key, the row is silently
  // skipped — adoption tracking via activity_events still happens.
  //
  // Retention: TRAINING_DATA_RETENTION_DAYS (default 365). AR-377 ships
  // the nightly purge cron over both training tables.
  {
    name: "query_planner_logs",
    statements: [
      `CREATE TABLE IF NOT EXISTS query_planner_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT,
        user_id TEXT NOT NULL,
        event_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        question TEXT NOT NULL,
        plan JSONB NOT NULL,
        plan_source TEXT,
        response_ok BOOLEAN NOT NULL,
        error_code TEXT,
        latency_ms INTEGER NOT NULL,
        source TEXT,
        client_app TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_query_planner_logs_org_ts
         ON query_planner_logs (org_id, event_ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_query_planner_logs_client_app
         ON query_planner_logs (client_app)`,
      `CREATE INDEX IF NOT EXISTS idx_query_planner_logs_event_ts
         ON query_planner_logs (event_ts DESC)`,
    ],
  },
  // AR-377 / plan 029: brief-composer training pairs. Captures
  // (request → server-composed brief) on every /v1/score?explain=true.
  //
  // Logged only when the explain branch fires — the bare score path
  // has no brief to capture. Per-key training_optout honored on insert.
  //
  // Row size: full ScoreResultSchema response is 5-15 KB JSONB. Postgres
  // handles compression automatically via TOAST. Indexes mirror the
  // query_planner_logs pattern (org_id+event_ts for org rollups, client_app
  // for filtering, event_ts for retention sweeps).
  {
    name: "brief_composer_logs",
    statements: [
      `CREATE TABLE IF NOT EXISTS brief_composer_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT,
        user_id TEXT NOT NULL,
        event_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        area TEXT NOT NULL,
        preset TEXT,
        weights JSONB,
        request JSONB NOT NULL,
        response JSONB NOT NULL,
        response_ok BOOLEAN NOT NULL,
        latency_ms INTEGER NOT NULL,
        source TEXT,
        client_app TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_brief_composer_logs_org_ts
         ON brief_composer_logs (org_id, event_ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_brief_composer_logs_client_app
         ON brief_composer_logs (client_app)`,
      `CREATE INDEX IF NOT EXISTS idx_brief_composer_logs_event_ts
         ON brief_composer_logs (event_ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_brief_composer_logs_preset
         ON brief_composer_logs (preset)`,
    ],
  },
  // AR-375 / plan 029: MCP adoption visibility. The view answers
  // "which orgs are using MCP, with which tools, from which client,
  // how much, when last seen?" without exposing chat content.
  //
  // Read path: aggregate counts only, never raw metadata. /admin tile
  // (Step 7) queries this view. Raw event metadata requires deliberate
  // SQL access (superuser).
  //
  // Filter: metadata->>'source' = 'mcp' — set by the AR-375 onRequest
  // hook for any request bearing the onegoodarea-mcp-server User-Agent.
  // Pre-AR-375 rows never had 'source' set, so the legacy data is
  // implicitly excluded (correct — we couldn't have classified it).
  //
  // Window: last 30 days. Larger windows are still queryable directly
  // against activity_events. 30d matches how /api-usage thinks about
  // adoption and keeps the tile snappy.
  //
  // CREATE OR REPLACE VIEW is idempotent by definition.
  {
    name: "mcp_adoption_view",
    statements: [
      `CREATE OR REPLACE VIEW mcp_adoption AS
        SELECT
          ae.org_id,
          o.name AS org_name,
          o.display_name AS org_display_name,
          ae.user_id,
          u.email AS user_email,
          ae.event AS event_name,
          ae.metadata->>'client_app' AS client_app,
          COUNT(*)::INT AS event_count,
          MAX(ae.created_at) AS last_seen
        FROM activity_events ae
        LEFT JOIN users u ON u.id = ae.user_id
        LEFT JOIN orgs o ON o.id = ae.org_id
        WHERE ae.metadata->>'source' = 'mcp'
          AND ae.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY
          ae.org_id, o.name, o.display_name,
          ae.user_id, u.email,
          ae.event,
          ae.metadata->>'client_app'`,
    ],
  },
];
