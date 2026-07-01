# Decision log — timeline

Major decisions in chronological order. Detailed reasoning lives in the linked ADR; this is the read-in-five-minutes timeline.

## 2026 Q1 — engine v2 + pricing v2

- **Engine v2.0.2 frozen** — confidence per dimension + version stamping. Golden-tested. `apps/api/src/modules/reports/scoring-engine/v2.ts` is the canonical implementation; v3 would mean a new module + cutover.
- **Pricing v2 shipped on Stripe** — 6 tiers + MCP add-on. See `apps/api/src/modules/billing/plans.ts`.
- **Methodology versioning** — `X-Engine-Version` header pinning (AR-131).
- **Monorepo split** — apps/web (Vercel) + apps/api (Render) + packages/contracts. Decoupling rationale in `project_signal_first_pivot.md`.

## 2026 Q2 — signal-first restructure

- **Positioning v3** — "the data and intelligence layer underneath UK property workflows". Reframed from "deterministic UK location intelligence layer".
- **4 products** instead of "intent-driven scoring": Signals + Scores + Monitor + Intelligence.
- **Persisted signal store** (ADRs 0001-0010) — 7 tables, store-read-through with live fallback, monthly time-series append.
- **HM Land Registry + Police.uk into store** (ADRs 0011-0016) — the corpus moves; 24 months prices + 36 months crime loaded.
- **Intelligence layer** (ADRs 0017-0026) — typed query plane + compound rank + 9 derived signals + peers + insights + forecast + 92.9% AI eval baseline. Signal-first restructure merged via PR #60 (`369c7b9`).

## 2026 Q2 late — Levers epic (per-org configurability)

8 commits, 8 ADRs (0027-0034), all on `feat/levers`, squash-merged via PR #61 (`3f51003`):

- Foundation (orgs/org_members/api_keys.org_id) + auth signature change
- Org CRUD + signup auto-org + last-owner guard
- Custom signal bundles + `?bundle=` filter
- Custom scoring presets + `preset_id` on `/v1/score`
- Methodology pinning per org
- Peer cohorts + `cohort_id` filter on `/v1/peers`
- Full RBAC (admin tier honored, typed 403 codes)
- White-label (`display_name`, `brand_url`) + per-key IP allowlist

## 2026 Q2 late — repo organisation

- **Plan 006: test/prod separation** — every `*.test.ts` moved out of `src/` into `tests/`; `@/` alias added to apps/api + reused in apps/web. ~125 test files moved, 461 imports rewritten.
- **Plan 007: documentation organisation** — three-tier `docs/` hierarchy. Test artifacts routed to gitignored `.artifacts/`. Manual QA docs centralised under `docs/TESTING/`.

## See also

- [`README.md`](./README.md) — ADRs by category
- [`docs/DECISIONS/README.md`](./README.md) — full ADR table
