# 076 — Showcase: Monitor tab → Portfolio tab (cap 20, POST /changes) + always-on score explain

**Purpose:** Let testers exercise the full Portfolio (Monitor) product in the PropTech showcase: the tab is renamed from "Monitor" to "Portfolio", the tracked-area cap rises from 10 to 20, and the previously-unexposed `POST /v1/portfolios/:id/changes` endpoint gets a BFF + UI ("Re-scan"). Separately, apply Option A to the Scores tab: the "Why this score?" explanation becomes always visible (toggle removed).

**Linked Jira:**
- Task: AR-764 (AR Sprint 8)

**Dependency:** AR-758 (PR #517) landed the portfolio CRUD + remove-area BFF; the GET `changes` read-only probe is from AR-399. This plan builds on those.

## Scope

### In scope
- `apps/web/src/modules/showcase-proptech/constants.ts` — `TabId` `"monitor"` → `"portfolio"`, tab label/blurb, `MAX_AREAS` 10 → 20.
- `apps/web/src/modules/showcase-proptech/MonitorTab.tsx` → rename to `PortfolioTab.tsx`; `ProptechShowcase.tsx` import + switch.
- `apps/web/src/modules/showcase-proptech/proptech.css` — rename all `prx-monitor__*` selectors to `prx-portfolio__*`; remove `.prx-scores__explain-toggle`.
- `apps/web/src/modules/showcase-proptech/ScoresTab.tsx` — Option A: always render `.prx-scores__explain`, drop `explainOpen` state + toggle + reset.
- `apps/web/src/app/api/showcase/portfolios/[id]/changes/route.ts` — add `POST` handler (currently GET-only).
- `apps/web/src/lib/showcase/api.ts` — add `triggerPortfolioChanges()` wrapper (POST, `emit: false` demo-safe); fix `removePortfolioArea` typing.
- `packages/contracts/src/portfolios.ts` — `RemoveAreaResponseSchema` allow `removed: false` (the API is idempotent; see `removeArea` in `apps/api/src/modules/monitor/portfolio.ts:88`).
- Unit tests mirroring `apps/web/tests/unit/showcase-proptech-constants.test.ts` (tab id/cap regression).

### Explicitly out of scope
- No dedupe change: `DELETE /v1/portfolios/:id/areas/:area` (AR-758) is the only portfolio per-area removal; the watchlist `DELETE /me/watchlist/:id` is a separate `saved_areas` feature. A code comment documents this.
- No API-side changes to `POST /v1/portfolios/:id/changes` (already supports `emit`).
- No changes to the Signals tab or the postcode form.

## Decisions
- **emit default:** `emit: false` in the showcase POST (demo-safe, mirrors the GET probe). UI hint notes webhooks are suppressed.

## Verification (containers — docker)
- `make build-web-test-image` + `make web-test-container` — web unit tests green.
- `make app-lint` + `make app-typecheck`.
- Grep: zero remaining `prx-monitor` / `MonitorTab` / `TabId = "monitor"`.

## Verification results (2026-08-08)
- `make build-web-test-image`: image built (Next.js `build` stage passed → app compiles).
- `make web-test-container`: 35 files / 338 tests passed (includes new constants regression tests).
- `make api-test-container`: 104 files / 1277 tests passed (contracts schema widening is safe).
- `tsc --noEmit` (web + contracts) in web-test container: OK.
- Grep: no `prx-monitor` / `MonitorTab` / `setExplainOpen` / `explain-toggle` in the showcase module.

## Rollback
- `git revert <sha>` of the commits; the rename touches only the showcase module + one contract schema (widening `removed` to `z.boolean()` is backwards-compatible).

## Notes for reviewers
- The GET `changes` route (AR-399) already runs `emit: false`; the new POST is the side-effect-capable variant, gated in the BFF to `emit: false` for demo safety.
- The CSS rename is mechanical: `prx-monitor__` → `prx-portfolio__` across `proptech.css` and `PortfolioTab.tsx`.
