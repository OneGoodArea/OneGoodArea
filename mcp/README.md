# `@oga-mcp/server`

OneGoodArea MCP server — UK area intelligence inside Claude Desktop, Cursor, Claude Code, Windsurf, or any MCP-compatible client.

Score UK areas for one of four decision presets, query the signals catalog directly, ask in natural language, find peers, watch portfolios for material change, and generate audience-shaped briefs — all server-composed from the deterministic OneGoodArea engine. No client-side prose synthesis: every line of output cites real engine state.

---

## Install

You don't install it directly. Configure your MCP client to spawn it via `npx`.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@oga-mcp/server"],
      "env": {
        "OOGA_API_KEY": "oga_xxx"
      }
    }
  }
}
```

Restart Claude Desktop. The OneGoodArea tools appear when you start a conversation about a UK location.

### Cursor

Add to `.cursor/mcp.json` in your project (or global config):

```json
{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@oga-mcp/server"],
      "env": { "OOGA_API_KEY": "oga_xxx" }
    }
  }
}
```

### Claude Code (CLI)

One command:

```sh
claude mcp add onegoodarea -e OOGA_API_KEY=oga_xxx -- npx -y @oga-mcp/server
```

---

## Get an API key

1. Sign up at https://www.onegoodarea.com/sign-up.
2. Go to https://www.onegoodarea.com/dashboard.
3. Create an API key — it starts with `oga_`.
4. Paste it into the `OOGA_API_KEY` env var above.

---

## Tools

Eleven tools across six surfaces. Every response is composed server-side from the deterministic engine — no client-side prose synthesis.

### Scores

#### `score_postcode(area, preset)`

Score a UK postcode or place name for a preset (`moving`, `business`, `investing`, `research`). Returns the 0-100 score, five weighted dimensions with engine-grounded reasoning + confidence, a one-paragraph summary, recommendations, and data sources.

#### `compare_postcodes(areas, preset)`

Score 2-8 areas side-by-side for the same preset. Returns a sorted comparison table with per-area summaries. Partial failures surface inline.

### Signals

#### `get_area_signals(area)`

Full signals catalog across all seven categories (crime, deprivation, property, schools, amenities, transport, environment). Each signal carries value + unit, percentile when store-backed, confidence with engine-grounded reason, source attribution, and observation period.

#### `get_signals_by_category(area, category)`

Same shape as `get_area_signals`, narrowed to one category. Use when the LLM needs to focus on a single data domain.

### Intelligence

#### `find_areas(question)`

Ask in natural language. The planner translates the question into a typed plan (one of seven ops: `rank_areas`, `get_area`, `score_area`, `compare_areas`, `find_peers`, `find_insights`, `find_forecast`); the database executes it. The response returns the emitted plan + results so every answer is reproducible.

#### `find_peers(area, k?)`

k-nearest-neighbour peers for a UK area by normalised signal values. Returns the target's geo_code, the signal dimensions used in the comparison, and a ranked peers list with distance (0 = identical, 1 = maximally distant) and `n_dims_used`.

### Monitor

#### `watch_portfolio(name, areas)`

One-shot setup: creates a tracked portfolio and adds areas. Returns the new `portfolio_id` and the area list. If the add step fails after the create, the response surfaces the partial state so the LLM can act.

#### `get_portfolio_changes(portfolio_id, threshold_pct?, baseline?, min_transactions?)`

Check a portfolio for material signal changes between two time-series periods. Returns scope, counts, and a per-area table of material moves with direction, from/to values, delta, and percent change. Probe calls don't fire customer webhooks.

### Brief

#### `area_brief(area, audience)` — marquee

One audience-shaped advisory document per area. Audience ∈ `{lender, insurer, retailer, investor}`. Composes the full signals catalog with the audience's scoring preset (with explain mode), then renders an audience-specific brief: overall verdict, audience-relevant dimensions, audience-relevant signals with provenance, recommendations, and data sources.

### Reference

#### `methodology_for(dimension)`

Methodology for any scoring dimension: data source, scoring function summary, per-preset weights. Static lookup — no network, no quota cost.

#### `engine_version()`

Current engine version and changelog. Static lookup. The live engine version is also stamped on every `score_postcode` and `get_area_signals` response.

---

## Pricing

The MCP server is **free**. API calls go through your OneGoodArea plan — current tiers and any MCP-specific terms live at https://www.onegoodarea.com/pricing.

---

## Development

```sh
cd mcp
npm install
npm run dev          # run via tsx, reads OOGA_API_KEY from env
npm test             # vitest
npm run build        # tsc to dist/
```

Override the API base for local dev against the standalone API server:

```sh
OOGA_API_BASE=http://localhost:4000 OOGA_API_KEY=oga_dev npm run dev
```

---

## License

MIT. © 2026 OneGoodArea.
