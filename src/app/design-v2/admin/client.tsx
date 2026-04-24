"use client";

import React from "react";
import { Styles } from "../_shared/styles";
import { AppShell, AppCard, StatCell } from "../_shared/app-shell";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /admin
   Email-gated analytics dashboard (Pedro only).
   Wraps the real getAnalytics / getTrafficAnalytics data.
   ═══════════════════════════════════════════════════════════════ */

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

const PLAN_PRICES: Record<string, number> = {
  starter: 29, pro: 79, developer: 49, business: 249, growth: 499,
};

const EVENT_LABELS: Record<string, string> = {
  "report.generated":        "Generated report",
  "api.report.generated":    "API report generated",
  "auth.signin":             "Signed in",
  "auth.signup":             "Signed up",
  "plan.upgrade.started":    "Started upgrade",
  "plan.upgraded":           "Plan upgraded",
  "password.changed":        "Changed password",
};

export default function AdminClient({ analytics, traffic }: {
  analytics: Analytics; traffic: TrafficData | null;
}) {
  return (
    <>
      <Styles />
      <AppShell title="Admin" subtitle="Live platform analytics · Pedro only">
        <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
          <KpiRow analytics={analytics} />
          <RevenueAndFunnel analytics={analytics} />
          <ChartsRow analytics={analytics} />
          <ActivityAndAreas analytics={analytics} />
          {traffic && <TrafficSection traffic={traffic} />}
        </div>
      </AppShell>
    </>
  );
}

/* ─────── KPI row ─────── */

function KpiRow({ analytics }: { analytics: Analytics }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 0,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      borderRadius: 4, overflow: "hidden",
    }} className="aiq-admin-kpi">
      <StatCell label="Total users"        value={analytics.totalUsers} />
      <StatCell label="Total reports"      value={analytics.totalReports} />
      <StatCell label="Reports this month" value={analytics.reportsThisMonth} accent="strong" />
      <StatCell label="Active (30d)"       value={analytics.activeUsersThisMonth} />
    </div>
  );
}

/* ─────── Revenue + conversion funnel ─────── */

function RevenueAndFunnel({ analytics }: { analytics: Analytics }) {
  return (
    <div className="aiq-admin-2col" style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 22,
    }}>
      <RevenuePanel subscriptionsByPlan={analytics.subscriptionsByPlan} mrr={analytics.mrr} />
      <ConversionPanel
        totalUsers={analytics.totalUsers}
        usersWithReports={analytics.usersWithReports}
        paidUsers={analytics.paidUsers}
      />
    </div>
  );
}

function RevenuePanel({ subscriptionsByPlan, mrr }: {
  subscriptionsByPlan: { plan: string; count: number }[]; mrr: number;
}) {
  const totalSubs = subscriptionsByPlan.reduce((s, sub) => s + sub.count, 0);
  return (
    <AppCard title="Revenue" note={`${totalSubs} active subscription${totalSubs !== 1 ? "s" : ""}`}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <span style={{
          fontFamily: "var(--display)", fontSize: 42, fontWeight: 500,
          letterSpacing: "-0.022em", color: "var(--ink-deep)",
          lineHeight: 1,
        }}>£{mrr.toLocaleString()}</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>MRR</span>
      </div>

      {totalSubs === 0 ? (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.14em", color: "var(--text-3)",
          padding: "14px 0",
        }}>No active subscriptions yet</div>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {["starter", "pro", "developer", "business", "growth"].map((plan) => {
              const row = subscriptionsByPlan.find((s) => s.plan === plan);
              const count = row?.count || 0;
              const revenue = count * (PLAN_PRICES[plan] || 0);
              const isApi = ["developer", "business", "growth"].includes(plan);
              return (
                <li key={plan} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 12, alignItems: "center",
                  padding: "6px 0",
                  opacity: count === 0 ? 0.4 : 1,
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden style={{
                      width: 6, height: 6, borderRadius: 6,
                      background: isApi ? "var(--ink)" : "var(--signal)",
                    }} />
                    <span style={{
                      fontFamily: "var(--display)", fontSize: 14, fontWeight: 500,
                      letterSpacing: "-0.005em",
                      color: "var(--ink-deep)", textTransform: "capitalize",
                    }}>{plan}</span>
                  </span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600,
                    color: "var(--ink-deep)",
                  }}>{count}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                    color: "var(--text-3)", width: 70, textAlign: "right",
                  }}>£{revenue}/mo</span>
                </li>
              );
            })}
          </ul>

          <div style={{
            marginTop: 16,
            height: 6, width: "100%",
            background: "var(--bg-off)",
            borderRadius: 2, overflow: "hidden",
            display: "flex",
          }}>
            {subscriptionsByPlan.filter((s) => s.count > 0).map((s) => (
              <div key={s.plan} style={{
                height: "100%",
                width: `${(s.count / totalSubs) * 100}%`,
                background: ["developer", "business", "growth"].includes(s.plan) ? "var(--ink)" : "var(--signal)",
              }} />
            ))}
          </div>
        </>
      )}
    </AppCard>
  );
}

function ConversionPanel({ totalUsers, usersWithReports, paidUsers }: {
  totalUsers: number; usersWithReports: number; paidUsers: number;
}) {
  const maxVal = Math.max(totalUsers, 1);
  const steps = [
    { label: "Signed up",         value: totalUsers,         accent: "var(--signal)",    fg: "var(--ink-deep)" },
    { label: "Generated report",  value: usersWithReports,   accent: "var(--ink)",       fg: "var(--ink-deep)" },
    { label: "Paid plan",         value: paidUsers,          accent: "#D49900",           fg: "#6E5300"           },
  ];

  return (
    <AppCard title="Conversion funnel">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {steps.map((step, i) => {
          const widthPct = Math.max((step.value / maxVal) * 100, 4);
          const conversion = i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100)
            : null;
          return (
            <li key={step.label}>
              {conversion !== null && (
                <div style={{
                  paddingLeft: 4, marginBottom: 4,
                  fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                  letterSpacing: "0.14em",
                  color: "var(--text-3)",
                }}>
                  ↳ {conversion}% converted
                </div>
              )}
              <div style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: 12, alignItems: "center",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--text-2)", textAlign: "right",
                }}>{step.label}</span>
                <div style={{
                  height: 28, position: "relative",
                  background: "var(--bg-off)",
                  borderRadius: 2, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${widthPct}%`,
                    background: step.accent,
                    opacity: 0.22,
                    transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
                  }} />
                  <span style={{
                    position: "absolute", left: 10, top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: "var(--display)", fontSize: 16, fontWeight: 600,
                    color: step.fg, letterSpacing: "-0.012em",
                  }}>{step.value}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </AppCard>
  );
}

/* ─────── Charts row ─────── */

function ChartsRow({ analytics }: { analytics: Analytics }) {
  const reportsTotal = analytics.reportsPerDay.reduce((s, d) => s + d.count, 0);
  return (
    <div className="aiq-admin-2col" style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 22,
    }}>
      <AppCard title="Reports / day · 30d" note={`${reportsTotal} total`}>
        <BarChart data={analytics.reportsPerDay} />
      </AppCard>

      <AppCard title="Intent distribution" note="All reports">
        <IntentBars data={analytics.intentDistribution} />
      </AppCard>
    </div>
  );
}

function BarChart({ data, height = 140 }: { data: { day: string; count: number }[]; height?: number }) {
  if (!data || data.length === 0) {
    return <EmptyNote>No data yet</EmptyNote>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <>
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 3,
        height, paddingTop: 4,
      }}>
        {data.map((d) => {
          const h = Math.max((d.count / max) * 100, d.count === 0 ? 2 : 6);
          return (
            <div key={d.day} style={{
              flex: 1, height: `${h}%`,
              background: d.count === 0 ? "var(--border-dim)" : "var(--signal)",
              border: d.count === 0 ? "1px dashed var(--border)" : "1px solid var(--ink-deep)",
              borderRadius: "2px 2px 0 0",
              minWidth: 4,
            }}
              title={`${formatDay(d.day)} · ${d.count} report${d.count !== 1 ? "s" : ""}`}
            />
          );
        })}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 6,
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.14em", color: "var(--text-3)",
      }}>
        <span>{formatDay(data[0]?.day || "")}</span>
        <span>today</span>
      </div>
    </>
  );
}

function IntentBars({ data }: { data: { intent: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyNote>No data yet</EmptyNote>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const tints: Record<string, string> = {
    moving: "var(--signal)", business: "var(--ink)", investing: "#D49900", research: "var(--text-2)",
  };

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d) => {
        const widthPct = Math.max((d.count / max) * 100, 4);
        const pctOfTotal = Math.round((d.count / total) * 100);
        return (
          <li key={d.intent} className="aiq-admin-bar-row" style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 50px 40px",
            gap: 12, alignItems: "center",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.12em", textTransform: "capitalize",
              color: "var(--ink-deep)", textAlign: "right",
            }}>{d.intent}</span>
            <div style={{
              height: 22, position: "relative",
              background: "var(--bg-off)",
              borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${widthPct}%`,
                background: tints[d.intent] || "var(--text-3)",
                opacity: 0.28,
                transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
            <span style={{
              fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
              color: "var(--ink-deep)", letterSpacing: "-0.008em",
              textAlign: "right",
            }}>{d.count}</span>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              color: "var(--text-3)", letterSpacing: "0.04em",
            }}>{pctOfTotal}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "20px 0", textAlign: "center",
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
      letterSpacing: "0.14em",
      color: "var(--text-3)",
    }}>{children}</div>
  );
}

/* ─────── Activity + top areas ─────── */

function ActivityAndAreas({ analytics }: { analytics: Analytics }) {
  return (
    <div className="aiq-admin-2col" style={{
      display: "grid",
      gridTemplateColumns: "1fr 1.2fr",
      gap: 22,
    }}>
      <AppCard title={`Top areas · ${analytics.topAreas.length}`} noPad>
        {analytics.topAreas.length === 0 ? (
          <div style={{ padding: 20 }}><EmptyNote>No reports yet</EmptyNote></div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {analytics.topAreas.slice(0, 10).map((a, i) => (
              <li key={a.area + i} style={{
                padding: "12px 22px",
                borderBottom: i < Math.min(analytics.topAreas.length, 10) - 1 ? "1px solid var(--border-dim)" : "none",
                display: "grid",
                gridTemplateColumns: "28px 1fr auto",
                gap: 12, alignItems: "center",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.18em",
                  color: "var(--text-3)",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 14.5, fontWeight: 500,
                  letterSpacing: "-0.005em", color: "var(--ink-deep)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{a.area}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                  color: "var(--ink-deep)",
                  background: "var(--signal-dim)",
                  padding: "2px 8px", borderRadius: 2,
                }}>{a.count}</span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      <AppCard title={`Recent activity · ${Math.min(analytics.recentActivity.length, 12)} events`} noPad>
        {analytics.recentActivity.length === 0 ? (
          <div style={{ padding: 20 }}><EmptyNote>No activity yet</EmptyNote></div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {analytics.recentActivity.slice(0, 12).map((ev, i) => (
              <li key={i} style={{
                padding: "11px 22px",
                borderBottom: i < Math.min(analytics.recentActivity.length, 12) - 1 ? "1px solid var(--border-dim)" : "none",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12, alignItems: "center",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                    letterSpacing: "0.12em", color: "var(--ink)",
                    marginBottom: 3,
                  }}>{EVENT_LABELS[ev.event] || ev.event}</div>
                  <div style={{
                    fontFamily: "var(--sans)", fontSize: 13, fontWeight: 400,
                    color: "var(--text-2)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {ev.name || ev.email || "Anonymous"}
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.06em",
                  color: "var(--text-3)",
                }}>{relativeTime(ev.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  );
}

/* ─────── Traffic ─────── */

function TrafficSection({ traffic }: { traffic: TrafficData }) {
  return (
    <>
      <div style={{
        marginTop: 8,
        display: "inline-flex", alignItems: "center", gap: 10,
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--ink-deep)",
      }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)" }} />
        Website traffic
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        borderRadius: 4, overflow: "hidden",
      }} className="aiq-admin-kpi">
        <StatCell label="Pageviews today"  value={traffic.pageviewsToday} />
        <StatCell label="Visitors today"   value={traffic.uniqueVisitorsToday} />
        <StatCell label="Visitors (30d)"   value={traffic.uniqueVisitors30d} />
        <StatCell label="Total pageviews"  value={traffic.totalPageviews.toLocaleString()} />
      </div>

      <div className="aiq-admin-2col" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 22,
      }}>
        <AppCard title="Pageviews · 30d" note={`${traffic.pageviewsPerDay.reduce((s, d) => s + d.count, 0)} total`}>
          <BarChart data={traffic.pageviewsPerDay} />
        </AppCard>

        <AppCard title={`Top pages · ${traffic.topPages.length}`} noPad>
          {traffic.topPages.length === 0 ? (
            <div style={{ padding: 20 }}><EmptyNote>No data yet</EmptyNote></div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {traffic.topPages.slice(0, 10).map((p, i) => (
                <li key={p.path} style={{
                  padding: "10px 22px",
                  borderBottom: i < Math.min(traffic.topPages.length, 10) - 1 ? "1px solid var(--border-dim)" : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10, alignItems: "center",
                }}>
                  <code style={{
                    fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                    color: "var(--ink-deep)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.path || "/"}</code>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                    color: "var(--ink)",
                  }}>{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </div>

      <div className="aiq-admin-3col" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 22,
      }}>
        <MiniList title="Top referrers" items={traffic.topReferrers.map((r) => ({ label: r.referrer || "Direct", count: r.count }))} />
        <MiniList title="Devices"       items={traffic.deviceBreakdown.map((d) => ({ label: d.device, count: d.count }))} />
        <MiniList title="Top countries" items={traffic.topCountries.map((c) => ({ label: c.country || "Unknown", count: c.count }))} />
      </div>
    </>
  );
}

function MiniList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <AppCard title={title} noPad>
      {items.length === 0 ? (
        <div style={{ padding: 20 }}><EmptyNote>No data yet</EmptyNote></div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.slice(0, 6).map((item, i) => (
            <li key={item.label + i} style={{
              padding: "10px 22px",
              borderBottom: i < Math.min(items.length, 6) - 1 ? "1px solid var(--border-dim)" : "none",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10, alignItems: "center",
            }}>
              <span style={{
                fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                letterSpacing: "-0.005em",
                color: "var(--ink-deep)", textTransform: "capitalize",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{item.label}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                color: "var(--ink-deep)",
              }}>{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}

/* ─────── Helpers ─────── */

function formatDay(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
