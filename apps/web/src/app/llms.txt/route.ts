import { METHODOLOGY_VERSION } from "@onegoodarea/contracts";

/* /llms.txt (AR-773) — the llmstxt.org entry point for AI agents and
   assistants. A curated, machine-readable map of what OneGoodArea is and where
   the canonical docs live, so LLM crawlers and agents can find, read, and cite
   us efficiently. The engine version is imported from @onegoodarea/contracts,
   never hardcoded, so this file can never drift from the live methodology.
   Plain text, no em-dashes. */

const SITE = "https://www.onegoodarea.com";

function llms(): string {
  return `# OneGoodArea

> The data and intelligence layer underneath UK property workflows. OneGoodArea turns any UK postcode into structured signals, transparent scores, portfolio monitoring, and natural-language answers, delivered over a REST API and as a Model Context Protocol (MCP) server so AI agents can query it directly.

OneGoodArea scores and explains any UK area. Enter a postcode, choose an intent, and get a versioned 0-100 score with a per-category breakdown and a confidence value. Scoring is deterministic: values are computed from public data by fixed formulas with no AI in the scoring path, and every response is stamped with the engine version and the sources behind it, so results are auditable and reproducible.

The engine scores seven signal categories for every intent: safety and crime, deprivation, property, schools, amenities, transport, and environment. Four decision presets (moving, business, investing, research) change only how those categories are weighted. Current engine (methodology) version: ${METHODOLOGY_VERSION}.

OneGoodArea is four composable products over one engine:
- Signals: normalized area data across the seven categories, each value carrying its source and observed period.
- Scores: a single 0-100 score per intent, with per-category breakdown and confidence.
- Monitor: watch a portfolio of areas and get notified when the underlying data moves materially.
- Intelligence: natural-language questions and comparisons over the same data.

## Docs
- [Methodology](${SITE}/methodology): how the score is built, the seven categories, versioning, and confidence.
- [API reference](${SITE}/docs/api-reference): REST endpoints, request and response shapes, and authentication.
- [MCP server](${SITE}/docs/mcp): use OneGoodArea from inside Claude, Cursor, and any MCP client.
- [OpenAPI spec](${SITE}/openapi.json): machine-readable description of the API.
- [Changelog](${SITE}/changelog): what shipped and when.

## Product
- [Home](${SITE}/): overview and a live postcode demo.
- [For AI agents](${SITE}/ai): how to read, query, and cite OneGoodArea.
- [Pricing and pilot](${SITE}/pricing): the founding pilot partner programme.

## Use cases
- [Proptech](${SITE}/for/proptech): area data inside proptech products.
- [Estate agents](${SITE}/for/estate-agents): area context for listings and valuations.
- [Lenders](${SITE}/for/lenders): defensible, versioned area scores for underwriting.
- [Insurance](${SITE}/for/insurance): area risk signals and portfolio monitoring.
- [Commercial real estate](${SITE}/for/cre): shortlist and compare areas at scale.
- [Public sector](${SITE}/for/public-sector): consistent area evidence for decisions.

## Company
- [About](${SITE}/about): who builds OneGoodArea.
- [Business](${SITE}/business): how teams put it to work.

## Contact
- Email: operation@onegoodarea.co.uk
`;
}

export function GET() {
  return new Response(llms(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
