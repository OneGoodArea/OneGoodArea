"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppCard, StatCell } from "../_shared/app-shell";
import { Wordmark } from "../_shared/wordmark";
import "./admin.css";

/* /admin — Brand v3 rewrite (AR-204 close-out 9/15).

   Email-gated analytics dashboard (Pedro only). Wraps the real
   getAnalytics / getTrafficAnalytics data. Internal ops surface
   — not in the public dashboard restructure scope. Token migration
   + visual cleanup only.

   PLAN_PRICES still references legacy v1 plan names (starter / pro /
   developer / business / growth) because pre-April-2026 subscribers
   can still be on them. Keep until those subscribers age out. */

/* AR-313 Phase 1: "reports" nomenclature retired. The reports table is
   legacy; every counter that used to read FROM reports now reads FROM
   activity_events WHERE event LIKE 'api.%' (matches the 33-event taxonomy
   signal-first cutover introduced). Intent distribution dropped — that
   field lived on report rows only. */
type Analytics = {
  totalUsers: number;
  totalApiCalls: number;
  apiCallsThisMonth: number;
  activeUsersThisMonth: number;
  apiCallsPerDay: { day: string; count: number }[];
  topAreas: { area: string; count: number }[];
  recentActivity: {
    event: string;
    user_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    name: string | null;
    email: string | null;
  }[];
  userGrowth: { day: string; count: number }[];
  usersWithApiCalls: number;
  paidUsers: number;
  subscriptionsByPlan: { plan: string; count: number }[];
  mrr: number;
};

type TrafficData = {
  totalPageviews: number;
  pageviewsToday: number;
  uniqueVisitorsToday: number;
  uniqueVisitors30d: number;
  pageviewsPerDay: { day: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
};

/* AR-313 Phase 1: composite "who's using us" shape returned by
   GET /admin/audience. Matches AudienceStats in apps/api modules/admin
   (typed boundary, no shared import — apps/web can't import from
   apps/api per the no-backend-in-frontend rule). */
type AudienceStats = {
  users: {
    total: number;
    active_7d: number;
    active_30d: number;
    signups_per_day: { day: string; count: number }[];
    churn_signal_count: number;
    stale_users: { user_id: string; email: string; days_inactive: number }[];
  };
  orgs: {
    total: number;
    size_distribution: { bucket: "1" | "2-5" | "6-20" | "20+"; count: number }[];
    top_by_activity: { org_id: string; org_name: string; events_30d: number }[];
  };
  geo: {
    top_countries: { country: string; count: number }[];
    unique_countries_30d: number;
  };
};

/* AR-313 Phase 2: "what they're using" shape returned by GET /admin/usage.
   Per-product breakdown groups events by their api.* prefix server-side
   (Signals / Scores / Monitor / Intelligence / Org & Levers). */
type AdminProduct =
  | "Signals"
  | "Scores"
  | "Monitor"
  | "Intelligence"
  | "Org & Levers";

type UsageStats = {
  totals: {
    calls_7d: number;
    calls_30d: number;
    top_product: AdminProduct | null;
    top_endpoint: string | null;
  };
  per_product: { product: AdminProduct; calls_30d: number }[];
  top_endpoints: { event: string; count: number; last_seen: string }[];
};

/* AR-313 Phase 3: revenue extras for the Revenue tab. ARR is computed
   server-side (MRR × 12) so the client doesn't recalc. ARR trend chart
   deferred — see AR-316. */
type RevenueExtras = {
  arr: number;
  mcp: {
    total_paying: number;
    with_mcp_addon: number;
    in_mcp_inclusive_plan: number;
  };
  addons: { addon_key: string; active_count: number }[];
};

/* AR-375: MCP adoption snapshot for the /admin Usage tab tile. Aggregate
   counts only — see plan/029 decision #12. Raw event metadata is never
   shipped to the client. */
type McpAdoption = {
  total_events_30d: number;
  unique_orgs_30d: number;
  unique_users_30d: number;
  top_orgs: {
    org_id: string | null;
    org_name: string | null;
    event_count: number;
    last_seen: string;
  }[];
  by_client_app: { client_app: string; event_count: number }[];
};

/* AR-376: training-corpus snapshot. Aggregate planner-pair counts + the
   opt-out denominator over active API keys. No raw question text or
   plan content is ever shipped here. */
type TrainingCorpus = {
  planner_pairs_30d: number;
  planner_pairs_total: number;
  planner_last_seen: string | null;
  brief_pairs_30d: number;
  brief_pairs_total: number;
  brief_last_seen: string | null;
  keys_opted_out: number;
  keys_total: number;
};

export type { Analytics, TrafficData, AudienceStats, UsageStats, RevenueExtras, McpAdoption, TrainingCorpus };

const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  pro: 79,
  developer: 49,
  business: 249,
  growth: 499,
};

const EVENT_LABELS: Record<string, string> = {
  "report.generated": "Generated report",
  "api.report.generated": "API report generated",
  "auth.signin": "Signed in",
  "auth.signup": "Signed up",
  "plan.upgrade.started": "Started upgrade",
  "plan.upgraded": "Plan upgraded",
  "password.changed": "Changed password",
};

/* AR-313 Phase 0: four tabs grouped by business question
   (Audience / Usage / Revenue / Health). Audience + Usage + Health
   are placeholders for now; Revenue holds the existing MRR + funnel +
   activity + traffic panels so nothing visible regresses. Phases 1-4
   migrate each panel to its proper tab + add the missing stats. */
type AdminTab = "audience" | "usage" | "revenue" | "health";

const TABS: { id: AdminTab; label: string; phase: number; question: string }[] = [
  { id: "audience", label: "Audience", phase: 1, question: "Who's using us — users, orgs, geography, churn signals." },
  { id: "usage", label: "Usage", phase: 2, question: "What they're using — 4 products, endpoint heatmap, engine-version cohorts." },
  { id: "revenue", label: "Revenue", phase: 3, question: "What we're earning — MRR, plans, conversion funnel, add-ons." },
  { id: "health", label: "Health", phase: 4, question: "System health — latency, errors, cron jobs, signal-store freshness." },
];

export default function AdminClient({
  analytics,
  traffic,
  audience,
  usage,
  revenue,
  mcpAdoption,
  trainingCorpus,
}: {
  analytics: Analytics | null;
  traffic: TrafficData | null;
  audience: AudienceStats | null;
  usage: UsageStats | null;
  revenue: RevenueExtras | null;
  mcpAdoption: McpAdoption | null;
  trainingCorpus: TrainingCorpus | null;
}) {
  const [tab, setTab] = useState<AdminTab>("revenue");

  /* AR-313 Phase 1 (Pedro 2026-06-15): admin is its own surface, not
     a /dashboard sub-page. No left sidebar, no product nav. Just a
     minimal top bar with brand + back-to-dashboard + sign-out. */
  return (
    <div className="oga-admin-shell">
      <header className="oga-admin-shell__header">
        <div className="oga-admin-shell__brand">
          <Wordmark size={18} tone="dark" href="/" />
          <span className="oga-admin-shell__eyebrow">Admin</span>
        </div>
        <div className="oga-admin-shell__actions">
          <Link href="/dashboard" className="oga-admin-shell__link">
            Back to dashboard
          </Link>
          <button
            type="button"
            className="oga-admin-shell__signout"
            onClick={() => { signOut({ callbackUrl: "/" }); }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="oga-admin">
        <nav className="oga-admin__tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              className={`oga-admin__tab${tab === t.id ? " oga-admin__tab--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="oga-admin__panel" role="tabpanel">
          {tab === "revenue" ? (
            analytics ? (
              <>
                <KpiRow analytics={analytics} revenue={revenue} />
                <RevenueAndFunnel analytics={analytics} />
                {revenue && <McpUptakePanel revenue={revenue} />}
                <ChartsRow analytics={analytics} />
                <ActivityAndAreas analytics={analytics} />
                {traffic && <TrafficSection traffic={traffic} />}
              </>
            ) : (
              <div className="oga-admin__empty">No analytics data available</div>
            )
          ) : tab === "audience" ? (
            audience ? (
              <AudiencePanel audience={audience} />
            ) : (
              <div className="oga-admin__empty">No audience data available</div>
            )
          ) : tab === "usage" ? (
            usage ? (
              <UsagePanel usage={usage} mcpAdoption={mcpAdoption} trainingCorpus={trainingCorpus} />
            ) : (
              <div className="oga-admin__empty">No usage data available</div>
            )
          ) : (
            <ComingSoon tab={TABS.find((t) => t.id === tab)!} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AR-313 Phase 1 — Audience panel
   ============================================================ */
function AudiencePanel({ audience }: { audience: AudienceStats }) {
  return (
    <>
      <div className="oga-admin__kpi">
        <StatCell label="Total users" value={audience.users.total} />
        <StatCell label="Active (7d)" value={audience.users.active_7d} accent="strong" />
        <StatCell label="Active (30d)" value={audience.users.active_30d} />
        <StatCell label="Total orgs" value={audience.orgs.total} />
        <StatCell label="Countries (30d)" value={audience.geo.unique_countries_30d} />
      </div>

      <div className="oga-admin__2col">
        <AppCard title="Signups" note="Last 30 days · daily">
          {audience.users.signups_per_day.length === 0 ? (
            <EmptyNote>No signups in the last 30 days.</EmptyNote>
          ) : (
            <BarChart data={audience.users.signups_per_day} />
          )}
        </AppCard>
        <AppCard title="Org size distribution" note="Members per org">
          {audience.orgs.size_distribution.length === 0 ? (
            <EmptyNote>No orgs yet.</EmptyNote>
          ) : (
            <BucketBars buckets={audience.orgs.size_distribution} />
          )}
        </AppCard>
      </div>

      <div className="oga-admin__2col">
        <AppCard title="Top countries" note="Last 30 days · pageviews">
          {audience.geo.top_countries.length === 0 ? (
            <EmptyNote>No pageview geography yet.</EmptyNote>
          ) : (
            <CountryList countries={audience.geo.top_countries} />
          )}
        </AppCard>
        <AppCard title="Top orgs by activity" note="Last 30 days · api.* events">
          {audience.orgs.top_by_activity.length === 0 ? (
            <EmptyNote>No org activity yet.</EmptyNote>
          ) : (
            <TopOrgsList orgs={audience.orgs.top_by_activity} />
          )}
        </AppCard>
      </div>

      <AppCard
        title="Churn signal"
        note={`${audience.users.churn_signal_count} users · no api.* activity in 14d`}
      >
        {audience.users.stale_users.length === 0 ? (
          <EmptyNote>No stale users. Everyone signed-up is active.</EmptyNote>
        ) : (
          <StaleUsersList users={audience.users.stale_users} />
        )}
      </AppCard>
    </>
  );
}

function BucketBars({
  buckets,
}: {
  buckets: { bucket: string; count: number }[];
}) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <ul className="oga-admin__intents">
      {buckets.map((b) => (
        <li key={b.bucket} className="oga-admin__intent-row">
          <span className="oga-admin__intent-label">{b.bucket} {b.bucket === "1" ? "member" : "members"}</span>
          <div className="oga-admin__intent-track">
            <div
              className="oga-admin__intent-fill"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
          <span className="oga-admin__intent-count">{b.count}</span>
        </li>
      ))}
    </ul>
  );
}

function CountryList({
  countries,
}: {
  countries: { country: string; count: number }[];
}) {
  const total = countries.reduce((s, c) => s + c.count, 0) || 1;
  return (
    <ul className="oga-admin__list">
      {countries.map((c, i) => (
        <li key={c.country} className="oga-admin__area-row">
          <span className="oga-admin__area-rank">{String(i + 1).padStart(2, "0")}</span>
          <span className="oga-admin__area-name">{c.country}</span>
          <span className="oga-admin__area-count">
            {c.count.toLocaleString()} · {Math.round((c.count / total) * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function TopOrgsList({
  orgs,
}: {
  orgs: { org_id: string; org_name: string; events_30d: number }[];
}) {
  return (
    <ul className="oga-admin__list">
      {orgs.map((o, i) => (
        <li key={o.org_id} className="oga-admin__area-row">
          <span className="oga-admin__area-rank">{String(i + 1).padStart(2, "0")}</span>
          <span className="oga-admin__area-name">{o.org_name}</span>
          <span className="oga-admin__area-count">{o.events_30d.toLocaleString()} calls</span>
        </li>
      ))}
    </ul>
  );
}

function StaleUsersList({
  users,
}: {
  users: { user_id: string; email: string; days_inactive: number }[];
}) {
  return (
    <ul className="oga-admin__list">
      {users.map((u) => (
        <li key={u.user_id} className="oga-admin__stale-row">
          <span className="oga-admin__stale-email">{u.email}</span>
          <span className="oga-admin__stale-days">{u.days_inactive}d inactive</span>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   AR-313 Phase 2 — Usage panel
   ============================================================ */
function UsagePanel({
  usage,
  mcpAdoption,
  trainingCorpus,
}: {
  usage: UsageStats;
  mcpAdoption: McpAdoption | null;
  trainingCorpus: TrainingCorpus | null;
}) {
  return (
    <>
      <div className="oga-admin__kpi">
        <StatCell label="API calls (7d)" value={usage.totals.calls_7d} accent="strong" />
        <StatCell label="API calls (30d)" value={usage.totals.calls_30d} />
        <StatCell label="Top product (30d)" value={usage.totals.top_product ?? "—"} />
        <StatCell label="Top endpoint (30d)" value={usage.totals.top_endpoint ?? "—"} />
      </div>

      <AppCard title="By product" note="Last 30 days · api.* events">
        {usage.per_product.every((p) => p.calls_30d === 0) ? (
          <EmptyNote>No api.* calls in the last 30 days.</EmptyNote>
        ) : (
          <ProductBars data={usage.per_product} />
        )}
      </AppCard>

      <AppCard
        title="Top endpoints"
        note={`Last 30 days · ${usage.top_endpoints.length} of ${usage.top_endpoints.length} shown`}
      >
        {usage.top_endpoints.length === 0 ? (
          <EmptyNote>No endpoints called in the last 30 days.</EmptyNote>
        ) : (
          <EndpointHeatmap endpoints={usage.top_endpoints} />
        )}
      </AppCard>

      {/* AR-375: MCP adoption tile. Aggregate counts only — raw event
          metadata is never rendered. Per plan/029 decision #12. */}
      <McpAdoptionTile mcp={mcpAdoption} />

      {/* AR-376: training corpus tile. Counts only — raw NL questions
          + plans are never rendered here. */}
      <TrainingCorpusTile corpus={trainingCorpus} />
    </>
  );
}

function TrainingCorpusTile({ corpus }: { corpus: TrainingCorpus | null }) {
  if (!corpus) {
    return (
      <AppCard title="Training corpus" note="Planner + brief composer captures">
        <EmptyNote>Training corpus stats unavailable.</EmptyNote>
      </AppCard>
    );
  }
  const optoutPct =
    corpus.keys_total > 0
      ? Math.round((corpus.keys_opted_out / corpus.keys_total) * 100)
      : 0;
  return (
    <AppCard title="Training corpus" note="Planner + brief composer captures">
      <div className="oga-admin__subhead">Planner pairs · /v1/query NL captures</div>
      <div className="oga-admin__kpi">
        <StatCell
          label="Pairs (30d)"
          value={corpus.planner_pairs_30d}
          accent="strong"
        />
        <StatCell label="Pairs total" value={corpus.planner_pairs_total} />
        <StatCell
          label="Last capture"
          value={
            corpus.planner_last_seen
              ? new Date(corpus.planner_last_seen).toLocaleDateString()
              : "—"
          }
        />
      </div>

      <div className="oga-admin__subhead">Brief composer pairs · /v1/score?explain=true</div>
      <div className="oga-admin__kpi">
        <StatCell
          label="Pairs (30d)"
          value={corpus.brief_pairs_30d}
          accent="strong"
        />
        <StatCell label="Pairs total" value={corpus.brief_pairs_total} />
        <StatCell
          label="Last capture"
          value={
            corpus.brief_last_seen
              ? new Date(corpus.brief_last_seen).toLocaleDateString()
              : "—"
          }
        />
      </div>

      <div className="oga-admin__subhead">Opt-out coverage</div>
      <div className="oga-admin__kpi">
        <StatCell
          label="Keys opted out"
          value={`${corpus.keys_opted_out} / ${corpus.keys_total} (${optoutPct}%)`}
        />
      </div>
    </AppCard>
  );
}

function McpAdoptionTile({ mcp }: { mcp: McpAdoption | null }) {
  if (!mcp) {
    return (
      <AppCard title="MCP adoption" note="Last 30 days · source=mcp">
        <EmptyNote>MCP adoption data unavailable.</EmptyNote>
      </AppCard>
    );
  }
  const hasData = mcp.total_events_30d > 0;
  return (
    <AppCard title="MCP adoption" note="Last 30 days · source=mcp">
      <div className="oga-admin__kpi">
        <StatCell label="MCP calls (30d)" value={mcp.total_events_30d} accent="strong" />
        <StatCell label="Unique orgs (30d)" value={mcp.unique_orgs_30d} />
        <StatCell label="Unique users (30d)" value={mcp.unique_users_30d} />
      </div>
      {!hasData ? (
        <EmptyNote>No MCP calls in the last 30 days.</EmptyNote>
      ) : (
        <>
          <div className="oga-admin__subhead">By client app</div>
          <ProductBars
            data={mcp.by_client_app.map((c) => ({
              product: c.client_app,
              calls_30d: c.event_count,
            }))}
          />
          <div className="oga-admin__subhead">Top orgs</div>
          <ul className="oga-admin__intents">
            {mcp.top_orgs.map((o) => (
              <li key={o.org_id ?? "null"} className="oga-admin__intent-row">
                <span className="oga-admin__intent-label">
                  {o.org_name ?? o.org_id ?? "(unknown)"}
                </span>
                <span className="oga-admin__intent-count">
                  {o.event_count.toLocaleString()}
                </span>
                <span className="oga-admin__intent-pct">
                  {new Date(o.last_seen).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppCard>
  );
}

function ProductBars({
  data,
}: {
  data: { product: string; calls_30d: number }[];
}) {
  const max = Math.max(...data.map((d) => d.calls_30d), 1);
  const total = data.reduce((s, d) => s + d.calls_30d, 0);
  return (
    <ul className="oga-admin__intents">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.calls_30d / total) * 100) : 0;
        return (
          <li key={d.product} className="oga-admin__intent-row">
            <span className="oga-admin__intent-label">{d.product}</span>
            <div className="oga-admin__intent-track">
              <div
                className="oga-admin__intent-fill"
                style={{ width: `${(d.calls_30d / max) * 100}%` }}
              />
            </div>
            <span className="oga-admin__intent-count">{d.calls_30d.toLocaleString()}</span>
            <span className="oga-admin__intent-pct">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function EndpointHeatmap({
  endpoints,
}: {
  endpoints: { event: string; count: number; last_seen: string }[];
}) {
  const max = Math.max(...endpoints.map((e) => e.count), 1);
  return (
    <ul className="oga-admin__list">
      {endpoints.map((e, i) => (
        <li key={e.event} className="oga-admin__endpoint-row">
          <span className="oga-admin__endpoint-rank">{String(i + 1).padStart(2, "0")}</span>
          <span className="oga-admin__endpoint-name">{e.event}</span>
          <div className="oga-admin__endpoint-track">
            <div
              className="oga-admin__endpoint-fill"
              style={{ width: `${(e.count / max) * 100}%` }}
            />
          </div>
          <span className="oga-admin__endpoint-count">{e.count.toLocaleString()}</span>
          <span
            className="oga-admin__endpoint-last"
            suppressHydrationWarning
          >
            {relativeTime(e.last_seen)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ComingSoon({ tab }: { tab: { label: string; phase: number; question: string } }) {
  return (
    <AppCard title={tab.label} note={`Phase ${tab.phase} of the admin redesign (AR-313).`}>
      <p className="oga-admin__coming">{tab.question}</p>
      <p className="oga-admin__coming-muted">
        This tab is a placeholder. Real metrics arrive in Phase {tab.phase}. Revenue tab holds the current view in the meantime.
      </p>
    </AppCard>
  );
}

/* ============================================================
   KPI row
   ============================================================ */
function KpiRow({
  analytics,
  revenue,
}: {
  analytics: Analytics;
  revenue: RevenueExtras | null;
}) {
  return (
    <div className="oga-admin__kpi">
      <StatCell label="Total users" value={analytics.totalUsers} />
      <StatCell label="Total API calls" value={analytics.totalApiCalls} />
      <StatCell
        label="API calls this month"
        value={analytics.apiCallsThisMonth}
        accent="strong"
      />
      <StatCell label="Active (30d)" value={analytics.activeUsersThisMonth} />
      {revenue && (
        <StatCell label="ARR" value={`£${revenue.arr.toLocaleString()}`} />
      )}
    </div>
  );
}

/* ============================================================
   Revenue + conversion funnel (2-col)
   ============================================================ */
function RevenueAndFunnel({ analytics }: { analytics: Analytics }) {
  return (
    <div className="oga-admin__2col">
      <RevenuePanel
        subscriptionsByPlan={analytics.subscriptionsByPlan}
        mrr={analytics.mrr}
      />
      <ConversionPanel
        totalUsers={analytics.totalUsers}
        usersWithApiCalls={analytics.usersWithApiCalls}
        paidUsers={analytics.paidUsers}
      />
    </div>
  );
}

function RevenuePanel({
  subscriptionsByPlan,
  mrr,
}: {
  subscriptionsByPlan: { plan: string; count: number }[];
  mrr: number;
}) {
  const totalSubs = subscriptionsByPlan.reduce((s, sub) => s + sub.count, 0);
  return (
    <AppCard
      title="Revenue"
      note={`${totalSubs} active subscription${totalSubs !== 1 ? "s" : ""}`}
    >
      <div className="oga-admin__mrr-row">
        <span className="oga-admin__mrr-value">£{mrr.toLocaleString()}</span>
        <span className="oga-admin__mrr-label">MRR</span>
      </div>

      {totalSubs === 0 ? (
        <div className="oga-admin__empty-row">No active subscriptions yet</div>
      ) : (
        <>
          <ul className="oga-admin__plan-list">
            {["starter", "pro", "developer", "business", "growth"].map((plan) => {
              const row = subscriptionsByPlan.find((s) => s.plan === plan);
              const count = row?.count || 0;
              const revenue = count * (PLAN_PRICES[plan] || 0);
              const isApi = ["developer", "business", "growth"].includes(plan);
              return (
                <li
                  key={plan}
                  className={
                    count === 0
                      ? "oga-admin__plan-row oga-admin__plan-row--empty"
                      : "oga-admin__plan-row"
                  }
                >
                  <span className="oga-admin__plan-name">
                    <span
                      aria-hidden
                      className={
                        isApi
                          ? "oga-admin__plan-dot oga-admin__plan-dot--api"
                          : "oga-admin__plan-dot"
                      }
                    />
                    <span>{plan}</span>
                  </span>
                  <span className="oga-admin__plan-count">{count}</span>
                  <span className="oga-admin__plan-revenue">£{revenue}/mo</span>
                </li>
              );
            })}
          </ul>

          <div className="oga-admin__plan-bar">
            {subscriptionsByPlan
              .filter((s) => s.count > 0)
              .map((s) => {
                const isApi = ["developer", "business", "growth"].includes(s.plan);
                return (
                  <div
                    key={s.plan}
                    className={
                      isApi
                        ? "oga-admin__plan-bar-fill oga-admin__plan-bar-fill--api"
                        : "oga-admin__plan-bar-fill"
                    }
                    style={{ width: `${(s.count / totalSubs) * 100}%` }}
                  />
                );
              })}
          </div>
        </>
      )}
    </AppCard>
  );
}

function ConversionPanel({
  totalUsers,
  usersWithApiCalls,
  paidUsers,
}: {
  totalUsers: number;
  usersWithApiCalls: number;
  paidUsers: number;
}) {
  const maxVal = Math.max(totalUsers, 1);
  const steps: { label: string; value: number; tone: "ink" | "amber" }[] = [
    { label: "Signed up", value: totalUsers, tone: "ink" },
    { label: "First API call", value: usersWithApiCalls, tone: "ink" },
    { label: "Paid plan", value: paidUsers, tone: "amber" },
  ];

  return (
    <AppCard title="Conversion funnel">
      <ul className="oga-admin__funnel">
        {steps.map((step, i) => {
          const widthPct = Math.max((step.value / maxVal) * 100, 4);
          const conversion =
            i > 0 && steps[i - 1].value > 0
              ? Math.round((step.value / steps[i - 1].value) * 100)
              : null;
          return (
            <li key={step.label}>
              {conversion !== null && (
                <div className="oga-admin__funnel-conv">
                  ↳ {conversion}% converted
                </div>
              )}
              <div className="oga-admin__funnel-row">
                <span className="oga-admin__funnel-label">{step.label}</span>
                <div className="oga-admin__funnel-track">
                  <div
                    className="oga-admin__funnel-fill"
                    data-tone={step.tone}
                    style={{ width: `${widthPct}%` }}
                  />
                  <span
                    className="oga-admin__funnel-value"
                    data-tone={step.tone}
                  >
                    {step.value}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </AppCard>
  );
}

/* ============================================================
   AR-313 Phase 3 — MCP uptake panel
   Shows how many paying customers use MCP (via add-on OR via an
   inclusive plan like Growth+). Useful for tracking MCP adoption
   as a separate revenue/usage motion from base plans.
   ============================================================ */
function McpUptakePanel({ revenue }: { revenue: RevenueExtras }) {
  const { mcp, addons } = revenue;
  const totalMcp = mcp.with_mcp_addon + mcp.in_mcp_inclusive_plan;
  const pctOfPaying = mcp.total_paying > 0
    ? Math.round((totalMcp / mcp.total_paying) * 100)
    : 0;
  return (
    <AppCard
      title="MCP uptake"
      note={`${totalMcp} of ${mcp.total_paying} paying customers · ${pctOfPaying}%`}
    >
      <div className="oga-admin__mcp-grid">
        <div className="oga-admin__mcp-cell">
          <span className="oga-admin__mcp-value">{mcp.with_mcp_addon}</span>
          <span className="oga-admin__mcp-label">via add-on (£29/mo)</span>
        </div>
        <div className="oga-admin__mcp-cell">
          <span className="oga-admin__mcp-value">{mcp.in_mcp_inclusive_plan}</span>
          <span className="oga-admin__mcp-label">via inclusive plan (Growth+ / Enterprise)</span>
        </div>
        <div className="oga-admin__mcp-cell oga-admin__mcp-cell--total">
          <span className="oga-admin__mcp-value">{totalMcp}</span>
          <span className="oga-admin__mcp-label">total MCP users</span>
        </div>
      </div>

      {addons.length > 1 && (
        <ul className="oga-admin__list oga-admin__addons">
          {addons.map((a) => (
            <li key={a.addon_key} className="oga-admin__addon-row">
              <span className="oga-admin__addon-key">{a.addon_key}</span>
              <span className="oga-admin__addon-count">{a.active_count} active</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}

/* ============================================================
   Charts row: API calls / day (last 30d). Intent distribution
   dropped (lived on reports rows only — AR-313 Phase 1).
   ============================================================ */
function ChartsRow({ analytics }: { analytics: Analytics }) {
  const callsTotal = analytics.apiCallsPerDay.reduce(
    (s, d) => s + d.count,
    0,
  );
  return (
    <AppCard title="API calls / day · 30d" note={`${callsTotal} total`}>
      <BarChart data={analytics.apiCallsPerDay} />
    </AppCard>
  );
}

function BarChart({
  data,
  height = 140,
}: {
  data: { day: string; count: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <EmptyNote>No data yet</EmptyNote>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <>
      <div className="oga-admin__chart" style={{ height }}>
        {data.map((d) => {
          const h = Math.max((d.count / max) * 100, d.count === 0 ? 2 : 6);
          return (
            <div
              key={d.day}
              className={
                d.count === 0
                  ? "oga-admin__chart-bar oga-admin__chart-bar--empty"
                  : "oga-admin__chart-bar"
              }
              style={{ height: `${h}%` }}
              title={`${formatDay(d.day)} · ${d.count} report${d.count !== 1 ? "s" : ""}`}
            />
          );
        })}
      </div>
      <div className="oga-admin__chart-axis">
        <span>{formatDay(data[0]?.day || "")}</span>
        <span>today</span>
      </div>
    </>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="oga-admin__empty">{children}</div>;
}

/* ============================================================
   Activity + top areas (asymmetric 2-col)
   ============================================================ */
function ActivityAndAreas({ analytics }: { analytics: Analytics }) {
  return (
    <div className="oga-admin__2col oga-admin__2col--areas">
      <AppCard title={`Top areas · ${analytics.topAreas.length}`} noPad>
        {analytics.topAreas.length === 0 ? (
          <div className="oga-admin__pad-empty">
            <EmptyNote>No reports yet</EmptyNote>
          </div>
        ) : (
          <ul className="oga-admin__list">
            {analytics.topAreas.slice(0, 10).map((a, i) => (
              <li key={a.area + i} className="oga-admin__area-row">
                <span className="oga-admin__area-rank">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="oga-admin__area-name">{a.area}</span>
                <span className="oga-admin__area-count">{a.count}</span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      <AppCard
        title={`Recent activity · ${Math.min(analytics.recentActivity.length, 12)} events`}
        noPad
      >
        {analytics.recentActivity.length === 0 ? (
          <div className="oga-admin__pad-empty">
            <EmptyNote>No activity yet</EmptyNote>
          </div>
        ) : (
          <ul className="oga-admin__list">
            {analytics.recentActivity.slice(0, 12).map((ev, i) => (
              <li key={i} className="oga-admin__activity-row">
                <div className="oga-admin__activity-text">
                  <div className="oga-admin__activity-event">
                    {EVENT_LABELS[ev.event] || ev.event}
                  </div>
                  <div className="oga-admin__activity-user">
                    {ev.name || ev.email || "Anonymous"}
                  </div>
                </div>
                {/* AR-313: relativeTime() depends on Date.now() which
                    drifts between SSR (server time) and hydration (client
                    time). suppressHydrationWarning tells React this
                    timestamp is allowed to differ — the client value wins
                    after hydration, which is what we want anyway. */}
                <span
                  className="oga-admin__activity-time"
                  suppressHydrationWarning
                >
                  {relativeTime(ev.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  );
}

/* ============================================================
   Traffic section
   ============================================================ */
function TrafficSection({ traffic }: { traffic: TrafficData }) {
  return (
    <>
      <div className="oga-admin__traffic-eyebrow">
        <span aria-hidden className="oga-admin__traffic-eyebrow-dot" />
        Website traffic
      </div>

      <div className="oga-admin__kpi">
        <StatCell label="Pageviews today" value={traffic.pageviewsToday} />
        <StatCell label="Visitors today" value={traffic.uniqueVisitorsToday} />
        <StatCell label="Visitors (30d)" value={traffic.uniqueVisitors30d} />
        <StatCell
          label="Total pageviews"
          value={traffic.totalPageviews.toLocaleString()}
        />
      </div>

      <div className="oga-admin__2col">
        <AppCard
          title="Pageviews · 30d"
          note={`${traffic.pageviewsPerDay.reduce((s, d) => s + d.count, 0)} total`}
        >
          <BarChart data={traffic.pageviewsPerDay} />
        </AppCard>

        <AppCard title={`Top pages · ${traffic.topPages.length}`} noPad>
          {traffic.topPages.length === 0 ? (
            <div className="oga-admin__pad-empty">
              <EmptyNote>No data yet</EmptyNote>
            </div>
          ) : (
            <ul className="oga-admin__list">
              {traffic.topPages.slice(0, 10).map((p) => (
                <li key={p.path} className="oga-admin__page-row">
                  <code className="oga-admin__page-path">{p.path || "/"}</code>
                  <span className="oga-admin__page-count">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </div>

      <div className="oga-admin__3col">
        <MiniList
          title="Top referrers"
          items={traffic.topReferrers.map((r) => ({
            label: r.referrer || "Direct",
            count: r.count,
          }))}
        />
        <MiniList
          title="Devices"
          items={traffic.deviceBreakdown.map((d) => ({
            label: d.device,
            count: d.count,
          }))}
        />
        <MiniList
          title="Top countries"
          items={traffic.topCountries.map((c) => ({
            label: c.country || "Unknown",
            count: c.count,
          }))}
        />
      </div>
    </>
  );
}

function MiniList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <AppCard title={title} noPad>
      {items.length === 0 ? (
        <div className="oga-admin__pad-empty">
          <EmptyNote>No data yet</EmptyNote>
        </div>
      ) : (
        <ul className="oga-admin__list">
          {items.slice(0, 6).map((item, i) => (
            <li key={item.label + i} className="oga-admin__mini-row">
              <span className="oga-admin__mini-label">{item.label}</span>
              <span className="oga-admin__mini-count">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function formatDay(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
function relativeTime(ts: string): string {
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
