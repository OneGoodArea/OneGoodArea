# Data Policy

What OneGoodArea stores when you call the API, for how long, who can read it, and how to opt out.

> Living document. Last updated 17 July 2026.

---

## Area-level data, no personal data

OneGoodArea processes area-level statistical data only. All signals are aggregated to small-area geographies (LSOA in England and Wales, Data Zone in Scotland), typically around 1,500 residents. We do not collect, store, or process personal data about individuals in our signal store, and no output can identify a person, household, or property.

---

## What we always store (every API request)

We log structured metadata for every authenticated API call. This is the only thing we capture by default:

- `event` name (e.g. `api.score.computed`, `api.query.executed`)
- `user_id` + `org_id` (you, your organization)
- `created_at` (timestamp)
- A small, structured `metadata` JSON describing the call shape: area, preset, op (for `/v1/query`), counts, the computed score number. No raw response body, no chat content.
- `source` ("mcp" or "api") and `client_app` ("claude-desktop", "cursor", "claude-code", "other"), derived from the `User-Agent` header. We use this to understand which integrations are used.

We do NOT log:
- Your raw IP beyond what is needed for IP allowlist enforcement (a per-key, opt-in feature)
- Your full request body for most endpoints
- The narrative text we compose on `/v1/score?explain=true` (unless you participate in training, see below)
- The raw natural-language question on `/v1/query` (unless you participate in training, see below)

Retention: indefinite. This is operational data we need to bill, debug, and answer support questions.

---

## What we capture for AI training (opt-out available)

We capture two additional kinds of data to train smaller proprietary models that, over time, replace third-party LLM calls inside our infrastructure. **You can opt out per API key at any time** (see below).

### Planner training pairs

When you call `/v1/query` with a natural-language `question` (for example `find_areas` via MCP), we store:

- The raw natural-language question you sent
- The typed plan our planner produced in response (or the error code if the call failed)
- Latency, and a success or failure flag
- `source` and `client_app`

We do NOT log the response body, only the emitted plan. Programmatic `/v1/query` calls that supply their own plan are not logged; there is no training value in them.

**Purpose:** train a smaller model to translate natural-language area questions into typed plans, so we depend less on a third-party LLM per request.

**Storage:** a dedicated store, kept separate from operational logs. Internal access is restricted, and our admin tooling shows aggregate counts only, never the raw question text.

### Brief-composer training pairs

When you call `/v1/score?explain=true` (for example `score_postcode` via MCP), we store:

- The request body (area, preset, weights, bundle, preset id)
- The server-composed brief (score, dimensions with reasoning and confidence, summary, recommendations, data sources)
- Latency, and a success or failure flag
- `source` and `client_app`

We do NOT log calls to the bare `/v1/score` path (without `explain=true`). Those produce no composed prose, so there is nothing to learn.

**Purpose:** train a smaller composer model for richer area briefs without depending on third-party LLM infrastructure.

**Storage:** a dedicated store, kept separate from operational logs and from the planner data. Internal access is restricted, and our admin tooling shows aggregate counts only.

### Retention

Both training corpora roll off automatically after **365 days**. Rows older than that are purged nightly.

### Who can read

Raw training data is accessible only to a small number of internal administrators. Our admin tooling shows aggregate counts only, never the raw question text or brief body.

### Opt out

Each API key has a training opt-out setting, off by default. When you turn it on, requests made with that key are not added to either training set. Operational logging continues; opt-out applies to the training corpora only.

**To toggle:** sign in, go to `/api-usage`, and use the "Training" switch next to any of your keys. It takes effect on the next request from any client using that key. No support email needed.

---

## Your rights

- Request a copy of what we hold for your `user_id` or `org_id`. Email support.
- Request deletion of your training data. Email support, and we will execute and confirm.
- Toggle training opt-out on any key, at any time. It takes effect on the next request.
