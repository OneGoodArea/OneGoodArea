# AR-204 — Product pages spec pack

> **Status:** Locked. Drives the next 4 product-page PRs (`/products/signals`, `/scores`, `/monitor`, `/intelligence`) plus the 2 prerequisite infra PRs (demo proxy backend + `<TryItPanel />`).
> **Compiled:** 2026-05-31 from 4 parallel recon agents over ADRs 0001-0035 + `apps/api` Fastify routes + `packages/contracts` Zod schemas + a sample test per surface (407k subagent tokens).
> **Tone:** every claim is verified against the ADR or the live code at the time of compilation. Page authors MUST verify against the current code before committing copy — see "Verification protocol" below.

This is the index for the 4 product-page specs. Each surface has its own file with the full reference material (thesis, primitive/Zod contract, under-the-hood, endpoints, compound grammar, ICP value, demo strategy, methodology proof, gotchas):

- [Signals](./spec-signals.md) — deterministic, addressable UK area-data layer (`GET /v1/area`).
- [Scores](./spec-scores.md) — deterministic composite scoring, 4 presets (`POST /v1/score`).
- [Monitor](./spec-monitor.md) — portfolios + on-demand change-detection + signed webhooks.
- [Intelligence](./spec-intelligence.md) — typed query + insight plane, 6 plan ops (`POST /v1/query`).

The **Gotchas** lists in each file are the most important part: they exist to stop us inventing marketing claims the code does not back.

---

## Verification protocol

Before committing copy on any product page, I MUST:

1. Re-read the primary ADR(s) listed in that surface's `methodology_proof`.
2. Spot-check the cited route file (`apps/api/src/modules/<surface>/routes.ts` or `apps/api/src/app.ts`) — confirm the path, the verb, the request shape.
3. Spot-check `packages/contracts/src/<surface>.ts` for the Zod schema if the page renders a response shape.
4. If any claim has drifted, update the surface spec AND the page copy in the same commit.

Memory + this spec pack are NOT the source of truth. The code is.

---

## Cross-surface summary

| Surface | One-line | Primary endpoint | Compound grammar lives at |
|---|---|---|---|
| [Signals](./spec-signals.md) | Deterministic, addressable UK area-data layer at LSOA × month grain | `GET /v1/area` | `/v1/areas` (single-signal AND threshold + scope) |
| [Scores](./spec-scores.md) | Deterministic composite scoring with 4 presets × different 5 dims each | `POST /v1/score` | `weights[]` override + `preset_id` saved presets |
| [Monitor](./spec-monitor.md) | Portfolios + on-demand change-detection + signed webhooks | `POST /v1/portfolios/:id/changes` | Body knobs: baseline, threshold_pct, min_transactions, emit |
| [Intelligence](./spec-intelligence.md) | Typed query + insight plane. 6 plan ops. Dual mode (programmatic plan OR NL) | `POST /v1/query` | `signals[]` 1-8 entries × 11 filter ops + sort_by (rank_areas compound) |

**ICP-to-surface lead map** (what each ICP narrative leans on per page):

| ICP | Signals page leads with | Scores page leads with | Monitor page leads with | Intelligence page leads with |
|---|---|---|---|---|
| PropTech | ⭐ Strongest | One endpoint, four flavours | Movers feed for customers | NL search + similar areas |
| InsureTech | Deterministic dated inputs | Configurable composite | ⭐ Strongest | Peer-relative anomaly |
| Lender | Audit + percentile-normalised | ⭐ Strongest (versioning) | Portfolio drift | Auditable AI screening |
| CRE / site selection | Single-signal threshold + LAD | Site-selection preset | Watchlist of candidates | ⭐ Strongest (compound) |
| Public sector | Country-scoped percentiles | Research preset, FOI-defensible | Lineage-stamped change report | ⭐ Defensibility |

(One ⭐ per row indicates which page leads with that ICP. Every page covers all 5 ICPs.)

---

## Build order

The 4 product pages depend on shared infrastructure. PR order:

| # | PR | What | Depends on |
|---|---|---|---|
| 1 | **Demo proxy backend** | `apps/web/src/app/api/demo/v1/[...path]/route.ts` — Next.js Route Handler that server-side proxies a curated set of read endpoints to apps/api with a system demo key (env var, never exposed). Per-IP rate limit (token bucket in memory or Vercel KV). Postcode allowlist + body-param clamping enforced in proxy. Curated NL-prompt allowlist for `/v1/query`. | none |
| 2 | **`<TryItPanel />` shared component** | `apps/web/src/app/design-v2/_shared/try-it-panel.tsx` + co-located CSS. Generic widget: accepts an endpoint + a curated set of pre-filled inputs + a response renderer. Reused on all 4 product pages. | PR 1 |
| 3 | **`/products/signals`** | Brand v3 marketing page. Hero + 5 sections (primitive, under the hood, endpoints, ICP narratives, CTA) + inline `<TryItPanel />` on `GET /v1/area`. | PRs 1-2 |
| 4 | **`/products/scores`** | Same template. `<TryItPanel />` on `POST /v1/score` with preset toggle + custom weights demo. | PRs 1-2 |
| 5 | **`/products/monitor`** | Same template. `<TryItPanel />` on pre-seeded demo portfolio + `POST /changes`. | PRs 1-2 |
| 6 | **`/products/intelligence`** | Same template. `<TryItPanel />` on `POST /v1/query` with curated NL prompts. Flagship. | PRs 1-2 |

After PR 6 ships:
- Nav Products mega-menu: 4 disabled "Coming soon" pills flip to real links
- Footer Products column: same
- Homepage 03 product cards: same
- `/docs` 01 product cards: optionally add secondary "See product" link

Each PR follows the iteration loop: build → `npm run dev` → Pedro localhost approval → commit → PR + CI → squash-merge.
