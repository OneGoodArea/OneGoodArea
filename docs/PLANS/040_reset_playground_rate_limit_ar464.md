# Plan 040 — QA scripts: reset playground rate-limit + bootstrap test key Make targets

**Status:** Implementation
**JIRA:** AR-464 (To Do → In Progress → Done)
**Follow-up:** AR-478 (cleanup old e2e + bootstrap fallback after this is proven)
**Branch:** `feat/AR-464-reset-playground-rate-limit` (off `main`)
**Owner:** Pedro / Claude
**Started:** 2026-07-15

## Purpose

QA testing of the Playground exhausts the daily 60-call IP rate limit with no way
to reset it without waiting 24h or a destructive full DB reset. Create targeted
scripts and Make targets so QA can:

1. Reset their own playground IP rate limit in seconds
2. Bootstrap test users via a proper top-level script
3. Run both through clean `make` targets surfaced in `make help`

## Git workflow

Branch: `feat/AR-464-reset-playground-rate-limit` off `main`.

Every commit leaves the system runnable and deployable — `make help`, `npm test`,
`npm run build` all pass at every point. No `include` points to a missing file.

| # | Commit | What | Safe because |
|---|---|---|---|
| 1 | `feat(scripts): add reset-playground-rate-limit script` | `scripts/reset-playground-rate-limit.mjs` | New file only, no existing code touched |
| 2 | `feat(scripts): add standalone bootstrap-test-key script` | `scripts/bootstrap-test-key.mjs` | New file only. Original fallback untouched. |
| 3 | `chore(build): create scripts Make target file` | `build/targets-scripts.mk` | Created but NOT yet included — unreachable, no-op |
| 4 | `chore(build): wire scripts targets into Makefile and help` | Update `Makefile` + `build/help.mk` | Atomic: file exists + reference added together |
| 5 | `docs: add reset-playground-rate-limit quick reference` | `docs/TESTING/reset-playground-rate-limit.md` | New doc file only |
| 6 | `test(e2e): add playground rate-limit reset E2E scenario` | `e2e/` directory + scenario | New directory, no existing code touched |

## Steps

### Step 1 — Create `scripts/reset-playground-rate-limit.mjs`

Standalone `.mjs` following the pattern of `scripts/check-orgs.mjs` and
`scripts/mint-ephemeral-key.mjs`.

- `parseArgs` from `node:util` for CLI flags
- `neon()` from `@neondatabase/serverless` with `process.env.DATABASE_URL`
- Production guard: refuse if `NODE_ENV === 'production'`
- Native `fetch` for IP auto-detection via `https://api.ipify.org`

**CLI interface:**

```
node scripts/reset-playground-rate-limit.mjs --ip 1.2.3.4 --confirm
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--ip` | No | Auto-detect | IP address to clear |
| `--confirm` | No | false (dry-run) | Actually DELETE rows |
| `--help` / `-h` | No | — | Show usage |

**Logic:**
1. Load config, refuse if production
2. Resolve IP: `--ip` flag or fetch from `https://api.ipify.org`
3. Count rows: `SELECT COUNT(*) FROM rate_limit_entries WHERE identifier = 'playground:ip:{ip}'`
4. Dry-run: print count and exit
5. Confirm: `DELETE` and print rows deleted

**Output (dry-run):**
```
IP: 203.0.113.42
Rows found: 47
[DRY RUN] Run with --confirm to delete.
```

**Output (confirm):**
```
IP: 203.0.113.42
Deleted 47 rate-limit rows for playground:ip:203.0.113.42
```

### Step 2 — Create `scripts/bootstrap-test-key.mjs`

New standalone `.mjs` mimicking `apps/api/src/scripts/bootstrap-test-key.ts`
using raw SQL + `node:crypto` instead of internal API imports:

- `crypto.pbkdf2Sync` for password hashing (replaces `hashPassword`)
- Direct `INSERT INTO api_keys` matching `createApiKey`'s scheme (SHA-256 hashed key)
- Direct `INSERT INTO orgs` + `org_members` for personal org (replaces `createPersonalOrgForUser`)
- Direct `INSERT INTO subscriptions` for plan assignment
- Same CLI flags, production guard, and output format

**Keep original as fallback** — ship both (apps/api/src/scripts/bootstrap-test-key.ts
still works via its npm script). Delete the original only after AR-478.

### Step 3 — Create `build/targets-scripts.mk`

```makefile
.PHONY: scripts-bootstrap-test-key scripts-reset-playground-limit

scripts-bootstrap-test-key: ## Bootstrap a test user + API key (local dev only)
	node scripts/bootstrap-test-key.mjs $(ARGS)

scripts-reset-playground-limit: ## Reset playground daily IP rate limit (local dev only)
	node scripts/reset-playground-rate-limit.mjs $(ARGS)
```

### Step 4 — Update `Makefile`

```makefile
include build/targets-scripts.mk
```

Added after existing includes (line 5).

### Step 5 — Update `build/help.mk`

Insert a **Scripts** section before the "Info" section (before line 19):

```makefile
	@echo "\033[1;36mScripts\033[0m"
	@grep -hE '^scripts-[a-zA-Z0-9._-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-32s\033[0m %s\n", $$1, $$2}'
	@echo ""
```

### Step 6 — Create `docs/TESTING/reset-playground-rate-limit.md`

Quick-reference covering: when to use, prerequisites, dry-run vs confirm, auto vs
explicit IP, troubleshooting.

### Step 7 — Create `e2e/playground-rate-limit.mjs`

New file in a top-level `e2e/` directory (not extending the old timestamped script).
Scenario:

1. Make playground requests until the IP rate limit is exhausted
2. Verify the playground blocks (429 or equivalent)
3. Run the reset script against the test DB
4. Verify playground requests succeed again

Runs against the compose test stack.

### Step 8 — Cleanup (AR-478, out of initial scope)

After this plan is merged and the new scripts are proven:
- Refactor `e2e/` properly (move old e2e scenarios)
- Delete old `apps/api/src/scripts/bootstrap-test-key.ts`
- Delete `scripts/e2e-2026-07-01.mjs`

## Reference files

| File | Purpose |
|---|---|
| `scripts/check-orgs.mjs` | Pattern for standalone `.mjs` scripts |
| `scripts/mint-ephemeral-key.mjs` | Pattern with crypto + direct SQL |
| `apps/api/src/scripts/bootstrap-test-key.ts` | Script to mimic (Step 2 source) |
| `apps/api/src/infrastructure/rate-limit.ts` | Shows `rate_limit_entries` schema |
| `apps/api/src/modules/playground/rate-limit.ts` | Shows `playground:ip:{ip}` identifier |
| `build/help.mk` | Add Scripts section |
| `build/targets-app.mk` | Pattern for Make target files |

## Verification

1. `make help` → shows "Scripts" section with both targets
2. `make scripts-reset-playground-limit` → dry-run, prints count
3. `make scripts-reset-playground-limit ARGS="--confirm"` → deletes for auto-detected IP
4. `make scripts-reset-playground-limit ARGS="--ip 1.2.3.4 --confirm"` → deletes for specific IP
5. `make scripts-bootstrap-test-key` → creates test user, prints credentials
6. `make scripts-bootstrap-test-key ARGS="--email qa@test.local --plan sandbox"` → custom params
7. Reset script refuses when `NODE_ENV=production`
8. E2E scenario: fill → block → reset → verify cycle passes
