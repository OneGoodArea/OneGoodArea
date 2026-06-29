# `@oga-mcp/server`

OneGoodArea MCP server — UK area intelligence inside Claude Desktop, Cursor, Windsurf, or any MCP-compatible client.

Score any UK postcode (or place name) for residential mortgage origination, retail site selection, property investment, or as a neutral reference baseline. Driven by the same engine that powers https://www.onegoodarea.com — five weighted dimensions per preset, confidence per dimension with engine-grounded reasoning, source attribution, public methodology.

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

---

## Get an API key

1. Sign up at https://www.onegoodarea.com/sign-up (Sandbox tier is free, 35 calls/month for evaluation).
2. Go to https://www.onegoodarea.com/dashboard.
3. Create an API key — it starts with `oga_`.
4. Paste into the `OOGA_API_KEY` env var above.

For higher volume, upgrade at https://www.onegoodarea.com/pricing.

---

## Tools

Every tool's response is composed server-side from real engine state. No client-side text synthesis: the prose you see comes from the deterministic engine that produced the score.

### `score_postcode(area, preset)`

Scores a UK postcode (or place name) for one of four decision presets.

**Arguments:**

- `area` (string, required): UK postcode like `"SW1A 1AA"` or place name like `"Manchester city centre"`. Max 100 characters.
- `preset` (string, required): One of:
  - `moving` — origination scoring (residential mortgage suitability, demand-side risk)
  - `business` — site selection (footfall, competition, commercial viability)
  - `investing` — investment scoring (yield, growth, regeneration)
  - `research` — reference scoring (neutral baseline, equal weights)

**Returns:** Markdown with the overall 0-100 score, five weighted dimensions with the engine's per-dimension reasoning and confidence reason, a server-composed one-paragraph summary, actionable recommendations from low-scoring or low-confidence dimensions, and the list of public datasets that contributed.

### `compare_postcodes(areas, preset)`

Scores 2-8 UK areas side-by-side for the same preset.

**Arguments:**

- `areas` (string[], required): 2-8 UK postcodes or place names.
- `preset` (string, required): Same preset values as `score_postcode`.

**Returns:** A sorted comparison table (rank, area, score, area type, top dimension) plus per-area summaries from the engine. Partial failures are surfaced inline rather than failing the whole call.

### `methodology_for(dimension)`

Explains how a specific scoring dimension is computed. Static lookup — no network, no quota cost.

### `engine_version()`

Returns the current engine version + changelog. Static lookup. The live engine version is also echoed on every `score_postcode` response.

---

## Pricing

The MCP server itself is free. API calls go through your OneGoodArea plan:

- Sandbox £0/mo · 35 API calls — evaluation only
- Starter £49/mo · 1,500 calls
- Build £149/mo · 6,000 calls
- Scale £499/mo · 25,000 calls
- Growth £1,499/mo · 100,000 calls — includes MCP server access at no extra cost
- Enterprise from £4,999/mo · 250,000+ calls — includes MCP server access

For Sandbox / Starter / Build / Scale, MCP access is a £29/mo add-on.

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
