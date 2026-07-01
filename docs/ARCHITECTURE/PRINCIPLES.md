# Methodology Principles

The rules that everything in the codebase obeys. These are what make the product saleable to regulated buyers.

1. **AI never sets the numbers.** LLM emits JSON plan → `QueryPlanSchema.strict()` validates → deterministic executor runs it. Invalid plans → HTTP 422, never re-interpreted.

2. **Deterministic core, audit-replayable.** Every response echoes `plan_source` (`"client"` or `"nl"`). NL queries reproducible as `{plan}` programmatic calls.

3. **Engine version pinned.** `X-Engine-Version: 2.0.0` stamped on every score. Customers can pin via header. v2 frozen with golden tests.

4. **Idempotency everywhere.** `ON CONFLICT DO UPDATE`/`DO NOTHING`. `CREATE TABLE IF NOT EXISTS`. Monthly cron safe to re-run.

5. **Confidence + provenance per signal.** Every `signal_values` row: `confidence` (0.0-1.0) + `confidence_reason` + `source_snapshot_id` + `engine_version`.

6. **Strangler-fig + dark flags.** New endpoints behind `OGA_SIGNALS_API` (404 when off). New tables only — no destructive ALTERs.

7. **No invented claims.** Marketing/pricing/docs can't reference features not in code.
