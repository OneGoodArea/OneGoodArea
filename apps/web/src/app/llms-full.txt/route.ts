import { METHODOLOGY_VERSION, getCurrentMethodology } from "@onegoodarea/contracts";

/* /llms-full.txt (AR-780) — the full-text companion to /llms.txt. Where
   /llms.txt is a concise index, this is the complete, plain-text knowledge
   base for OneGoodArea, so an AI agent can ingest everything in one fetch
   instead of crawling and parsing HTML. The engine section is rendered from
   @onegoodarea/contracts (getCurrentMethodology), so it can never drift from
   the live methodology. Grounded in published facts, no invented claims,
   no em-dashes. */

const SITE = "https://www.onegoodarea.com";

function fullText(): string {
  const m = getCurrentMethodology();
  const changes = m.changes.map((c) => `- ${c}`).join("\n");

  return `# OneGoodArea, full reference for AI agents

> The data and intelligence layer underneath UK property workflows. OneGoodArea turns any UK postcode into structured signals, transparent scores, portfolio monitoring, and natural-language answers, delivered over a REST API and as a Model Context Protocol (MCP) server.

This file is the complete, plain-text knowledge base for OneGoodArea, meant for AI agents and assistants that want everything in a single fetch. The concise index is at ${SITE}/llms.txt. Everything here is public and canonical.

## What OneGoodArea is
OneGoodArea scores and explains any UK area. You enter a postcode, choose an intent, and get a versioned 0-100 score with a per-category breakdown and a confidence value, plus the raw signals and the sources behind them. It is built for teams putting area intelligence inside their own products and workflows, by API and inside AI tools.

## The engine
Scoring is deterministic: values are computed from public data by fixed formulas, with no AI in the scoring path. Every response is stamped with the engine version and can be pinned, so the same request returns the same numbers months later, which makes results auditable and safe to cite.

The engine scores seven signal categories for every intent: safety and crime, deprivation, property, schools, amenities, transport, and environment. Four decision presets (moving, business, investing, research) change only how those categories are weighted. Custom weights let you re-weight the same seven categories for any preset.

Current engine (methodology) version: ${METHODOLOGY_VERSION}, released ${m.released_at}.
${m.summary}

What changed in ${METHODOLOGY_VERSION}:
${changes}

## The four products
- Signals: every public signal for an area across the seven categories. Each value carries its source, the period it was observed, a confidence level, and where it sits nationally and regionally.
- Scores: a single 0 to 100 score for an area for one of the four presets, built from the seven categories. Deterministic and version-stamped, so the same inputs always return the same score.
- Monitor: watch a list of areas and get told when something material changes, delivered by signed webhook. Small, noisy moves are held back so you only hear about the ones that matter.
- Intelligence: ask in plain English or send a typed query. You get the answer and the exact query behind it, so every result can be checked and run again. Includes similar-area comparison, outlier detection, and a straightforward forecast. The AI writes the query; it never decides the numbers.

## The data
- Grain: LSOA by month. There are about 42,000 LSOAs across England, Wales, and Scotland; postcodes resolve into LSOAs via the ONS National Statistics Postcode Lookup.
- Sources are named on every value, for example police.uk for crime, the Index of Multiple Deprivation and SIMD for deprivation, HM Land Registry for property (England and Wales), and OpenStreetMap for amenities and transport. Scotland uses a hybrid source set.
- Every value carries its source, its observed period, a confidence level, and national and regional context, so a number means something on its own and can be cited.

## The API
- REST, authenticated with a bearer API key. The primary endpoint returns the full area profile for a postcode; the API also covers scoring, comparison, and natural-language queries.
- The base URL, authentication, rate limits, and full request and response shapes are documented at ${SITE}/docs/api-reference.
- The machine-readable spec is at ${SITE}/openapi.json.

## The MCP server
OneGoodArea ships as a Model Context Protocol server (package @oga-mcp/server), so an agent can call the data directly from Claude, Cursor, or any MCP client rather than only reading about it. Tools include score_postcode, get_area_signals, compare_postcodes, find_areas, watch_portfolio, and methodology_for. Setup is documented at ${SITE}/docs/mcp.

## Pricing and pilot
OneGoodArea is recruiting founding pilot partners: ten partners, one 40-day sprint, hands-on. Details and application at ${SITE}/pricing.

## Use cases
- Proptech: ${SITE}/for/proptech
- Estate agents: ${SITE}/for/estate-agents
- Lenders: ${SITE}/for/lenders
- Insurance: ${SITE}/for/insurance
- Commercial real estate: ${SITE}/for/cre
- Public sector: ${SITE}/for/public-sector

## Canonical links
- Home: ${SITE}/
- For AI agents: ${SITE}/ai
- Methodology: ${SITE}/methodology
- API reference: ${SITE}/docs/api-reference
- MCP server: ${SITE}/docs/mcp
- OpenAPI spec: ${SITE}/openapi.json
- Changelog: ${SITE}/changelog

## Contact
- Email: operation@onegoodarea.co.uk
`;
}

export function GET() {
  return new Response(fullText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
