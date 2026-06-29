# Plan 029 · MCP adoption + planner + brief training capture (AR-375 + AR-376 + AR-377)

**Jiras:**
- [AR-375](https://podnex.atlassian.net/browse/AR-375) — adoption visibility (PR1)
- [AR-376](https://podnex.atlassian.net/browse/AR-376) — planner training pairs (PR2)
- [AR-377](https://podnex.atlassian.net/browse/AR-377) — brief-composer training pairs (PR3)

**Sister of:** AR-374 (announcement bar — shipped). Bar invites traffic, this plan measures it AND captures two proprietary training corpora.

**Driver:** Pedro's training-data + adoption-visibility ask after MCP 1.0.1 publish (AR-373). Direct question "this plan will allow us to train on data?" — answer was "adoption-only as drafted" — Pedro chose to expand scope to capture planner pairs AND brief-composer pairs.

---

## What this plan delivers (split across three PRs)

| | PR1 (AR-375) | PR2 (AR-376) | PR3 (AR-377) |
|---|---|---|---|
| **Question answered** | Which orgs use MCP, how often, from which client? | What NL questions do customers ask /v1/query, and what plans does it emit? | What inputs land on /v1/score?explain=true, and what brief does the composer return? |
| **Output** | `mcp_adoption` view + /admin tile | `query_planner_logs` table + /admin tile | `brief_composer_logs` table + /admin tile |
| **Training value** | None directly — adoption signal | High — (NL question → typed plan) pairs to train our own planner LLM | High — (request → composed brief) pairs to train a smaller brief composer model offline |
| **Dependencies** | None | Depends on PR1's request-context hook | Depends on PR1's request-context hook |
| **Shipped sequentially** | First | Second, after PR1 | Third, after PR2 (can be parallel with PR2 but cleaner to sequence) |

---

## Non-goals (all three PRs)

- Not capturing per-tool outputs from get_area_signals, find_peers, find_insights, find_forecast, watch_portfolio, area_brief. Could become AR-378+ if the data is genuinely useful — but those tools return structured engine state that's already reproducible from the deterministic engine, so capture has diminishing returns compared to the two LLM-touched surfaces (planner + composer).
- Not building real /admin drill-down pages. Tiles only.
- Not changing how MCP calls are billed or metered. `mcp_usage` table is unchanged.
- Not building an opt-out flag on api_keys for training. **Pre-customer default: no opt-out, no redaction.** Follow-up ticket when real paying customers arrive.

---

## Design decisions (made — defer to Pedro if anything is wrong)

| # | Decision | Why |
|---|---|---|
| 1 | Mark source via `activity_events.metadata.source` + `metadata.client_app` (normalized: `claude-desktop` / `cursor` / `claude-code` / `other`) | No schema migration on the high-traffic events table. Normalizing the client name avoids storing raw User-Agent (which is user-controllable / PII). |
| 2 | Capture source in `trackEvent` via Fastify request hook + AsyncLocalStorage | Zero per-route plumbing. Any new MCP tool is auto-tracked. No route can forget to set source. |
| 3 | `mcp_adoption` is a SQL view (not a materialized view) | Small data volumes, fast queries. Can promote to materialized later if perf matters. |
| 4 | Planner training pairs live in a NEW dedicated table `query_planner_logs`, not in `activity_events.metadata` | Different lifecycle (training data may be exported / archived / dropped per-customer); different access controls (admin/training role); cleaner schema for the actual training pipeline. |
| 5 | Brief-composer training pairs live in a SECOND dedicated table `brief_composer_logs` — same pattern as `query_planner_logs` | Two distinct training corpora with different shapes (planner is short text → typed JSON; composer is structured request → structured response). Mixing schemas hurts both. |
| 6 | Both training tables store raw inputs/outputs — no redaction | Pre-customer. Best training signal. Documented as the policy decision. Will gate behind `api_keys.training_optout` in a follow-up when real customers arrive. |
| 7 | Each PR adds one tile to `/admin`, not a full page | Real estate on /admin is small; tiles are enough until volume justifies drill-downs. |
| 8 | PR3 inserts only when `query.explain === true` | The bare /v1/score call (no explain) does NOT compose a brief, so there's nothing composer-shaped to capture. Avoids logging duplicates of plain score requests. |
| 9 | **Privacy/policy protections built in from PR1, not deferred.** Per-key opt-out flag now, bounded retention now, aggregated /admin views only, public data-policy page. | Pedro flagged: "i want us to protect ourselves there." Retroactive privacy fixes are dangerous and look bad. Cheap to do now. |
| 10 | `api_keys.training_optout BOOLEAN DEFAULT FALSE` migration lands in PR1 ahead of any training capture | PR2 and PR3 check this flag before inserting; if true, skip the training-table insert (still log to activity_events for billing). Means we never capture data for a key whose owner has opted out, from first request. |
| 11 | Bounded retention: `TRAINING_DATA_RETENTION_DAYS` env (default 365). Nightly cron purges older rows from `query_planner_logs` + `brief_composer_logs` | "We kept everything forever" is not a defensible position. 365 days is a reasonable cap; we tune later based on training quality vs storage cost. |
| 12 | /admin tiles show AGGREGATE counts only — no raw question text, no brief content rendered | Raw training data requires deliberate SQL access (superuser). UI accidents are the most common privacy leaks; aggregate-only by default eliminates the surface. |
| 13 | Public `docs/DATA_POLICY.md` documents exactly what we store, retention window, opt-out path | Customers need this to make an informed decision before generating an API key. Honest disclosure is the cheapest legal defense. |
| 14 | ToS clause for "service improvement uses of call data" is FLAGGED but not engineered here | Lawyer work, not engineering. Tracked separately. |

---

## PR1 (AR-375) — Adoption visibility

**Branch:** `feat/AR-375-mcp-adoption-view`

### Steps

1. **Request context hook.** Fastify `onRequest` hook reads `request.headers['user-agent']`, runs `classifyClientApp()`, stuffs `{source, client_app}` into AsyncLocalStorage. One place to look.
2. **User-Agent classifier.** Pure helper `classifyClientApp(userAgent: string): "claude-desktop" | "cursor" | "claude-code" | "other"`. Unit tests for every known string we've seen in the wild. MCP server's UA matches `claude-code` (via `onegoodarea-mcp-server` substring + whatever Claude Code prepends).
3. **`trackEvent` reads from ALS.** No signature change. The function merges `{source, client_app}` into `metadata` automatically. Existing call sites untouched.
4. **Migration: `api_keys.training_optout BOOLEAN DEFAULT FALSE`.** Per-key opt-out flag. Lands ahead of PR2/PR3 so neither training table can ever be written before the flag exists.
5. **Smoke test from /v1/score via MCP.** Trigger a real call from Claude Code, verify `activity_events.metadata.source = "mcp"` and `metadata.client_app = "claude-code"` lands. No code change — gate before the view.
6. **Migration: `mcp_adoption` view.** Joins `activity_events` filtered by `metadata->>'source' = 'mcp'` against `users` + `orgs`. Columns: `org_id`, `org_name`, `user_id`, `user_email`, `event_name`, `client_app`, `event_count`, `last_seen`. Aggregated last 30 days.
7. **/admin tile.** Plotted-style card on existing /admin page: top N orgs by event_count, with last_seen. **Aggregate counts only — no raw event metadata rendered.**
8. **Docs: `docs/DATA_POLICY.md` page.** Public-facing: what we store, retention default (365 days), how to opt out via `training_optout`, who can access. Skeleton in PR1; both training PRs append their specifics.

### Step 1 detail — Fastify request-context hook (awaiting Pedro sign-off)

**Files:**

| Path | New / Modify | Purpose |
|---|---|---|
| `apps/api/src/shared/request-context.ts` | NEW | `AsyncLocalStorage<RequestContext>` instance + `getRequestContext()` reader |
| `apps/api/src/shared/http.ts` | MODIFY | Add `classifyClientApp(userAgent): ClientApp` next to `isFromMcpServer` |
| `apps/api/src/app.ts` | MODIFY | Register one `onRequest` hook that derives `{source, client_app}` from headers and runs the rest of the request inside `als.run(...)` |
| `apps/api/src/modules/tracking/activity.ts` | MODIFY | `trackEvent` reads ALS, merges `{source, client_app}` into `metadata` before INSERT |
| `apps/api/src/shared/__tests__/http.test.ts` | NEW | Vitest unit tests for `classifyClientApp` against known UA strings |

**RequestContext shape:**

```ts
type Source = "mcp" | "api";
type ClientApp = "claude-desktop" | "cursor" | "claude-code" | "other";
interface RequestContext {
  source: Source;
  client_app: ClientApp;
}
```

**Decisions inside Step 1:**

- **Source is binary `"mcp" | "api"`, not three-way.** We don't have a clean signal to distinguish "api" (direct script) from "web" (BFF proxy) without sniffing session cookies or adding a header from the web side. Keeping it binary now; can split later if you want the BFF distinction.
- **`als.run()` not `als.enterWith()`.** `als.run(ctx, () => done())` is the safer Fastify pattern — context is scoped to the request lifecycle and torn down on response. `enterWith()` leaks across the event loop. This matters for correctness.
- **No signature change to `trackEvent`.** It reads ALS internally. All existing call sites (~20 routes) untouched. If ALS is empty (e.g. a CLI script calls trackEvent outside a request), `source` defaults to `"api"` and `client_app` to `"other"`.
- **No new dep.** AsyncLocalStorage is built into Node 14+. The repo runs Node 18+.

**Classifier logic (priority order — first match wins):**

```
1. UA contains "onegoodarea-mcp-server"  →  source = "mcp"
                                            then check the rest of the UA for the wrapping client:
                                              contains "claude-code"      → claude-code
                                              contains "cursor"           → cursor
                                              contains "claude" (desktop) → claude-desktop
                                              else                        → other
2. UA contains "cursor"                   →  source = "api", client_app = cursor
3. UA contains "claude-code"              →  source = "api", client_app = claude-code
4. UA contains "claude-ai" / "claude/"    →  source = "api", client_app = claude-desktop
5. else                                   →  source = "api", client_app = other
```

Cases 2-4 catch direct API-key calls from MCP-aware tools that don't go through our MCP server (rare, but possible).

**Tests for `classifyClientApp` (every string we know or can predict):**

| Input | Expected `source` | Expected `client_app` |
|---|---|---|
| `"onegoodarea-mcp-server/1.0.1"` | `mcp` | `other` (server-only context, no wrapping client visible) |
| `"claude-code/1.0 onegoodarea-mcp-server/1.0.1"` | `mcp` | `claude-code` |
| `"Mozilla/5.0 ... Claude/1.0 ... onegoodarea-mcp-server/1.0.1"` | `mcp` | `claude-desktop` |
| `"Cursor/0.42 onegoodarea-mcp-server/1.0.1"` | `mcp` | `cursor` |
| `"curl/8.0.1"` | `api` | `other` |
| `"Mozilla/5.0 (Macintosh)..."` | `api` | `other` |
| `""` (empty UA) | `api` | `other` |
| `undefined` UA header | `api` | `other` |

**What Step 1 does NOT do:**
- Does not change any /v1/* route file.
- Does not migrate or touch the DB.
- Does not change response shape.
- Does not add the view (that's Step 5).
- Does not touch /admin (that's Step 6).

**Acceptance for Step 1 (no DB needed):**
- All existing apps/api tests pass.
- New `http.test.ts` passes with the 8 cases above.
- A locally-running apps/api receives a request with `User-Agent: onegoodarea-mcp-server/1.0.1` → server logs (via debug breakpoint or temp log line) confirm ALS holds `{source: "mcp", client_app: "other"}`.
- Real Claude Code → /v1/score smoke happens in Step 4, after the view is wired.

### Acceptance

- Trigger `score_postcode` from Claude Code → `mcp_adoption` shows a row for Pedro's org with `client_app = claude-code` within ~1s.
- /admin tile renders top orgs by MCP usage with last_seen.
- All existing apps/api tests still pass; new unit tests for `classifyClientApp` ship green.

---

## PR2 (AR-376) — Planner training pairs

**Branch:** `feat/AR-376-planner-training-pairs`
**Requires:** PR1 merged.

### Steps

1. **Migration: `query_planner_logs` table.** Columns: `id`, `org_id`, `user_id`, `event_ts`, `question TEXT NOT NULL`, `plan JSONB NOT NULL`, `response_ok BOOLEAN`, `latency_ms INT`, `source TEXT`, `client_app TEXT`. Indexes on `(org_id, event_ts)` and `(client_app)`.
2. **Wire /v1/query.** Insert one row per call, in parallel with the existing `trackEvent("api.query.executed", ...)`. Insert failures isolated — never break the main request, log to structured logger.
3. **Smoke test.** Run a `find_areas` call from Claude Code with a real NL question. Verify the row appears in `query_planner_logs` with question text + emitted plan + correct latency.
4. **/admin tile.** Second tile on /admin: total planner pairs captured last 30d, top orgs by volume. Click-through reserved for a future drill-down page.
5. **Document data policy.** Update ARCHITECTURE.md with the storage decision: raw NL prompts retained, no opt-out yet, follow-up ticket for `api_keys.training_optout` when customers exist.

### Acceptance

- A `find_areas` call from Claude Code lands a row with the raw question + full emitted plan (op + args) in `query_planner_logs`.
- /admin tile shows planner training row count last 30 days.
- ARCHITECTURE.md updated with the data-policy decision.

---

## PR3 (AR-377) — Brief-composer training pairs

**Branch:** `feat/AR-377-brief-composer-training`
**Requires:** PR1 merged. Independent of PR2 but cleanest to ship sequentially.

### Steps

1. **Migration: `brief_composer_logs` table.** Columns: `id`, `org_id`, `user_id`, `event_ts`, `area TEXT`, `preset TEXT`, `weights JSONB NULL`, `request JSONB NOT NULL` (full validated request body), `response JSONB NOT NULL` (full ScoreResultSchema response including summary, dimensions, recommendations, data_sources), `latency_ms INT`, `response_ok BOOLEAN`, `source TEXT`, `client_app TEXT`. Indexes on `(org_id, event_ts)`, `(preset)`, `(client_app)`.
2. **Wire /v1/score.** Insert one row per call **only when `query.explain === true`** — that's the only branch that composes a brief. The plain score response is reproducible from engine state, no capture value. Insert isolated — never breaks the main request.
3. **Smoke test.** Run a `score_postcode` for SW1A 1AA from Claude Code (which always sends `explain=true` per the MCP api-client). Verify row appears with full request + full brief response. Verify a plain `curl /v1/score?area=SW1A+1AA&preset=moving` (no explain) does NOT create a row.
4. **/admin tile.** Third tile on /admin: total brief-composer rows last 30 days, top orgs by volume.
5. **Document.** Append to the ARCHITECTURE.md data-policy section started in PR2: same retention story, two training tables.

### Acceptance

- A `score_postcode` from Claude Code lands a row in `brief_composer_logs` with the full request + the full server-composed brief.
- A plain /v1/score call (explain omitted) creates NO row.
- /admin tile renders brief-composer row count.
- Existing /v1/score tests still pass; new test verifies the conditional insert.

---

## Risk + reversibility

**PR1:**
- `trackEvent` signature unchanged — internal-only ALS merge. No public API impact.
- New JSONB keys (`source`, `client_app`) are additive — old rows just don't have them; the view filters explicitly via `metadata->>'source'`.
- View is `CREATE OR REPLACE VIEW` so safe to re-run.
- Rollback: drop view + revert request hook. No data loss.

**PR2:**
- New table, isolated insert path. Rollback = drop table + revert /v1/query insert call.
- **Data policy risk:** storing raw NL prompts. Pre-customer this is fine; flagged as a follow-up gate when customers arrive.
- Insert failures are isolated — query response still ships even if logging fails.

**PR3:**
- New table, isolated insert path on the explain branch only. Rollback = drop table + revert /v1/score insert call.
- **Row size risk:** full /v1/score response can be 5-15 KB JSONB. At scale we'd want TOAST or compression — Postgres handles JSONB compression automatically via TOAST, so non-blocking.
- **Data policy risk:** same as PR2 — raw requests + responses retained. Same opt-out follow-up gate.

---

## Step status

**PR1 (AR-375):**
- [ ] Step 1 — request context hook (IN PROGRESS — code being written, Pedro to review before commit)
- [ ] Step 2 — User-Agent classifier
- [ ] Step 3 — `trackEvent` reads from ALS
- [ ] Step 4 — `api_keys.training_optout` migration
- [ ] Step 5 — DB smoke
- [ ] Step 6 — `mcp_adoption` view migration
- [ ] Step 7 — /admin tile (aggregate counts only)
- [ ] Step 8 — `docs/DATA_POLICY.md` skeleton

**PR2 (AR-376):**
- [ ] Step 1 — `query_planner_logs` migration
- [ ] Step 2 — wire /v1/query
- [ ] Step 3 — smoke
- [ ] Step 4 — /admin tile
- [ ] Step 5 — ARCHITECTURE.md data-policy note

**PR3 (AR-377):**
- [ ] Step 1 — `brief_composer_logs` migration
- [ ] Step 2 — wire /v1/score (explain branch only)
- [ ] Step 3 — smoke (with-explain creates row, without-explain does not)
- [ ] Step 4 — /admin tile
- [ ] Step 5 — ARCHITECTURE.md data-policy append
