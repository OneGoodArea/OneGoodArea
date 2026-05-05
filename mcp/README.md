# `@onegoodarea/mcp-server`

OneGoodArea MCP server — UK location intelligence inside Claude Desktop, Cursor, Windsurf, or any MCP-compatible client.

Score any UK postcode for residential mortgage origination, retail site selection, property investment, or as a neutral reference baseline. Driven by the same engine that powers https://www.onegoodarea.com — five weighted dimensions, confidence per signal, source attribution, public methodology.

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
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": {
        "OOGA_API_KEY": "aiq_xxx"
      }
    }
  }
}
```

Restart Claude Desktop. The `score_postcode` tool will appear when you start a conversation about a UK location.

### Cursor

Add to `.cursor/mcp.json` in your project (or global config):

```json
{
  "mcpServers": {
    "onegoodarea": {
      "command": "npx",
      "args": ["-y", "@onegoodarea/mcp-server"],
      "env": { "OOGA_API_KEY": "aiq_xxx" }
    }
  }
}
```

---

## Get an API key

1. Sign up at https://www.onegoodarea.com/sign-up (Sandbox tier is free, 35 calls/month for evaluation)
2. Go to https://www.onegoodarea.com/dashboard
3. Create an API key — it starts with `aiq_`
4. Paste into the `OOGA_API_KEY` env var above

For higher volume, upgrade at https://www.onegoodarea.com/pricing.

---

## Tools

### `score_postcode(postcode, intent)`

Scores a UK postcode (or place name) for one of four decision intents.

**Arguments:**

- `postcode` (string, required): UK postcode like `"SW1A 1AA"` or place name like `"Manchester city centre"`. Max 100 characters.
- `intent` (string, required): One of:
  - `moving` — origination scoring (residential mortgage suitability, demand-side risk)
  - `business` — site selection (footfall, competition, commercial viability)
  - `investing` — investment scoring (yield, growth, regeneration)
  - `research` — reference scoring (neutral baseline, equal weights)

**Returns:** Markdown-formatted text with overall 0-100 score, five weighted dimensions with confidence and reasoning, plain-English summary, recommendations, and data sources.

**Caching:** Repeat calls for the same `(postcode, intent)` are served from cache for 24 hours and don't count against your quota.

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

Override the API base for local dev against a `npm run dev` Next.js server:

```sh
OOGA_API_BASE=http://localhost:3000 OOGA_API_KEY=aiq_dev npm run dev
```

---

## Roadmap

Planned tools (subsequent releases):

- `compare_postcodes(postcodes[], intent)` — score N postcodes in one call
- `methodology_for(dimension)` — explain how a specific dimension is computed
- `engine_version()` — return current engine version + changelog

---

## License

MIT. © 2026 OneGoodArea.
