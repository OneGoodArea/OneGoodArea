# Data Policy

What OneGoodArea stores when you call the API, for how long, who can read it, and how to opt out.

> Living document. Current as of 2026-06-29 (AR-375). Each new training-data capture in the same plan (AR-376 / AR-377) appends a section.

---

## What we always store (every API request)

We log structured metadata for every authenticated API call. This is the only thing we capture by default:

- `event` name (e.g. `api.score.computed`, `api.query.executed`)
- `user_id` + `org_id` (you, your organization)
- `created_at` (timestamp)
- A small, structured `metadata` JSON describing the call shape: area, preset, op (for `/v1/query`), counts, the computed score number. No raw response body, no chat content.
- `source` ("mcp" | "api") and `client_app` ("claude-desktop" | "cursor" | "claude-code" | "other"), derived from the `User-Agent` header. We use this to understand which integrations are used.

We do NOT log:
- Your raw IP beyond what's needed for IP allowlist enforcement (per-key, opt-in feature)
- Your full request body for most endpoints
- The narrative text we compose on `/v1/score?explain=true` (UNLESS you participate in training — see below)
- The raw natural-language question on `/v1/query` (UNLESS you participate in training — see below)

Retention: indefinite. This is operational data we need to bill, debug, and answer support questions.

---

## What we capture for AI training (opt-out available)

We capture two additional kinds of data to train smaller proprietary models that eventually replace third-party LLM calls in our infrastructure. **You can opt out per API key at any time** (see below).

### Planner training pairs (AR-376 — ACTIVE)

When you call `/v1/query` with a natural-language `question` field (`find_areas` via MCP), we store:

- The raw natural-language `question` you sent
- The full typed `plan` our planner emitted in response (or the error code if the call failed)
- `plan_source` — `"llm"` when the model authored the plan, `"client"` when the caller supplied it (we do NOT log `"client"` rows — those aren't training data)
- Latency in milliseconds
- Success/failure flag plus error code on failure
- `source` (always `"mcp"` for MCP calls) and `client_app` (claude-code / claude-desktop / cursor / other)

We do NOT log the response body — only the emitted plan. Programmatic `/v1/query` calls with `{plan}` are NOT logged (no training value).

**Purpose:** train a smaller LLM to translate natural-language area questions into typed plans, replacing the Anthropic API call we currently make per request.

**Storage:** dedicated `query_planner_logs` table, separate from operational `activity_events`. Superuser-only access at the SQL layer; `/admin` UI shows aggregate counts only.

### Brief-composer training pairs (AR-377 — not yet shipped)

When you call `/v1/score?explain=true` (`score_postcode` via MCP), we'll store:

- The full request (area, preset, weights)
- The full server-composed brief (score, dimensions with reasoning, summary, recommendations, data sources)
- Latency + success/failure flag

**Purpose:** train a smaller composer model for richer area briefs without depending on third-party LLM infrastructure.

### Retention

Both training corpora roll off automatically after **365 days** (configurable via `TRAINING_DATA_RETENTION_DAYS`). Rows older than the cutoff are purged by a nightly job.

### Who can read

Raw training tables are queryable only by superusers via direct SQL access. The `/admin` UI shows AGGREGATE counts only (row counts, top orgs by volume) — never the raw question text or brief body.

### Opt out

Each API key has a `training_optout` flag, default `FALSE`. When `TRUE`, requests made with that key are NOT inserted into either training table. Adoption tracking via `activity_events` continues — opt-out is for training-corpus inclusion, not for operational logging.

We'll surface a UI toggle in `/dashboard/keys` once customers exist. Until then the flag is settable via direct SQL (we'll handle requests via support).

---

## Your rights

- Request a copy of what we hold for your `user_id` or `org_id` — email support.
- Request deletion of your training-corpus rows — email support. We'll execute and confirm.
- Toggle `training_optout` on any key, any time — takes effect on the next request.

---

## Changelog

- **2026-06-29 (AR-375):** Initial version. Activity logging, source + client_app classification, opt-out flag landed. Training capture (AR-376 / AR-377) not yet active.
- **2026-06-29 (AR-376):** Planner training pairs ACTIVE on `/v1/query` (NL `question` field path only). Stored in dedicated `query_planner_logs` table. Per-key `training_optout` honored on every insert. AR-377 (brief composer) still pending.
