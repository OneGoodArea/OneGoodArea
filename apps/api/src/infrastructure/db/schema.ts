/* Consolidated schema for the OneGoodArea backend.

   Ported VERBATIM from the legacy src/lib/db-schema.ts (the production DDL),
   restructured from per-request ensureXTable() calls into one ordered,
   idempotent migration registry that runs once via migrate.ts.

   v1 consolidation (DB sync): every additive column is folded into its
   CREATE TABLE statement so a fresh database arrives at the Neon shape in a
   single migration. ALTER statements are retained ONLY where the operation
   cannot be expressed as part of a CREATE (sequence renames, DROP NOT NULL,
   default reconciliation, backfill UPDATEs/INSERTs, DROP TABLE cleanup).

   This is the canonical schema for apps/api. The legacy src/lib/db-schema.ts
   stays the live app's source until the Phase 1 cutover; keep the two in sync
   until then. */

import { createHash } from "node:crypto";

export interface Migration {
  /** Logical table name (for logging + tests). */
  name: string;
  /** Ordered idempotent DDL statements. */
  statements: string[];
}

/** One env-driven bootstrap (a "seed"). Seeds are the second phase of the
    autonomous install: after MIGRATIONS lay down the schema, seeds turn an
    operator-supplied secret into durable rows (a showcase user + API key,
    a demo org, …). Same idempotency contract as migrations — every
    statement must be re-runnable (INSERT … ON CONFLICT DO NOTHING, guarded
    UPDATE … WHERE … IS NULL, etc.). A seed whose gate env var is unset is
    skipped entirely, so dev/test environments without secrets stay clean. */
export interface Seed {
  /** Logical name (for logging + tests). */
  name: string;
  /** Env var that gates the seed. When unset the seed is skipped (no-op). */
  requiresEnv: string;
  /** Ordered idempotent bootstrap statements. */
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    name: "users",
    statements: [
      /* v1: all onboarding (AR-218), superuser (AR-312) and user_type/tier
         (AR-500, AR-654) columns are inline CREATE columns — a fresh DB now
         matches Neon in a single migration. */
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        password_hash TEXT,
        provider TEXT DEFAULT 'credentials',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        intent TEXT,
        signup_source TEXT,
        role_preference TEXT,
        is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
        tier TEXT NOT NULL DEFAULT 'basic'
          CHECK (tier IN ('anonymous','logged_in','basic','high_tier','engineering','superuser')),
        user_type TEXT NOT NULL DEFAULT 'user'
          CHECK (user_type IN ('user','engineering','admin','superuser'))
      )`,
      // AR-312 self-healing backfill: ONLY runs if no superuser currently
      // exists. After first deploy, ptengelmann@gmail.com gets the flag.
      // Subsequent boots no-op. If admins later add more superusers this
      // still no-ops (NOT EXISTS clause). The only path that re-promotes
      // ptengelmann is "all superusers demoted" — useful safety net
      // against an accidental UPDATE that strips superuser from everyone.
      `UPDATE users SET is_superuser = TRUE
         WHERE email = 'ptengelmann@gmail.com'
           AND NOT EXISTS (SELECT 1 FROM users WHERE is_superuser = TRUE)`,
      // AR-654 backfill 1: promote is_superuser rows to user_type='superuser'.
      // Guarded by "NOT EXISTS a non-'user' user_type" so re-runs no-op once a
      // row is promoted (idempotent — matches the migrator's contract) and so
      // the engineering pass below can't demote an already-promoted row.
      `UPDATE users u SET user_type = 'superuser'
         WHERE u.is_superuser = TRUE
           AND NOT EXISTS (SELECT 1 FROM users WHERE id = u.id AND user_type <> 'user')`,
      // AR-654 backfill 2: promote tier='engineering' rows to
      // user_type='engineering'. Runs AFTER the superuser pass so a row that
      // is both is_superuser=TRUE and tier='engineering' keeps 'superuser'.
      `UPDATE users u SET user_type = 'engineering'
         WHERE u.tier = 'engineering'
           AND NOT EXISTS (SELECT 1 FROM users WHERE id = u.id AND user_type <> 'user')`,
    ],
  },
  {
    // Matches the legacy auth.php ensureMagicLinkTokensTable() DDL verbatim.
    name: "magic_link_tokens",
    statements: [
      `CREATE TABLE IF NOT EXISTS magic_link_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_magic_link_email_created
         ON magic_link_tokens (email, created_at DESC)`,
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        org_id TEXT
      )`,
      // AR-289: org-scoping for /api-usage. Nullable so legacy events
      // (where no api_key org was resolvable) stay representable. The
      // composite index matches the four queries /keys/usage runs
      // (totalRequests, requestsThisMonth, requestsByDay, lastRequest)
      // when an ?org filter is in play.
      `CREATE INDEX IF NOT EXISTS idx_activity_events_user_org_event_created
         ON activity_events (user_id, org_id, event, created_at)`,
      // AR-289 backfill moved to api_keys migration — api_keys table must
      // exist before this UPDATE ... FROM api_keys runs (idempotent).
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
        revoked BOOLEAN DEFAULT FALSE,
        org_id TEXT,
        allowed_ip_cidrs TEXT[] NOT NULL DEFAULT '{}',
        training_optout BOOLEAN NOT NULL DEFAULT FALSE,
        auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ
      )`,
      // Legacy DBs may still have key NOT NULL from an older CREATE; this
      // is a no-op once the column is already nullable.
      `ALTER TABLE api_keys ALTER COLUMN key DROP NOT NULL`,
      // AR-289 backfill: copy org_id from api_keys for legacy activity_events.
      // WHERE ae.org_id IS NULL makes this a no-op on subsequent runs
      // (idempotent — matches the migrator's contract).
      `UPDATE activity_events ae
          SET org_id = ak.org_id
         FROM api_keys ak
        WHERE ae.org_id IS NULL
          AND ae.user_id = ak.user_id
          AND ak.org_id IS NOT NULL`,
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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        display_name TEXT,
        brand_url TEXT,
        logo_url TEXT
      )`,
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
    // BACKFILL — persists an idempotent loop over existing users. Re-runs are
    // a no-op (ON CONFLICT DO NOTHING / WHERE org_id IS NULL).
    name: "orgs_backfill",
    statements: [
      `INSERT INTO orgs (id, slug, name)
         SELECT 'org_' || u.id,
                LOWER(REGEXP_REPLACE(SPLIT_PART(u.email, '@', 1), '[^a-z0-9-]', '-', 'g')) || '-' || SUBSTRING(u.id, 1, 12),
                SPLIT_PART(u.email, '@', 1) || ' workspace'
           FROM users u
       ON CONFLICT DO NOTHING`,
      `INSERT INTO org_members (org_id, user_id, role)
         SELECT 'org_' || u.id, u.id, 'owner'
           FROM users u
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      `UPDATE api_keys
          SET org_id = 'org_' || user_id
        WHERE org_id IS NULL`,
    ],
  },
  {
    // Levers AR-195 — custom signal bundles.
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
    // Levers AR-196 (custom scoring presets).
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
    // Levers AR-198 — per-org peer cohorts.
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
    // ORPHANED in production. v1 adds the Neon column defaults so a fresh DB
    // and the Docker dev DB match production exactly. See DB_SYNC
    // reconciliation: Neon has plan DEFAULT 'free' and status DEFAULT 'active',
    // which the legacy Docker CREATE lacked. The SET DEFAULT statements are
    // idempotent (no-op once the defaults already match).
    name: "subscriptions",
    statements: [
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT NOT NULL,
        stripe_subscription_id TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'free'`,
      `ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'active'`,
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
    /* AR-331 (epic AR-324): renamed from report_cache. The ALTER renames an
       existing prod table; the CREATE handles fresh databases. Both are
       idempotent. AR-379: area_cache table dropped. */
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
      `CREATE INDEX IF NOT EXISTS idx_pageviews_created ON pageviews (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_pageviews_path ON pageviews (path)`,
    ],
  },
  {
    /* AR-331 (epic AR-324): renamed from report_history. Content is score
       time-series. v1 also converges the owned sequence on Neon's name
       (report_history_id_seq vs Docker's score_history_id_seq) so the two
       databases agree at the catalog level. ALTER SEQUENCE ... IF EXISTS is a
       no-op where the source sequence is already absent. */
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
      `ALTER SEQUENCE IF EXISTS score_history_id_seq RENAME TO report_history_id_seq`,
      `CREATE INDEX IF NOT EXISTS idx_score_history_postcode_intent
        ON score_history (postcode, intent, generated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_score_history_run
        ON score_history (run_id)`,
      `CREATE INDEX IF NOT EXISTS idx_score_history_engine_version
        ON score_history (engine_version)`,
    ],
  },
  {
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
    /* AR-331 (epic AR-324): the legacy reports table. After Phase 6 it is
       unreferenced; DROP CASCADE cleans up leftover constraints. */
    name: "reports",
    statements: [
      `DROP TABLE IF EXISTS reports CASCADE`,
    ],
  },
  {
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
        inspection_date TEXT,
        updated_at TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ofsted_lat ON ofsted_schools (latitude)`,
      `CREATE INDEX IF NOT EXISTS idx_ofsted_lng ON ofsted_schools (longitude)`,
    ],
  },

  /* ====================================================================
     SIGNAL STORE (restructure Phase 1, AR-171 / epic AR-169)
     ==================================================================== */
  {
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
        region TEXT,
        PRIMARY KEY (geo_type, geo_code)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_geo_entities_country ON geo_entities (country)`,
      `CREATE INDEX IF NOT EXISTS idx_geo_entities_region ON geo_entities (region)`,
    ],
  },
  {
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
      `UPDATE geo_entities ge SET region = gr.region
         FROM (SELECT DISTINCT lsoa_code, region FROM geo_lookup WHERE region IS NOT NULL) gr
        WHERE ge.geo_type = 'lsoa' AND ge.geo_code = gr.lsoa_code AND ge.region IS NULL`,
    ],
  },
  {
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
      `CREATE INDEX IF NOT EXISTS idx_signal_values_lsoa_signal
        ON signal_values (geo_type, geo_code, signal_key)`,
      `CREATE INDEX IF NOT EXISTS idx_signal_values_signal
        ON signal_values (signal_key)`,
    ],
  },
  {
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
        engine_version TEXT,
        captured_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (signal_key, geo_type, geo_code, observed_period)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_signal_timeseries_series
        ON signal_timeseries (signal_key, geo_type, geo_code, observed_period DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_signal_timeseries_lsoa_signal_period
        ON signal_timeseries (geo_type, geo_code, signal_key, observed_period DESC)`,
    ],
  },
  {
    name: "signal_fk_constraints",
    statements: [
      // AR-809: FK constraints on signal tables + drop dead column from signal_timeseries.
      // Idempotent: DO blocks swallow duplicate_object / duplicate_table errors.
      `DO $$ BEGIN
        ALTER TABLE signal_values ADD CONSTRAINT fk_signal_values_signal_key
          FOREIGN KEY (signal_key) REFERENCES signals(key) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_timeseries ADD CONSTRAINT fk_signal_timeseries_signal_key
          FOREIGN KEY (signal_key) REFERENCES signals(key) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_percentiles ADD CONSTRAINT fk_signal_percentiles_signal_key
          FOREIGN KEY (signal_key) REFERENCES signals(key) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_values VALIDATE CONSTRAINT fk_signal_values_signal_key;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_timeseries VALIDATE CONSTRAINT fk_signal_timeseries_signal_key;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_percentiles VALIDATE CONSTRAINT fk_signal_percentiles_signal_key;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_values ADD CONSTRAINT fk_signal_values_source_snapshot
          FOREIGN KEY (source_snapshot_id) REFERENCES source_snapshots(id) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_values VALIDATE CONSTRAINT fk_signal_values_source_snapshot;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE signal_timeseries DROP COLUMN IF EXISTS source_snapshot_id;
      END $$`,
    ],
  },
  {
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
  {
    name: "geo_fk_constraints",
    statements: [
      // AR-810: FK constraints from peer_assignments + geo_lookup to geo_entities,
      // plus the geo_type discriminator column geo_lookup needs to reference the
      // composite PK. Backfill is DDL-only (DEFAULT 'lsoa'), no runtime DML.
      `ALTER TABLE geo_lookup ADD COLUMN IF NOT EXISTS geo_type TEXT NOT NULL DEFAULT 'lsoa'`,
      `DO $$ BEGIN
        ALTER TABLE peer_assignments ADD CONSTRAINT fk_peer_geo
          FOREIGN KEY (geo_type, geo_code) REFERENCES geo_entities(geo_type, geo_code) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE peer_assignments ADD CONSTRAINT fk_peer_peer_geo
          FOREIGN KEY (geo_type, peer_geo_code) REFERENCES geo_entities(geo_type, geo_code) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE geo_lookup ADD CONSTRAINT fk_geo_lookup_entity
          FOREIGN KEY (geo_type, lsoa_code) REFERENCES geo_entities(geo_type, geo_code) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE peer_assignments VALIDATE CONSTRAINT fk_peer_geo;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE peer_assignments VALIDATE CONSTRAINT fk_peer_peer_geo;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
      `DO $$ BEGIN
        ALTER TABLE geo_lookup VALIDATE CONSTRAINT fk_geo_lookup_entity;
      EXCEPTION WHEN undefined_object THEN NULL;
      END $$`,
    ],
  },

  /* ====================================================================
     MONITOR (restructure Phase 5, AR-169)
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

/* ── Seeds ──────────────────────────────────────────────────────────────
   Env-driven bootstrap data, run AFTER migrations by migrate.ts's runSeeds.
   These are not schema — they turn an operator-supplied secret into durable
   rows so a fresh install is fully autonomous (no manual SQL). */

/** Plaintext showcase API key (operator-supplied via env). The DB only ever
    stores the sha-256 hash — the plaintext lives in the Render + Vercel
    secrets, never in Postgres or git. */
const showcaseKey = process.env.SEED_SHOWCASE_API_KEY ?? "";
const showcaseKeyHash = createHash("sha256").update(showcaseKey).digest("hex");
const showcaseKeyPreview = showcaseKey
  ? `${showcaseKey.slice(0, 12)}...${showcaseKey.slice(-4)}`
  : "";

/** SEEDS: the ordered registry of bootstrap seeds. */
export const SEEDS: Seed[] = [
  {
    // Showcase account backing the public /showcase/* pages. The web app
    // calls the live API with this key (SHOWCASE_API_KEY on Vercel holds the
    // same plaintext). Idempotent: re-running on a deployed DB is a no-op
    // (ON CONFLICT DO NOTHING). Gate env = SEED_SHOWCASE_API_KEY.
    name: "showcase",
    requiresEnv: "SEED_SHOWCASE_API_KEY",
    statements: [
      `INSERT INTO users (id, email, name, provider, email_verified)
       VALUES ('user_showcase', 'showcase@onegoodarea.local', 'Showcase', 'credentials', TRUE)
       ON CONFLICT (id) DO NOTHING`,
      `INSERT INTO orgs (id, slug, name)
       VALUES ('org_user_showcase', 'showcase', 'Showcase workspace')
       ON CONFLICT (id) DO NOTHING`,
      `INSERT INTO org_members (org_id, user_id, role)
       VALUES ('org_user_showcase', 'user_showcase', 'owner')
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      `INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
       VALUES ('sub_showcase', 'user_showcase', 'cus_showcase', 'sandbox', 'active')
       ON CONFLICT (user_id) DO NOTHING`,
      `INSERT INTO api_keys (id, key_hash, key_prefix, user_id, name, org_id)
       VALUES ('key_showcase', '${showcaseKeyHash}', '${showcaseKeyPreview}', 'user_showcase', 'Showcase', 'org_user_showcase')
       ON CONFLICT (id) DO NOTHING`,
    ],
  },
];