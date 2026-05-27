# ADR 0009 — Monitor v1: portfolios + bulk enrich

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** MASTER §2 (Monitor product), §8 Phase 5; ADR 0008 (scoring).

## Context

Monitor is the third product: "track my book of areas and tell me what changed."
Its killer feature (change detection + `signal.changed`/`score.changed` alerts)
needs accruing time-series, which doesn't exist yet. The foundation that *can*
ship now is the **portfolio** entity + **bulk enrich** — the "land" capability
(save a book of areas, score them all), with change detection riding the
time-series later.

## Decision

- **Two tables** (migrator-owned, additive): `portfolios` + `portfolio_areas`.
- **Scoped to `user_id`** (the api-key's user): every query filters on the owner,
  so users can't touch each other's portfolios. Re-scopes to `org_id` when Levers
  (tenancy) land.
- **`modules/monitor/portfolio.ts`**: create / list (with area counts) / get
  (with areas) / delete (manual cascade — the codebase uses no FK constraints) /
  addAreas (dedup on `(portfolio_id, area)`, capped at 200/call) / **enrichPortfolio**
  (reuses `scoreArea`, bounded concurrency 5, capped at 50 areas; per-area failures
  captured, not fatal).
- **Six endpoints** behind `OGA_SIGNALS_API` + `requireApiAccess`:
  `POST/GET /v1/portfolios`, `GET/DELETE /v1/portfolios/:id`,
  `POST /v1/portfolios/:id/areas`, `POST /v1/portfolios/:id/enrich`. Meters
  `api.portfolio.*`.
- **DTOs in contracts** (Zod): `Portfolio`, `PortfolioDetail`, `PortfolioArea`,
  `PortfolioEnrichItem` (the latter reuses `ScoreResult`).

## Consequences

**Positive**
- The Monitor land capability exists, **proven on prod** (full lifecycle: create →
  add 2 areas [dup skipped] → get → enrich [M1 1AE→53, SW1A 1AA→38, served from the
  store] → delete). Reuses scoring (no new engine).
- Ownership is enforced uniformly by `user_id`.

**Negative / accepted**
- **Enrich is synchronous + capped** (50 areas, concurrency 5). A lender's book of
  thousands needs an **async enrichment job** (a `portfolio_runs` table + worker) —
  the next Monitor increment.
- **Change detection + alerts are deferred** — they need the monthly
  `signal_timeseries` append to accrue. That + `signal.changed`/`score.changed`
  webhooks (the webhooks module already exists) is the Monitor follow-up.
- Scoped to user, not org (Levers phase).

## Alternatives considered

- **Async enrich from day one.** Rejected for v1 — synchronous + capped proves the
  product; the async job is a clean follow-up once big books exist.
- **FK cascade on `portfolio_areas`.** Rejected — the codebase uses no FK
  constraints; delete cascades manually in `deletePortfolio`.
