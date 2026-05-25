CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS runtime_seed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_version text NOT NULL,
  seed_profile text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seed_version, seed_profile)
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  image text,
  password_hash text,
  provider text DEFAULT 'credentials',
  email_verified boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_areas (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  area text NOT NULL,
  postcode text NOT NULL,
  intent text NOT NULL DEFAULT 'research',
  score integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, area)
);

CREATE TABLE IF NOT EXISTS report_cache (
  id serial PRIMARY KEY,
  cache_key text UNIQUE NOT NULL,
  report jsonb NOT NULL,
  area text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  hit_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_events (
  id text PRIMARY KEY,
  user_id text,
  event text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

