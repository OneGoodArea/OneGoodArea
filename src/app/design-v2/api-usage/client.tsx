"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Styles } from "../_shared/styles";
import { AppShell, AppCard, PrimaryCta, GhostCta } from "../_shared/app-shell";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /api-usage
   API keys + monthly usage + daily bar chart + last-request time.
   Real endpoint preserved: /api/keys/usage.
   Non-API users redirected to /pricing.
   ═══════════════════════════════════════════════════════════════ */

type DailyData = { day: string; count: number };
type ApiKeyInfo = {
  id: string; key_preview: string; name: string;
  created_at: string; last_used_at: string | null;
};
type UsageData = {
  totalRequests: number;
  requestsThisMonth: number;
  monthlyLimit: number;
  dailyData: DailyData[];
  lastRequestAt: string | null;
  keys: ApiKeyInfo[];
};

export default function ApiUsageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/keys/usage");
      if (res.status === 403) {
        router.push("/pricing");
        return;
      }
      if (!res.ok) { setError("Failed to load usage data"); return; }
      const json = await res.json();
      setData(json);
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (session?.user) fetchUsage();
  }, [session, fetchUsage]);

  if (status === "loading") return <><Styles /><AppShell title="API usage"><div style={{ padding: 40 }} /></AppShell></>;
  if (!session?.user) { router.push("/sign-in?callbackUrl=/api-usage"); return null; }

  return (
    <>
      <Styles />
      <AppShell
        title="API usage"
        subtitle="Monthly quota, daily traffic, and your keys."
        actions={
          <GhostCta href="/docs">Read the docs</GhostCta>
        }
      >
        <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
          {loading ? <Loading /> : error ? <ErrorBox error={error} /> : data && <Content data={data} />}
        </div>
      </AppShell>
    </>
  );
}

function Loading() {
  return (
    <div style={{
      padding: "60px 0", textAlign: "center",
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: "var(--text-3)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <span aria-hidden style={{
        width: 14, height: 14, borderRadius: "50%",
        border: "1.6px solid currentColor", borderTopColor: "transparent",
        display: "inline-block", animation: "aiq-spin 800ms linear infinite",
      }} />
      Loading usage data
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 12,
      color: "#A01B00", background: "rgba(239,68,68,0.06)",
      border: "1px solid rgba(239,68,68,0.25)",
      padding: "14px 18px", borderRadius: 4,
    }}>{error}</div>
  );
}

function Content({ data }: { data: UsageData }) {
  const pct = Math.min((data.requestsThisMonth / data.monthlyLimit) * 100, 100);
  const rag = pct >= 90 ? "#A01B00" : pct >= 70 ? "#D49900" : "var(--ink)";
  const ragBg = pct >= 90 ? "#FFE8E2" : pct >= 70 ? "#FFF4D1" : "var(--signal-dim)";
  const maxDaily = Math.max(...data.dailyData.map((d) => d.count), 1);

  return (
    <>
      {/* Quota headline */}
      <AppCard noPad>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          borderRadius: 4, overflow: "hidden",
        }} className="aiq-usage-stats">
          <QuotaBlock
            label="This month"
            value={`${data.requestsThisMonth}`}
            divider={`/ ${data.monthlyLimit}`}
            tone={rag}
            bg={ragBg}
            pct={pct}
          />
          <SimpleBlock label="All-time requests" value={data.totalRequests.toLocaleString()} />
          <SimpleBlock label="Last request" value={formatTimestamp(data.lastRequestAt)} />
        </div>
      </AppCard>

      {/* Daily chart */}
      <AppCard title="Last 30 days" note={`Peak · ${maxDaily} req`}>
        <div className="aiq-usage-chart" style={{
          display: "flex", alignItems: "flex-end", gap: 4,
          height: 160, paddingTop: 8,
        }}>
          {data.dailyData.map((d, i) => {
            const h = Math.max((d.count / maxDaily) * 100, d.count === 0 ? 2 : 8);
            return (
              <div key={d.day} style={{
                flex: 1, position: "relative",
                height: `${h}%`,
                background: d.count === 0 ? "var(--border-dim)" : "var(--signal)",
                border: d.count === 0 ? "1px dashed var(--border)" : "1px solid var(--ink-deep)",
                borderRadius: "2px 2px 0 0",
                transition: "background 140ms ease",
                minWidth: 4,
                display: "flex", alignItems: "flex-start", justifyContent: "center",
                overflow: "visible",
              }}
                title={`${formatDay(d.day)} · ${d.count} request${d.count === 1 ? "" : "s"}`}
              >
                {i === data.dailyData.length - 1 && d.count > 0 && (
                  <div style={{
                    position: "absolute", top: -22, left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
                    color: "var(--ink-deep)",
                    whiteSpace: "nowrap",
                  }}>{d.count}</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8,
          fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
          letterSpacing: "0.14em",
          color: "var(--text-3)",
        }}>
          <span>{formatDay(data.dailyData[0]?.day || "")}</span>
          <span>today</span>
        </div>
      </AppCard>

      {/* Keys */}
      <AppCard title={`API keys · ${data.keys.length}`} noPad>
        {data.keys.length === 0 ? (
          <div style={{
            padding: "26px 22px", textAlign: "center",
            fontFamily: "var(--sans)", fontSize: 14,
            color: "var(--text-3)",
          }}>
            No keys yet. Head to the dashboard to create one.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {data.keys.map((k, i) => (
              <li key={k.id} style={{
                padding: "14px 22px",
                borderBottom: i < data.keys.length - 1 ? "1px solid var(--border-dim)" : "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 14, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <code style={{
                    fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                    color: "var(--ink-deep)",
                    background: "var(--bg-off)",
                    border: "1px solid var(--border)",
                    padding: "3px 8px", borderRadius: 2,
                  }}>{k.key_preview}</code>
                  <span style={{
                    fontFamily: "var(--display)", fontSize: 14, fontWeight: 500,
                    color: "var(--ink-deep)", letterSpacing: "-0.005em",
                  }}>{k.name}</span>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.14em", color: "var(--text-3)",
                }}>
                  {k.last_used_at ? `Used ${formatTimestamp(k.last_used_at)}` : "Never used"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      {/* Quick actions */}
      <div className="aiq-usage-quick" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
      }}>
        <QuickCard href="/docs" title="API docs" body="Quickstart, auth, request/response, rate limits." />
        <QuickCard href="/docs#widget" title="Widget docs" body="Drop a script tag, render a score card. No API key on the client." />
        <QuickCard href="/pricing" title="Upgrade plan" body="Growth for 1,500 reports/mo. Enterprise for more." />
      </div>
    </>
  );
}

function QuotaBlock({ label, value, divider, tone, bg, pct }: {
  label: string; value: string; divider: string;
  tone: string; bg: string; pct: number;
}) {
  return (
    <div style={{
      padding: "24px 24px",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>{label}</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
          letterSpacing: "0.08em",
          color: tone, background: bg,
          padding: "2px 8px", borderRadius: 2,
        }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: "var(--display)", fontSize: 34, fontWeight: 500,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          lineHeight: 1,
        }}>{value}</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 13,
          color: "var(--text-3)",
        }}>{divider}</span>
      </div>
      <div style={{
        height: 4, width: "100%",
        background: "var(--border-dim)",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: tone,
          transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

function SimpleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "24px 24px",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
        letterSpacing: "-0.014em", color: "var(--ink-deep)",
        lineHeight: 1.1,
      }}>{value}</span>
    </div>
  );
}

function QuickCard({ href, title, body }: { href: string; title: string; body: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        border: `1px solid ${hover ? "var(--ink)" : "var(--border)"}`,
        background: hover ? "var(--bg-off)" : "var(--bg)",
        padding: "18px 20px",
        textDecoration: "none",
        transition: "border-color 140ms ease, background 140ms ease",
        borderRadius: 4,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, marginBottom: 8,
      }}>
        <span style={{
          fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
          letterSpacing: "-0.012em", color: "var(--ink-deep)",
        }}>{title}</span>
        <span aria-hidden style={{
          fontFamily: "var(--sans)", fontSize: 14,
          color: hover ? "var(--ink-deep)" : "var(--text-3)",
          transform: hover ? "translateX(2px)" : "translateX(0)",
          transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), color 140ms",
        }}>→</span>
      </div>
      <div style={{
        fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
        lineHeight: 1.5, color: "var(--text-2)",
      }}>{body}</div>
    </Link>
  );
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function formatDay(day: string): string {
  if (!day) return "";
  return new Date(day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
