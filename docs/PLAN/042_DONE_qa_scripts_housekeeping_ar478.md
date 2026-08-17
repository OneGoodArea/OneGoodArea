# Plan 042 — QA scripts housekeeping: retire old e2e + bootstrap fallback

**Status:** Implementation
**JIRA:** AR-478 (To Do → In Progress → Done)
**Linked plan:** Plan 040 (AR-464) — the scripts this plan cleans up
**Branch:** `chore/AR-478-qa-scripts-housekeeping` (off `main`)
**Owner:** Pedro / Claude
**Started:** 2026-07-18

## Purpose

AR-464 shipped the proper QA tooling (`scripts/reset-playground-rate-limit.mjs`,
`scripts/bootstrap-test-key.mjs`, `e2e/playground-rate-limit.mjs`, Make targets).
Two legacy artifacts were intentionally kept as fallbacks. Now that the new
scripts are merged and proven, remove the dead weight:

1. Delete the old timestamped ad-hoc script `scripts/e2e-2026-07-01.mjs`.
2. Delete the old `apps/api/src/scripts/bootstrap-test-key.ts` fallback and its
   `bootstrap:test-key` npm script (the `.mjs` is the canonical path now).

The `e2e/` directory already exists (Plan 040 Step 7), so no directory creation
is needed — this plan is purely deletion + reference cleanup.

## Pre-conditions (all met, per AR-478)

- [x] AR-464 fully implemented; `scripts/bootstrap-test-key.mjs` working/tested
- [x] New E2E scenario `e2e/playground-rate-limit.mjs` in place
- [x] No in-flight work depends on the old `scripts/e2e-2026-07-01.mjs`

## Git workflow

Branch: `chore/AR-478-qa-scripts-housekeeping` off `main`.

Every commit leaves the system runnable: `make help`, `npm test`, `npm run build`
all pass; no dangling references to deleted files.

| # | Commit | What | Safe because |
|---|---|---|---|
| 1 | `chore(scripts): remove old timestamped e2e script` | Delete `scripts/e2e-2026-07-01.mjs` | Standalone legacy file |
| 2 | `chore(scripts): repoint setup-test-tokens to .mjs` | Update `scripts/setup-test-tokens.sh` + `docs/API-TEST-README.md` to use `make scripts-bootstrap-test-key` | Keeps tooling working after npm script removal |
| 3 | `chore(scripts): drop bootstrap-test-key .ts fallback` | Delete `apps/api/src/scripts/bootstrap-test-key.ts` + remove `bootstrap:test-key` from `apps/api/package.json` | `.mjs` is canonical; references repointed in step 2 |

## Steps

### Step 1 — Delete `scripts/e2e-2026-07-01.mjs`

Confirm nothing references it (grep for `e2e-2026-07-01`), then delete.

### Step 2 — Repoint callers of the `bootstrap:test-key` npm script

The npm script is still referenced and must be repointed to the `.mjs` Make
target BEFORE the fallback is deleted:

- `scripts/setup-test-tokens.sh` (lines ~32, 37): uses `make bootstrap-test-key`
  → change to `make scripts-bootstrap-test-key`.
- `docs/API-TEST-README.md` (lines ~72, 76, 153, 283): references
  `make bootstrap-test-key` → update to `make scripts-bootstrap-test-key`.
- `docs/API-REFERENCE/AUTHENTICATION.md` (line ~22): references
  `npm run bootstrap:test-key -w @onegoodarea/api` → update to
  `node scripts/bootstrap-test-key.mjs` (or the Make target).

> Note: `make bootstrap-test-key` was never a real target (the real target is
> `scripts-bootstrap-test-key`). `setup-test-tokens.sh` likely relied on an old
> Make recipe — verify `make bootstrap-test-key` resolves or is dead before
> repointing. Either way, point everything at `scripts-bootstrap-test-key`.

### Step 3 — Delete `apps/api/src/scripts/bootstrap-test-key.ts` fallback

1. Grep the repo for `bootstrap-test-key` and `bootstrap:test-key` usages
   (should now only hit the `.mjs` + docs).
2. Remove the `bootstrap:test-key` entry from `apps/api/package.json`
   (scripts section).
3. Delete `apps/api/src/scripts/bootstrap-test-key.ts`.

> Keep `apps/api/src/scripts/` if other scripts live there; only delete the
> single fallback file.

## Reference files

| File | Purpose |
|---|---|
| `scripts/e2e-2026-07-01.mjs` | Legacy ad-hoc e2e to delete |
| `apps/api/src/scripts/bootstrap-test-key.ts` | Fallback `.ts` to delete |
| `apps/api/package.json` | Remove `bootstrap:test-key` script |
| `scripts/bootstrap-test-key.mjs` | Canonical replacement (stays) |

## Verification

1. `grep -rn "e2e-2026-07-01" .` → no matches (except this plan + archives)
2. `grep -rn "bootstrap:test-key" .` → no matches (npm script removed)
3. `grep -rn "bootstrap-test-key" apps/api/src scripts` → only the `.mjs`
4. `make help` → still lists `scripts-bootstrap-test-key` / `scripts-reset-playground-limit`
5. `node scripts/bootstrap-test-key.mjs --help` → works (canonical path)
6. `npm test` and `npm run build` pass
