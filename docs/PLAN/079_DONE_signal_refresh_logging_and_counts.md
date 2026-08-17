# Plan 079 — signal-refresh logging + row counts + persisted run logs (AR-792)

## Purpose
Fix the broken signal-refresh pipeline (local container AND prod cron) by creating
the missing `.github/scripts/logging.sh`, and add before/after row-count reporting
plus timestamped run-log persistence for the tables the refresh touches.

- Jira ticket: AR-792 "Implement LOGGING levels in the refresh jobs, and containers"
- Status: **DONE** (moved In Progress → Done on PR #544 merge, commit 0efbd7c/3c71fab)
- Branch: `fix/signal-refresh-logging-counts` → merged to `main` (main now @ 0efbd7c; PR #543 already merged)

## Why it breaks today
Commit `82ec20e` ("Implemented AR-792") added `source .github/scripts/logging.sh`
plus `log_*` / `curl_quiet_flags` calls in three places —
- `apps/api/scripts/signal-refresh.sh:22`
- `.github/scripts/retry.sh:14`
- `.github/workflows/signal-refresh.yml:61`
— but never created `.github/scripts/logging.sh`. Result: every `make signal-refresh`
and every prod cron run aborts immediately at the `source` line
(`/app/.github/scripts/logging.sh: No such file or directory`).

## Changes
1. **`.github/scripts/logging.sh`** (new) — bash companion to
   `apps/api/src/modules/tracking/structured-logger.ts`: levels
   trace<debug<verbose<info<warn<error (rank 0..5), `OGA_LOG_LEVEL` (default info),
   ANSI colors honoring `FORCE_COLOR`/`NO_COLOR`/TTY, and `curl_quiet_flags()`.
   Sourced, idempotent (`OGA_LOGGING_SOURCED` guard).
2. **`apps/api/scripts/row-counts.ts`** (new) — `@neondatabase/serverless` driver
   honoring `DATABASE_URL` + `NEON_FETCH_ENDPOINT` (same pattern as
   `apps/api/src/infrastructure/db/client.ts`). Modes: `print` (markdown table),
   `snapshot` (JSON to stdout), `diff <before> <after>` (delta with +/- coloring).
   Counts the 10 refresh-affected tables: source_snapshots, geo_entities,
   geo_lookup, signal_values, signals, signal_percentiles, signal_timeseries,
   peer_assignments, signal_bundles, ofsted_schools.
3. **`apps/api/package.json`** — add `"row-counts": "tsx ./scripts/row-counts.ts"`.
4. **`apps/api/scripts/signal-refresh.sh`** — before the pipeline: print counts +
   snapshot to `data/logs/rowcounts.before.json`; after: snapshot to
   `rowcounts.after.json`, print counts, print delta.
5. **`build/stack.mk`** (`signal-refresh` target) — replace `run --rm` with
   `run --rm -T` (kills "failed to resize tty, using default size") wrapped in
   `bash -o pipefail -c` piping through
   `tee data/logs/signal-refresh-$(date +%Y%m%d-%H%M%S).log`, preserving the
   container's exit code via `PIPESTATUS`. Creates `data/logs/` on the host
   (repo root is bind-mounted at /app, and /data/ is gitignored).

## GIT workflow
- Branch: `fix/signal-refresh-logging-counts` from `main`.
- Commits:
  1. `fix(refresh): add missing .github/scripts/logging.sh (AR-792)`
  2. `feat(refresh): row-counts script for before/after table counts (AR-792)`
  3. `feat(refresh): wire row-counts before/after/delta into signal-refresh.sh (AR-792)`
  4. `feat(refresh): persist signal-refresh run logs to data/logs/ (AR-792)`
- Push branch; open PR (gh absent → GitHub MCP). Title: `AR-792 fix signal-refresh logging + row counts + run-log persistence`.
- Link PR URL into the AR-792 issue.
- On merge → close AR-792 (transition Done).

## Verification
- `npx tsc --noEmit` in apps/api (typecheck row-counts.ts).
- `bash -n .github/scripts/logging.sh` and source it in a scratch shell; verify
  `log_info`, `log_warn`, `curl_quiet_flags` emit correctly under
  `OGA_LOG_LEVEL=debug FORCE_COLOR=1`.
- `make signal-refresh-build` → image `onegoodarea/api-refresh:local` builds.
- `make signal-refresh` → boots postgres+neon-proxy, runs the pipeline ends-to-end,
  writes `data/logs/signal-refresh-*.log` containing BEFORE counts, pipeline output,
  AFTER counts, DELTA, and the JSON snapshots.

## Acceptance criteria
- [x] `.github/scripts/logging.sh` exists and is sourced without error locally and in CI.
- [x] `make signal-refresh` no longer fails on the `source` line.
- [x] Run log is timestamped under `data/logs/` (gitignored).
- [x] Before/after/delta row counts appear in the run log.
