# ADR 0017 — Intelligence v1: the typed query plane (`POST /v1/query`)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0007 (cross-area query), 0008 (Scores), 0012/0016 (store-read), MASTER section 6, [[product-architecture-mental-model]].

## Context

Intelligence is the 4th and final product, and the most easily misframed.
Pedro 2026-05-26: *"the Intelligence here isn't narrative or narrative at all
— it is a lot more advanced than that."* It is the **smart query + insight
plane** over the moat. Six surfaces in total: query plane (this ADR),
insights/anomaly, peers, forecast, MCP tools, AI eval harness. `/v1/analyze`
(narrative) is the smallest, most optional surface and is **explicitly
deferred** so v1 stays infrastructure-shaped, not chatbot-shaped.

This ADR covers the first surface: a typed query plane that the moat answers,
with NL as one optional input mode among others.

## Decision

- **The JSON plan grammar IS the public API.** A Zod-strict discriminated
  union (`QueryPlanSchema` in `@onegoodarea/contracts/intelligence`) with three
  ops in v1: `rank_areas`, `get_area`, `score_area`. Every object is
  `.strict()` — unknown ops or unknown params are REJECTED, never silently
  coerced. New ops (insights / peers / forecast) extend the union.
- **Dual input mode on `POST /v1/query`:**
  - `{ plan }`: PROGRAMMATIC — the LLM is **never touched**; the executor runs
    the plan directly. This is what other systems (and the MCP surface later)
    use against the moat.
  - `{ question }`: NL — the planner translates the question into a plan via
    the AiProvider seam, Zod-validates, then runs through the SAME executor.
  Exactly one is required (Zod-validated `QueryRequestSchema`).
- **Strict separation: planner vs executor.**
  - `modules/intelligence/planner.ts` — builds the structured prompt
    (embeds the supported-signal catalog so the LLM can't invent keys),
    calls `AiProvider.generateNarrative`, parses JSON (tolerates ` ```json `
    fences + leading prose defensively), Zod-validates, returns a typed
    `PlannerError` on any failure (code: `no_json | invalid_plan | llm_error`).
    Never throws.
  - `modules/intelligence/executor.ts` — dispatches the validated plan to
    the EXISTING proven handlers (`queryAreas`, `getAreaProfile`, `scoreArea`).
    **No new DB code, no new business logic.** This is the deterministic core.
- **The response always echoes the executed plan + `plan_source` (`"client"`
  | `"nl"`).** Consumers can audit what ran and replay any NL query as a
  programmatic call. This is the audit-safety property — every result is
  reproducible and traces to real store rows.
- **Endpoint** `POST /v1/query` behind `OGA_SIGNALS_API` + `requireApiAccess`;
  meters `api.query.executed` with `op` + `plan_source`. Invalid plans → 422
  (with raw LLM output for transparency), DB/I-O errors → 500.
- **AiProvider injectable** for tests (no LLM calls in the test suite);
  defaults to the configured Anthropic provider in prod (`OGA_AI_PROVIDER`).

## Consequences

**Positive**
- The moat is **queryable** — programmatically (the plan IS the API) AND via
  NL (the LLM is just one way to author a plan). This is what makes
  Intelligence infrastructure-shaped, not chatbot-shaped.
- Proven on prod (both modes):
  - PROGRAMMATIC `get_area` M1 1AE → 19 signals, fetch_mode hybrid, LLM untouched.
  - PROGRAMMATIC `rank_areas` England most-deprived → real LSOA ranking.
  - NL *"most expensive LSOAs in England"* → real Anthropic call →
    `rank_areas` plan → £6.05M / £4.79M / £4.02M.
  - NL *"tell me about M1 1AE"* → `get_area` plan → 19 signals.
- Deterministic principle preserved: AI emits the plan; the DB produces the
  answer; invalid plans are rejected, never coerced.
- Reuses the proven handlers — zero new DB code in this increment.

**Negative / accepted**
- The model occasionally returns a plan that's technically valid but
  suboptimal (e.g. picking a different `sort` than the human intent). The
  response echoes the executed plan so the consumer sees it; bad plans get
  fixed by either re-prompting (programmatically) or tightening the prompt /
  adding examples. The eval harness (surface #6) will quantify this.
- Anthropic flagged `claude-sonnet-4` for EOL 2026-06-15. **Follow-up:** bump
  the model used by `AnthropicAiProvider` before the EOL date.
- `/v1/analyze` (narrative) is deferred — by design.

## Alternatives considered

- **Free-text "ask me anything" with the LLM answering directly.** Rejected
  — that's a chatbot. The whole point is the DB answers; the LLM only picks
  the query.
- **One single endpoint for each plan op (`/v1/rank-areas`, etc.) without a
  plan grammar.** Rejected — those endpoints already exist (`/v1/areas`,
  `/v1/area`, `/v1/score`); the value of `/v1/query` is the **uniform typed
  surface** that grows by adding ops (insights/peers/forecast) without new
  endpoint shapes.
- **Bundle narrative output into the v1 response.** Rejected — explicitly,
  so the product doesn't drift toward chatbot framing. Narrative ships later
  as `/v1/analyze`, optional, and as a courtesy layer.
