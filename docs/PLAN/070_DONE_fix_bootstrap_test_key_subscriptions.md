# 070 Fix `scripts/bootstrap-test-key.mjs` subscriptions INSERT

Status: planned

## Purpose

`make scripts-bootstrap-test-key` failed against a fresh DB: the `subscriptions`
INSERT omitted `stripe_customer_id`, which is `TEXT NOT NULL`
(`apps/api/src/infrastructure/db/schema.ts`). The showcase seed (`cus_showcase`)
and the billing webhook both supply it; only this script was missing it.

## Linked Jira keys

- AR-761 (Task) — fix the bootstrap script INSERTs.

## Context

- `scripts/bootstrap-test-key.mjs:133-140` inserted `(id, user_id, plan, status)`
  only → NOT NULL violation on a fresh database.
- The script also creates a personal org (`org_${userId}`) but the `api_keys`
  INSERT left `org_id` unset; the showcase seed supplies it for the same
  personal-org pattern.

## Changes

- Add `stripe_customer_id = cus_local_${userId}` to the `subscriptions` INSERT
  and its `ON CONFLICT (user_id) DO UPDATE` clause.
- Add `org_id = org_${userId}` to the `api_keys` INSERT.

## Verification

- Run `make scripts-bootstrap-test-key` against a fresh compose DB: the key
  prints and no NOT NULL error is raised.
