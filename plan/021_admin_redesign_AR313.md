# Plan 021 — Admin redesign (AR-313)

**Status:** DRAFT 2026-06-15. Phase 0 ready to detail.
**Jira Epic:** [AR-313 Admin redesign — restructure around the signal-first world + add geo / per-product / per-org / health stats](https://podnex.atlassian.net/browse/AR-313)
**Branch root:** `feat/AR-313-*` (per-phase sub-branches).

---

## 1. Objective

Replace today's report-centric `/admin` (one page, two endpoints, hardcoded ADMIN_EMAILS gate) with an enterprise-grade god-mode admin that:

1. **Answers business questions, not entity-CRUDs.** Sections grouped by *Who's using us / What they're using / What we're earning / System health*.
2. **Reflects the signal-first world.** Surfaces the 33 `api.*` event taxonomy, the 4 products (Signals/Scores/Monitor/Intelligence), engine-version cohorts, geography.
3. **Reuses AR-312.** Auth gate reads `users.is_superuser`; the `ADMIN_EMAILS` hardcoded list disappears.
4. **No backend in frontend.** Every panel reads via thin `proxySession` proxies. Zero `import sql` in `apps/web/src/app/admin/**`.
5. **Brand v3 altitude.** Reuse `AppShell` + `AppCard` + `StatCell` etc. from the existing primitive set.

Only consumers of this surface for the foreseeable future: ptengelmann + Marcos.

## 2. Hard constraints

- **No backend in frontend.** BFFs are thin `proxySession(req, "/admin/<endpoint>")` one-liners. See [[feedback-no-db-in-web]].
- **No hardcoded gates.** Reuse `users.is_superuser` column (AR-312). Anti-pattern from `ADMIN_EMAILS = ["ptengelmann@gmail.com"]` retires.
- **No em-dashes in user-facing copy** ([[feedback-no-em-dashes]]).
- **Per-PR granularity.** One PR per phase (4 panels = 4 PRs). Not one mega-PR.
- **Pedro tests on localhost before every push.** ([[feedback-ui-iteration-loop]].)
- **Reuse existing primitives.** AppShell, AppCard, StatCell, BarChart, IntentBars already exist in `apps/web/src/app/design-v2/_shared` + the current admin client. Don't invent new layout primitives without justification ([[feedback-use-existing-shells]]).
- **No invented metrics.** Every number on the page must trace to a real SQL query. Empty states honest ("No data yet" not "0").

## 3. Surface design — "by question"

| Section | Sub-panels | Source data |
|---|---|---|
| **Who's using us** | Users (total / active 7d / 30d / signup curve), Orgs (count / size distribution / top by usage), Geography (country / city heatmap from pageviews + activity_events), Churn signal (users with no activity in 14d) | users, org_members, activity_events, pageviews |
| **What they're using** | Per-product call counts (Signals / Scores / Monitor / Intelligence), API endpoint heatmap (which `/v1/*` routes get hit most), Engine-version cohort, Top queries / areas, MCP usage | activity_events (the api.* taxonomy), mcp_usage |
| **What we're earning** | MRR, plan distribution, conversion funnel (signup → first call → subscribe → power user), ARR trend, MCP add-on uptake | subscriptions, subscription_addons, users, activity_events |
| **System health** | apps/api latency p50/p95, error rate, recent 5xx tail (sampled from logger if possible OR a new minimal table), cron job last-run + duration (rescore, etc.), signal-store freshness | TBD — may need a small `system_metrics` table written by cron jobs + a Fastify hook |

## 4. Phases (each = one PR)

### Phase 0 — Auth gate + shell scaffold

- Replace `ADMIN_EMAILS` hardcoded check in `apps/web/src/app/admin/page.tsx` with `isSuperuser` server-action read via apps/api (or session.user.is_superuser if we thread it through NextAuth — TBD in phase detail).
- Scaffold the new four-tab layout (Who / What / Earning / Health) using existing AppShell + AppCard primitives. Empty panels with "Coming in phase N" placeholders.
- Update apps/api admin gate to also read column (already does — uses `isSuperuser` which AR-312 made DB-backed).

### Phase 1 — Who's using us

- New apps/api endpoint group: `GET /admin/audience/users`, `GET /admin/audience/orgs`, `GET /admin/audience/geo`.
- Thin BFF proxies in apps/web.
- Wire the "Who's using us" panel.

### Phase 2 — What they're using

- New apps/api endpoint group: `GET /admin/usage/products`, `GET /admin/usage/endpoints`, `GET /admin/usage/engine-versions`.
- Thin BFF proxies.
- Wire the "What they're using" panel.

### Phase 3 — What we're earning

- **Retire "reports" nomenclature.** Current `getAnalytics()` counts `FROM reports` — "reports" is a legacy concept that doesn't exist in signal-first OneGoodArea. Replace every `reports` count with `activity_events WHERE event LIKE 'api.%'`. Drop the `Total reports / Reports this month / Reports per day` KPIs in favour of `Total API calls / Calls this month / Calls per day`. (Pedro flagged 2026-06-15: "reports DO NOT EXIST ANYMORE".)
- **Rework the conversion funnel** to use signal-first events: `Signed up → First api.* call → Subscribed → Power user (50+ calls/mo)` instead of `Signed up → Generated report → Subscribed`.
- Reuse + extend MRR/plan-distribution queries (those don't reference reports).
- New endpoint group: `GET /admin/revenue/mrr`, `GET /admin/revenue/funnel`, `GET /admin/revenue/addons`.
- Migrate the existing RevenuePanel + ConversionPanel layouts into the new IA.
- Thin BFF proxies.

### Phase 4 — System health

- Decide on metrics source (Fastify onResponse hook → in-memory ring buffer? `system_metrics` table? — phase detail interview).
- New endpoint group: `GET /admin/health/latency`, `GET /admin/health/errors`, `GET /admin/health/crons`.
- Thin BFF proxies.

### Phase 5 — Retire legacy

- Delete `/admin/analytics` + `/admin/traffic-analytics` endpoints once their data is fully absorbed into the new panels, OR keep them as compound endpoints behind the new ones (decided in Phase 4 detail).
- Drop the old `apps/web/src/app/design-v2/admin/client.tsx` panels superseded by the new ones.

## 5. Open questions (resolved interactively, one phase at a time)

- **Phase 0:** Does the auth gate live in `apps/web` (read session.user.is_superuser threaded via NextAuth JWT callback) OR does the BFF call apps/api once per request to check (`GET /me/is-superuser`)? Tradeoff: JWT-claim is faster but adds a callback layer; BFF-call is simpler but adds latency. Pedro to decide before Phase 0 implementation.
- **Phase 1:** Geo source — pageviews already have `country` from Vercel's `x-vercel-ip-country` header; do we also want per-API-call country for paying customers? That'd need adding to activity_events.
- **Phase 4:** Latency / error data source — Render's metrics API exists but is rate-limited and async; a small `system_metrics` table written by a Fastify onResponse hook is more self-contained but adds write volume.

## 6. Non-goals

- Per-org analytics. That's [[AR-289]] and the `/dashboard/org/*` surface.
- Replacing `/admin/dashboard-primitives` (internal dev tooling, leave alone).
- Per-user drill-down pages. Aggregates only in v1; a "Click user → drill-down" pattern is a future follow-up.

## 7. Workflow per phase

Per [[feedback-operations-loop]]:

1. Open Jira sub-ticket under AR-313 (e.g. AR-313-P0, AR-313-P1).
2. Branch `feat/AR-313/p<N>-<slug>` from main.
3. Implement.
4. Run apps/api + apps/web locally.
5. Pedro tests on `http://localhost:3000/admin`.
6. Approve → push → PR → merge.
7. Verify on prod within 5 minutes.
8. Transition Jira ticket to Done. Move to next phase.

---

## Phase 0 — Detail (locked 2026-06-15)

### Goal

1. Replace the hardcoded `ADMIN_EMAILS` check in `apps/web/src/app/admin/page.tsx` with a DB-backed superuser check (reusing `users.is_superuser` from AR-312).
2. Scaffold the new four-tab layout (Who's using us / What they're using / What we're earning / System health). Existing panels move into "What we're earning" so nothing visible regresses. The other three tabs render placeholder "Coming in phase N" cards.

### Decisions

- **Auth check mechanism: Option B (BFF call).** New apps/api endpoint `GET /me/is-superuser`. Decided 2026-06-15.
- **No new design vocabulary in Phase 0.** Reuse `AppShell`, `AppCard`, `StatCell` etc. from `apps/web/src/app/design-v2/_shared`. Tabs use a horizontal nav inside the existing shell (Linear/Stripe pattern).
- **Existing analytics endpoint stays.** `/admin/analytics` + `/admin/traffic-analytics` keep working. Phase 0 doesn't move data, just chrome.
- **No state changes to existing tests.** `tests/modules/admin/*` if any continue to pass.

### Files touched

| File | Change | Lines |
|---|---|---|
| `apps/api/src/app.ts` | Add `GET /me/is-superuser` (session-authed, returns `{ is_superuser: boolean }`) | ~15 |
| `apps/web/src/app/api/me/is-superuser/route.ts` | New BFF: thin `proxySession(req, "/me/is-superuser")` | ~5 |
| `apps/web/src/app/admin/page.tsx` | Replace `ADMIN_EMAILS.includes(email)` with a fetch to the new endpoint; if `!is_superuser` → redirect | ~10 |
| `apps/web/src/app/design-v2/admin/client.tsx` | Add tab nav (4 tabs); slot existing panels into "Earning" tab; placeholder cards in the other 3 | ~40 net (mostly wrapping) |
| `apps/web/src/app/design-v2/admin/admin.css` | Tab nav styles only — no panel redesign in Phase 0 | ~30 |

### Out of Phase 0

- ANY new metric / endpoint group
- ANY data move from "Earning" to other tabs
- Apps/api admin gate change (it already uses `isSuperuser()` post-AR-312, so it's correct)
- Geo / per-product / engine-version data (Phases 1-2)
- Retiring `/admin/analytics` (Phase 5)

### Acceptance

1. `GET /me/is-superuser` returns `{is_superuser: true}` for ptengelmann, `{is_superuser: false}` for any other user, 401 with no session.
2. `/admin` page redirects to `/dashboard` for any user where `is_superuser !== true`. No hardcoded email comparison anywhere in the file (`grep -n "ADMIN_EMAILS" apps/web/src/app/admin/page.tsx` returns nothing).
3. `/admin` renders 4 tabs: "Audience" / "Usage" / "Revenue" / "Health". The first three placeholders show a "Coming in phase N" card. "Revenue" renders the existing MRR + funnel + KPI panels with no regression.
4. apps/api tsc + tests stay green.
5. Pedro tests at `http://localhost:3000/admin` and confirms: (a) tabs visible, (b) Revenue tab shows the same data as before, (c) switching tabs feels right.

### Implementation order

1. New apps/api endpoint (smallest, no behaviour change yet)
2. New BFF proxy
3. Update admin/page.tsx auth check
4. Update admin client to add tabs + slot existing into Earning
5. Run dev locally, Pedro reviews
6. Push PR — squash merge once CI green

---

**Status: Phase 0 ready to implement. Branch: `feat/AR-313/p0-auth-gate-and-shell`.**

---

## Phase 1 — Detail (locked 2026-06-15)

### Goal

Replace the Audience tab placeholder with a real panel that answers **"who's using OneGoodArea?"** End-to-end: new apps/api composite endpoint, thin BFF, Brand-v3 panel with KPI row + charts + top-N lists.

### Decisions

- **Composite endpoint** `GET /admin/audience` returns all sub-stats in one round-trip. Stripe/Linear pattern: a single fetch per tab, not 4 endpoints fanned out from the BFF.
- **Geography source**: `pageviews` table (already capturing `country` via `x-vercel-ip-country`). Not adding country to `activity_events` in this phase — phase scope is what's already collected.
- **Churn signal definition**: users created >14 days ago with no `activity_events` in the last 14 days. A simple count + the top-10 list of stale users (id + email + days inactive).
- **Top orgs by activity**: rank orgs by COUNT of `activity_events` joined via `users → org_members → orgs` in the last 30 days. Top 10.
- **Org size distribution**: buckets `1`, `2-5`, `6-20`, `20+` member orgs.
- **Active windows**: 7d + 30d distinct user_id from `activity_events` (api.* events).

### Files touched

| File | Change | Lines |
|---|---|---|
| `apps/api/src/modules/admin/index.ts` | New `getAudienceStats()` function — composite query | ~120 |
| `apps/api/src/app.ts` | New `GET /admin/audience` handler (session-authed + superuser-gated) | ~15 |
| `apps/web/src/app/api/admin/audience/route.ts` | New BFF — thin `proxySession(req, "/admin/audience")` | ~5 |
| `apps/web/src/app/admin/page.tsx` | Fetch audience data alongside the others, pass to AdminClient | ~5 |
| `apps/web/src/app/design-v2/admin/client.tsx` | New `AudiencePanel` component; render in Audience tab instead of placeholder | ~120 |
| `apps/web/src/app/design-v2/admin/admin.css` | Audience-specific layout helpers (KPI row + charts + lists) | ~30 |

### Response shape

```ts
type AudienceStats = {
  users: {
    total: number;
    active_7d: number;
    active_30d: number;
    signups_per_day: { day: string; count: number }[]; // last 30 days
    churn_signal_count: number;
    stale_users: { user_id: string; email: string; days_inactive: number }[]; // top 10
  };
  orgs: {
    total: number;
    size_distribution: { bucket: "1" | "2-5" | "6-20" | "20+"; count: number }[];
    top_by_activity: { org_id: string; org_name: string; events_30d: number }[]; // top 10
  };
  geo: {
    top_countries: { country: string; count: number }[]; // top 10, last 30d
    top_cities: { city: string; count: number }[]; // top 10, last 30d
    unique_countries_30d: number;
  };
};
```

### Panel layout

```
[ KPI row: Total users | Active 7d | Active 30d | Total orgs | Unique countries 30d ]

[ Signups (30d) chart        ] [ Org size distribution bar  ]

[ Top countries list         ] [ Top cities list            ]

[ Top orgs by activity (30d) ] [ Churn signal: stale users  ]
```

All sub-panels reuse existing patterns: `KpiRow` style for the top StatCell row, `BarChart` for signups + size distribution, list patterns from `ActivityAndAreas` for top-N rows.

### Acceptance

1. `curl -i https://onegoodarea.com/api/admin/audience` (no cookie) → 401
2. As ptengelmann: `GET /api/admin/audience` returns the typed shape above, all numbers match `SELECT count(*)` ad-hoc queries.
3. Audience tab on `/admin` renders KPI row + 6 sub-panels — no `ComingSoon` card any more.
4. Switching between Audience/Revenue is fast (no full re-fetch — both data already on the page).
5. apps/api + apps/web tsc clean, tests pass (new test for `getAudienceStats` ideally).
6. Pedro confirms localhost.

---

## Phase 2 — Detail (locked 2026-06-15)

### Goal

Replace the Usage tab placeholder with the **"what they're using"** panel. Surfaces the 4-product world + endpoint heatmap. Engine-version cohort deferred (activity_events doesn't carry the version stamp today; would need an enrichment ticket).

### Decisions

- **Composite endpoint** `GET /admin/usage` — same one-fetch-per-tab pattern as Phase 1.
- **Product mapping** by event prefix (mapping table below). 5 buckets: Signals / Scores / Monitor / Intelligence / Org & Levers. The 4 products are the user-facing ones; Org & Levers is internal but reflects real activity worth showing.
- **Top endpoints** = top 20 distinct `event` names from `activity_events WHERE event LIKE 'api.%' AND created_at >= NOW() - INTERVAL '30 days'`. Each row shows the event name + count + last seen (so you can spot stale endpoints).
- **No engine-version panel.** The X-Engine-Version stamp lives on response headers, not in activity_events.metadata. Filing follow-up ticket to enrich tracking; until then we don't fake the data.

### Product → event mapping

| Product | Event prefixes |
|---|---|
| **Signals** | `api.signals.*`, `api.area.profiled` |
| **Scores** | `api.score.*`, `api.report.*`, `api.batch.*` |
| **Monitor** | `api.portfolio.*` |
| **Intelligence** | `api.query.*`, `api.insights.*`, `api.forecast.*`, `api.peers.*`, `api.areas.queried` |
| **Org & Levers** | `api.org.*`, `api.bundle.*`, `api.cohort.*`, `api.preset.*`, `api.methodology.*` |

Mapping lives server-side in `apps/api/src/modules/admin/index.ts` so it stays in sync with the trackEvent calls in `app.ts`. Pure data; no shared state with the frontend.

### Response shape

```ts
type UsageStats = {
  totals: {
    calls_7d: number;
    calls_30d: number;
    top_product: string | null;
    top_endpoint: string | null;
  };
  per_product: { product: "Signals" | "Scores" | "Monitor" | "Intelligence" | "Org & Levers"; calls_30d: number }[];
  top_endpoints: { event: string; count: number; last_seen: string }[]; // top 20, 30d window
};
```

### Files touched

| File | Change | Lines |
|---|---|---|
| `apps/api/src/modules/admin/index.ts` | New `getUsageStats()` + the product mapping table | ~80 |
| `apps/api/src/app.ts` | New `GET /admin/usage` handler | ~20 |
| `apps/web/src/app/api/admin/usage/route.ts` | New BFF | ~5 |
| `apps/web/src/app/admin/page.tsx` | Fetch usage alongside audience | ~3 |
| `apps/web/src/app/design-v2/admin/page.tsx` | Sync | ~3 |
| `apps/web/src/app/design-v2/admin/client.tsx` | New `UsagePanel`; render in Usage tab | ~90 |
| `apps/web/src/app/design-v2/admin/admin.css` | Per-product bar chart, top-endpoints list styling | ~30 |
| `apps/api/tests/modules/admin/index.test.ts` | New test for `getUsageStats` | ~30 |

### Out of Phase 2

- Engine-version cohort (no source today; file separate ticket).
- Per-user drill-down ("who hit /v1/score the most"). Aggregate only.
- "Endpoint detail" page. Top-N is enough for v1.

### Acceptance

1. `GET /api/admin/usage` returns the typed shape; numbers match ad-hoc `SELECT COUNT(*) FROM activity_events WHERE event LIKE 'api.score.%'` etc.
2. Usage tab on `/admin` renders KPI row + per-product bars + top endpoints list. No "Coming in Phase 2" card.
3. Top endpoints reflects actual taxonomy — none of them say `api.report.generated` as #1 unless reports actually are the most-called endpoint (test sanity-check).
4. apps/api + apps/web tsc clean. New `getUsageStats` test passes.
5. Pedro tests on localhost.
