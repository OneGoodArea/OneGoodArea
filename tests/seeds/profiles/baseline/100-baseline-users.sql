DELETE FROM saved_areas
WHERE user_id IN ('user_seed_alice', 'user_seed_bob');

DELETE FROM activity_events
WHERE user_id IN ('user_seed_alice', 'user_seed_bob');

DELETE FROM users
WHERE id IN ('user_seed_alice', 'user_seed_bob')
   OR email IN ('seed.alice@onegoodarea.local', 'seed.bob@onegoodarea.local');

INSERT INTO users (id, email, name, provider, email_verified, created_at)
VALUES
  ('user_seed_alice', 'seed.alice@onegoodarea.local', 'Seed Alice', 'credentials', TRUE, '2026-01-01T00:00:00Z'),
  ('user_seed_bob', 'seed.bob@onegoodarea.local', 'Seed Bob', 'google', TRUE, '2026-01-01T00:05:00Z');

INSERT INTO saved_areas (id, user_id, area, postcode, intent, score, created_at)
VALUES
  ('saved_seed_alice_london', 'user_seed_alice', 'London', 'SW1A1AA', 'moving', 82, '2026-01-01T00:10:00Z'),
  ('saved_seed_bob_manchester', 'user_seed_bob', 'Manchester', 'M11AE', 'business', 74, '2026-01-01T00:15:00Z');

INSERT INTO activity_events (id, user_id, event, metadata, created_at)
VALUES
  (
    'evt_seed_login_alice',
    'user_seed_alice',
    'auth.login',
    '{"source":"seed","profile":"baseline"}'::jsonb,
    '2026-01-01T00:20:00Z'
  ),
  (
    'evt_seed_report_bob',
    'user_seed_bob',
    'report.generated',
    '{"source":"seed","profile":"baseline","intent":"business"}'::jsonb,
    '2026-01-01T00:25:00Z'
  );

