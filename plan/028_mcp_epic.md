# Plan 028 — MCP refresh + expansion

**Status:** S1.A in flight
**JIRA Epic:** AR-362
**Owner:** Pedro / Claude
**Started:** 2026-06-28

## Purpose

The MCP server (`@onegoodarea/mcp-server`) has been non-functional since
AR-324 killed `/v1/report` — every `score_postcode` call 404s. It also
still validates `aiq_` API keys which no longer exist, expects
report-era response fields that the new `/v1/score` doesn't return, and
its README + tool descriptions describe a product surface that has
moved on.

This epic does two things in sequence:

1. **Fix what's broken** so MCP returns to a known-good baseline.
2. **Expand the tool surface** to expose all four products
   (Signals / Scores / Monitor / Intelligence) through MCP, with a
   hybrid mix of REST-mirror tools (where users will ask by name) and
   workflow tools (where MCP's conversational strength is the value
   prop).

End state: an MCP that does what every product page promises, with a
marquee composite tool (`area_brief`) that turns the engine into a
brief-generator for lenders / insurers / retailers / investors.

## Locked decisions (2026-06-28)

- **Tool surface shape:** hybrid. Foundational REST-mirror tools for
  Signals + Scores, plus 3-4 workflow tools that compose endpoints
  (Monitor walkthrough, Intelligence query, area brief, peer
  discovery). Target ~8 tools total.
- **Transport:** stdio + npm. Remote MCP (HTTP+OAuth) is a separate
  epic when there's customer pull.
- **Order:** fix-first. S1 is split into S1.A (apps/api explain
  endpoint) + S1.B (MCP fix + wire). Then expand.
- **Brief shape policy:** server-side narrative is the contract. Any
  tool that returns a brief calls an apps/api `?explain=true` (or
  equivalent) endpoint. No client-side text synthesis. This is the
  scalability invariant — adding new MCP brief tools should never
  mean adding new narrative-generation code in `mcp/`.
- **Version bump:** `1.0.0` on the breaking shape change (S2).

## Stories

| Key | # | Story | What it does |
|---|---|---|---|
| **AR-363** | **S1.A** | apps/api: `/v1/score?explain=true` | Server returns brief shape (summary, per-dim reasoning, recommendations, data sources) from real engine state. Composed server-side from `ScoreResult` + signal values + confidence reasons. Foundational for every MCP brief tool. |
| **AR-364** | **S1.B** | MCP: fix + wire explain | Fix `aiq_` → `oga_`, `/api/v1/report` → `/v1/score`, request body shape, `/me` decode. Pass `?explain=true` so MCP renders server-side narrative not invented text. Smoke-test end-to-end. |
| S2 | Hygiene + version bump | README env examples, kill stale roadmap, tool descriptions match reality, align `SERVER_VERSION` with `package.json`, bump to `1.0.0`. |
| S3 | Signals tools | `get_area_signals(postcode)`, `get_signals_by_category(postcode, category)`. REST mirror for `GET /v1/area` + `GET /v1/signals/:category`. |
| S4 | Intelligence workflow tools | `find_areas(question)` natural-language + `find_peers(postcode)`. Wraps `POST /v1/query` + `POST /v1/peers`. Maybe `find_insights` / `forecast_signal` if scope allows. |
| S5 | Monitor workflow tools | `watch_portfolio(name, postcodes[], threshold)` composes portfolio CRUD + enrich + threshold. `get_portfolio_changes(name)`. |
| S6 | Area brief (marquee) | `area_brief(postcode, audience)` — composes Signals + Scores + (optional Forecast) into a formatted brief for "lender" / "insurer" / "retailer" / "investor". Calls `?explain=true` from S1.A + Signals from S3 + optional Forecast from S4. The wow-factor tool. |
| S7 | `/docs/mcp` page rewrite | Drop AR-357 rebuild banner. New install snippet (`oga_`). Per-tool table covering the bigger surface. Examples per tool. |

## Step order

1. ✅ Lock structure (this commit).
2. Detail S1 interactively → create Jira epic + AR-XXX for S1 → branch + ship.
3. After S1 merges: detail S2, ship.
4. After S2 merges: detail + ship S3, S4, S5 (independent, could go in any order or parallel).
5. S6 last in the build-out — depends on S3 + S4 + S5 being live so the composite has real data to pull.
6. S7 last (docs always trail behind the product they describe).

## Out of scope (explicitly)

- Remote MCP transport (HTTP+OAuth). Separate epic when there's pull.
- Adding new endpoints to apps/api. MCP wraps what exists; if a tool
  needs something the API doesn't expose, scope a separate API ticket
  first.
- Levers / control-plane tools (admins don't use MCP for org config).
- Auth/auth changes on apps/api. `oga_` bearer is the contract.

## Open questions (will resolve as we detail each story)

- S4: which Intelligence ops belong on the MCP surface vs which would
  confuse the LLM? `find_areas` + `find_peers` are clear; `find_insights`
  and `forecast_signal` need a UX call.
- S5: how much of the portfolio CRUD do we expose vs just give one
  `watch_portfolio` setup tool? Multi-step conversation pattern.
- S6: which audiences ship in v1 of `area_brief`? Probably 3-4
  (lender, insurer, retailer, investor) but the brief content per
  audience is real product work.
