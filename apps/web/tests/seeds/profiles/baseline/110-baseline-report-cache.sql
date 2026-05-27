DELETE FROM report_cache
WHERE cache_key = 'seed:baseline:london:moving';

INSERT INTO report_cache (cache_key, report, area, score, created_at, hit_count)
VALUES (
  'seed:baseline:london:moving',
  '{
    "area":"London",
    "postcode":"SW1A 1AA",
    "intent":"moving",
    "areaiq_score":82,
    "summary":"Deterministic seeded report for local runtime validation."
  }'::jsonb,
  'London',
  82,
  '2026-01-01T00:30:00Z',
  0
);

INSERT INTO runtime_seed_runs (seed_version, seed_profile, applied_at)
VALUES ('v1', 'baseline', now())
ON CONFLICT (seed_version, seed_profile)
DO UPDATE SET applied_at = EXCLUDED.applied_at;

