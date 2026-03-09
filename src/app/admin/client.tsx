"use client";

import Link from "next/link";
import { UserButton } from "@/components/user-button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Users, FileText, Activity, TrendingUp } from "lucide-react";

interface Analytics {
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
}

const INTENT_COLORS: Record<string, string> = {
  moving: "var(--neon-green)",
  business: "var(--accent)",
  investing: "var(--neon-amber)",
  research: "var(--text-secondary)",
};

const EVENT_LABELS: Record<string, string> = {
  "report.generated": "Generated report",
  "api.report.generated": "API report generated",
  "auth.signin": "Signed in",
  "plan.upgrade.started": "Started upgrade",
  "plan.upgraded": "Plan upgraded",
  "password.changed": "Changed password",
};

/* ── Stat Card ── */
function StatCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="p-4" style={{ background: "var(--bg-elevated)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} style={{ color: "var(--text-tertiary)" }} />
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
      </div>
      <div className="text-[24px] font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Bar Chart (pure CSS) ── */
function BarChart({ data, height = 120 }: { data: { day: string; count: number }[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>No data yet</span>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.map((d) => {
        const barH = Math.max((d.count / max) * height, 2);
        const date = new Date(d.day);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;

        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full transition-all duration-300 hover:brightness-125"
              style={{
                height: barH,
                background: d.count > 0 ? "var(--neon-green)" : "var(--border)",
                opacity: d.count > 0 ? 0.7 : 0.3,
              }}
            />
            {/* Tooltip */}
            <div
              className="absolute bottom-full mb-1 hidden group-hover:block px-2 py-1 whitespace-nowrap z-10"
              style={{ background: "var(--bg-active)", border: "1px solid var(--border)" }}
            >
              <span className="text-[10px] font-mono" style={{ color: "var(--text-primary)" }}>
                {label}: {d.count} report{d.count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut Chart (pure SVG) ── */
function DonutChart({ data }: { data: { intent: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>No data yet</span>
      </div>
    );
  }

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const strokeW = 16;

  let currentAngle = -90;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size}>
        {data.map((d) => {
          const pct = d.count / total;
          const angle = pct * 360;
          const circumference = 2 * Math.PI * r;
          const dashLen = (pct * circumference);
          const dashOffset = 0;
          const rotation = currentAngle;
          currentAngle += angle;

          return (
            <circle
              key={d.intent}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={INTENT_COLORS[d.intent] || "var(--text-tertiary)"}
              strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              opacity={0.8}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontFamily="var(--font-mono)" fontWeight="bold">
          {total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">
          total
        </text>
      </svg>

      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.intent} className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ background: INTENT_COLORS[d.intent] || "var(--text-tertiary)" }} />
            <span className="text-[11px] font-mono capitalize" style={{ color: "var(--text-secondary)" }}>
              {d.intent}
            </span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {d.count}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              ({Math.round((d.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Admin Dashboard ── */
export function AdminClient({ analytics }: { analytics: Analytics }) {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }]}>
        <Link
          href="/dashboard"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--bg-active)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Dashboard
        </Link>
        <UserButton />
      </Navbar>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-6" style={{ background: "var(--border)" }}>
          <StatCard label="Total Users" value={analytics.totalUsers} icon={Users} />
          <StatCard label="Total Reports" value={analytics.totalReports} icon={FileText} />
          <StatCard label="Reports This Month" value={analytics.reportsThisMonth} icon={TrendingUp} />
          <StatCard label="Active Users (Month)" value={analytics.activeUsersThisMonth} icon={Activity} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px mb-6" style={{ background: "var(--border)" }}>
          {/* Reports Per Day */}
          <div className="p-5" style={{ background: "var(--bg-elevated)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Reports / Day (30d)
              </span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {analytics.reportsPerDay.reduce((s, d) => s + d.count, 0)} total
              </span>
            </div>
            <BarChart data={analytics.reportsPerDay} />
          </div>

          {/* Intent Distribution */}
          <div className="p-5" style={{ background: "var(--bg-elevated)" }}>
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Intent Distribution
              </span>
            </div>
            <DonutChart data={analytics.intentDistribution} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
          {/* Top Areas */}
          <div style={{ background: "var(--bg-elevated)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Top Areas Searched
              </span>
            </div>
            {analytics.topAreas.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>No reports yet</span>
              </div>
            ) : (
              <div>
                {analytics.topAreas.map((area, i) => {
                  const maxCount = analytics.topAreas[0].count;
                  const pct = (area.count / maxCount) * 100;

                  return (
                    <div
                      key={area.area}
                      className="px-5 py-2.5 flex items-center gap-3 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="text-[10px] font-mono w-5 text-right shrink-0" style={{ color: "var(--text-tertiary)" }}>
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                        {area.area}
                      </span>
                      <div className="w-24 h-1.5 shrink-0" style={{ background: "var(--border)" }}>
                        <div className="h-full" style={{ width: `${pct}%`, background: "var(--neon-green)", opacity: 0.6 }} />
                      </div>
                      <span className="text-[11px] font-mono font-semibold w-6 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
                        {area.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ background: "var(--bg-elevated)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Recent Activity
              </span>
            </div>
            {analytics.recentActivity.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>No activity yet</span>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {analytics.recentActivity.map((event, i) => {
                  const label = EVENT_LABELS[event.event] || event.event;
                  const meta = event.metadata || {};
                  const area = meta.area as string | undefined;
                  const intent = meta.intent as string | undefined;
                  const provider = meta.provider as string | undefined;
                  const plan = meta.plan as string | undefined;
                  const timeAgo = getTimeAgo(event.created_at);

                  return (
                    <div
                      key={i}
                      className="px-5 py-2.5 border-b last:border-b-0 flex items-start gap-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          background: event.event.includes("report") ? "var(--neon-green)"
                            : event.event.includes("auth") ? "var(--accent)"
                            : event.event.includes("plan") ? "var(--neon-amber)"
                            : "var(--text-tertiary)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {event.name || event.email || "Unknown"}
                          </span>
                          {" "}{label.toLowerCase()}
                          {area && (
                            <span style={{ color: "var(--text-primary)" }}> · {area}</span>
                          )}
                          {intent && (
                            <span className="ml-1 text-[9px] font-mono px-1 py-px" style={{ color: INTENT_COLORS[intent] || "var(--text-tertiary)", background: "var(--bg)" }}>
                              {intent}
                            </span>
                          )}
                          {provider && (
                            <span className="ml-1 text-[9px] font-mono px-1 py-px capitalize" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>
                              {provider}
                            </span>
                          )}
                          {plan && (
                            <span className="ml-1 text-[9px] font-mono px-1 py-px capitalize" style={{ color: "var(--neon-amber)", background: "var(--neon-amber-dim)" }}>
                              {plan}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {timeAgo}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
