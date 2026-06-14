"use client";

import type { ReactNode } from "react";
import { AppShell, AppCard, StatCell } from "../_shared/app-shell";
import "./admin.css";

/* /admin — Brand v3 rewrite (AR-204 close-out 9/15).

   Email-gated analytics dashboard (Pedro only). Wraps the real
   getAnalytics / getTrafficAnalytics data. Internal ops surface
   — not in the public dashboard restructure scope. Token migration
   + visual cleanup only.

   PLAN_PRICES still references legacy v1 plan names (starter / pro /
   developer / business / growth) because pre-April-2026 subscribers
   can still be on them. Keep until those subscribers age out. */

type Analytics = {
  totalUsers: number;
  totalReports: number;
  reportsThisMonth: number;
  activeUsersThisMonth: number;
  reportsPerDay: { day: string; count: number }[];
  topAreas: { area: string; count: number }[];
  intentDistribution: { intent: string; count: number }[];
  recentActivity: {
    event: string;
    user_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    name: string | null;
    email: string | null;
  }[];
  userGrowth: { day: string; count: number }[];
  usersWithReports: number;
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

export type { Analytics, TrafficData };

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

export default function AdminClient({
  analytics,
  traffic,
}: {
  analytics: Analytics | null;
  traffic: TrafficData | null;
}) {
  if (!analytics) {
    return (
      <AppShell title="Admin" subtitle="Live platform analytics · Pedro only">
        <div className="oga-admin">
          <div className="oga-admin__empty">No analytics data available</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" subtitle="Live platform analytics · Pedro only">
      <div className="oga-admin">
        <KpiRow analytics={analytics} />
        <RevenueAndFunnel analytics={analytics} />
        <ChartsRow analytics={analytics} />
        <ActivityAndAreas analytics={analytics} />
        {traffic && <TrafficSection traffic={traffic} />}
      </div>
    </AppShell>
  );
}

/* ============================================================
   KPI row
   ============================================================ */
function KpiRow({ analytics }: { analytics: Analytics }) {
  return (
    <div className="oga-admin__kpi">
      <StatCell label="Total users" value={analytics.totalUsers} />
      <StatCell label="Total reports" value={analytics.totalReports} />
      <StatCell
        label="Reports this month"
        value={analytics.reportsThisMonth}
        accent="strong"
      />
      <StatCell label="Active (30d)" value={analytics.activeUsersThisMonth} />
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
        usersWithReports={analytics.usersWithReports}
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
  usersWithReports,
  paidUsers,
}: {
  totalUsers: number;
  usersWithReports: number;
  paidUsers: number;
}) {
  const maxVal = Math.max(totalUsers, 1);
  const steps: { label: string; value: number; tone: "ink" | "amber" }[] = [
    { label: "Signed up", value: totalUsers, tone: "ink" },
    { label: "Generated report", value: usersWithReports, tone: "ink" },
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
   Charts row (2-col): reports/day + intent distribution
   ============================================================ */
function ChartsRow({ analytics }: { analytics: Analytics }) {
  const reportsTotal = analytics.reportsPerDay.reduce(
    (s, d) => s + d.count,
    0,
  );
  return (
    <div className="oga-admin__2col">
      <AppCard title="Reports / day · 30d" note={`${reportsTotal} total`}>
        <BarChart data={analytics.reportsPerDay} />
      </AppCard>
      <AppCard title="Intent distribution" note="All reports">
        <IntentBars data={analytics.intentDistribution} />
      </AppCard>
    </div>
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

function IntentBars({
  data,
}: {
  data: { intent: string; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyNote>No data yet</EmptyNote>;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ul className="oga-admin__intents">
      {data.map((d) => {
        const widthPct = Math.max((d.count / max) * 100, 4);
        const pctOfTotal = Math.round((d.count / total) * 100);
        return (
          <li key={d.intent} className="oga-admin__intent-row">
            <span className="oga-admin__intent-label">{d.intent}</span>
            <div className="oga-admin__intent-track">
              <div
                className="oga-admin__intent-fill"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="oga-admin__intent-count">{d.count}</span>
            <span className="oga-admin__intent-pct">{pctOfTotal}%</span>
          </li>
        );
      })}
    </ul>
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
                <span className="oga-admin__activity-time">
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
