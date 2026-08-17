# 071 Retire obsolete playground rate-limit tooling

Status: planned

## Purpose

The legacy custom playground surface — `POST /playground/token`,
`POST /playground/proxy`, and the `playground:ip:*` / `playground:global`
rate-limit identifiers — was retired in Plan 050 (AR-504). The rate-limit
reset harness that targets it is dead code: nothing in `apps/api` writes or
reads those identifiers anymore, so the tool can only delete rows nothing
ever creates.

## Linked Jira keys

- AR-762 (Task) — retire the obsolete harness.
- AR-458 (Task, Done — Won't Do) — superseded by Plan 050; closed in this
  cleanup.

## Changes

- `build/targets-scripts.mk`: remove `scripts-reset-playground-limit` from
  `.PHONY` and delete the target.
- Delete: `scripts/reset-playground-rate-limit.mjs`, `.sql`,
  `e2e/playground-rate-limit.mjs` (sole file in `e2e/`, dir removed),
  `docs/TESTING/reset-playground-rate-limit.md`.
- `docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`: drop the `## Playground (2)`
  section, note the endpoints under Removed, update the Summary (TOTAL
  106 → 104) and Last updated.
- `docs/PLANS/033-fresh-install.md`: `make bootstrap-test-key` →
  `make scripts-bootstrap-test-key` (that target never existed).

Historical plan docs (032/038/040/042/046/047/050/051/059) are left as
records. Compose verified clean — no references to update.

## Verification

- `make help` no longer lists `scripts-reset-playground-limit`.
- `grep -r '/playground/token|/playground/proxy'` hits only historical plan
  docs.
- `make scripts-reset-playground-limit` → "No rule to make target".
