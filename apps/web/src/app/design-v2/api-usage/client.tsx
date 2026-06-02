"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard, GhostCta } from "../_shared/app-shell";
import "./api-usage.css";

/* /api-usage — Brand v3 rewrite (AR-204 close-out 6/15).

   API keys + monthly usage + daily bar chart + last-request time.
   Real endpoint preserved: /api/keys/usage.
   Non-API users redirected to /pricing.

   Per the dashboard proposal (PR #104), this page will gain per-key
   IP allowlist editor + per-key activity feed in a later extension.
   This PR is just the token migration + visual cleanup. */

type DailyData = { day: string; count: number };
type ApiKeyInfo = {
  id: string;
  key_preview: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
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
      if (!res.ok) {
        setError("Failed to load usage data");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Valid: fetch usage on session change. setState calls happen inside
    // fetchUsage after the async fetch resolves, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user) fetchUsage();
  }, [session, fetchUsage]);

  if (status === "loading") {
    return (
      <AppShell title="API usage">
        <div className="oga-api-usage__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/api-usage");
    return null;
  }

  return (
    <AppShell
      title="API usage"
      subtitle="Monthly quota, daily traffic, and your keys."
      actions={<GhostCta href="/docs">Read the docs</GhostCta>}
    >
      <div className="oga-api-usage">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : (
          data && <Content data={data} />
        )}
      </div>
    </AppShell>
  );
}

function Loading() {
  return (
    <div className="oga-api-usage__loading">
      <span aria-hidden className="oga-api-usage__loading-spinner" />
      Loading usage data
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-api-usage__error">{error}</div>;
}

function Content({ data }: { data: UsageData }) {
  const pct = Math.min((data.requestsThisMonth / data.monthlyLimit) * 100, 100);
  const tone: "strong" | "moderate" | "weak" =
    pct >= 90 ? "weak" : pct >= 70 ? "moderate" : "strong";
  const maxDaily = Math.max(...data.dailyData.map((d) => d.count), 1);

  return (
    <>
      {/* Quota headline */}
      <AppCard noPad>
        <div className="oga-api-usage__stats">
          <QuotaBlock
            label="This month"
            value={`${data.requestsThisMonth}`}
            divider={`/ ${data.monthlyLimit}`}
            tone={tone}
            pct={pct}
          />
          <SimpleBlock
            label="All-time requests"
            value={data.totalRequests.toLocaleString()}
          />
          <SimpleBlock label="Last request" value={formatTimestamp(data.lastRequestAt)} />
        </div>
      </AppCard>

      {/* Daily chart */}
      <AppCard title="Last 30 days" note={`Peak · ${maxDaily} req`}>
        <div className="oga-api-usage__chart">
          {data.dailyData.map((d, i) => {
            const h = Math.max(
              (d.count / maxDaily) * 100,
              d.count === 0 ? 2 : 8,
            );
            const isLast = i === data.dailyData.length - 1;
            return (
              <div
                key={d.day}
                className={
                  d.count === 0
                    ? "oga-api-usage__bar oga-api-usage__bar--empty"
                    : "oga-api-usage__bar"
                }
                style={{ height: `${h}%` }}
                title={`${formatDay(d.day)} · ${d.count} request${d.count === 1 ? "" : "s"}`}
              >
                {isLast && d.count > 0 && (
                  <div className="oga-api-usage__bar-tip">{d.count}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="oga-api-usage__chart-axis">
          <span>{formatDay(data.dailyData[0]?.day || "")}</span>
          <span>today</span>
        </div>
      </AppCard>

      {/* Keys */}
      <AppCard title={`API keys · ${data.keys.length}`} noPad>
        {data.keys.length === 0 ? (
          <div className="oga-api-usage__empty">
            No keys yet. Head to the dashboard to create one.
          </div>
        ) : (
          <ul className="oga-api-usage__keys">
            {data.keys.map((k) => (
              <li key={k.id} className="oga-api-usage__key">
                <div className="oga-api-usage__key-left">
                  <code className="oga-api-usage__key-preview">{k.key_preview}</code>
                  <span className="oga-api-usage__key-name">{k.name}</span>
                </div>
                <span className="oga-api-usage__key-meta">
                  {k.last_used_at
                    ? `Used ${formatTimestamp(k.last_used_at)}`
                    : "Never used"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      {/* Quick actions */}
      <div className="oga-api-usage__quick">
        <QuickCard
          href="/docs"
          title="API docs"
          body="Quickstart, auth, request/response, rate limits."
        />
        <QuickCard
          href="/docs/mcp"
          title="MCP server"
          body="Use OneGoodArea inline in Claude Desktop, Cursor, or any MCP client."
        />
        <QuickCard
          href="/pricing"
          title="Upgrade plan"
          body="Move up the tier ladder when you hit the quota."
        />
      </div>
    </>
  );
}

function QuotaBlock({
  label,
  value,
  divider,
  tone,
  pct,
}: {
  label: string;
  value: string;
  divider: string;
  tone: "strong" | "moderate" | "weak";
  pct: number;
}) {
  return (
    <div className="oga-api-usage__block" data-tone={tone}>
      <div className="oga-api-usage__block-head">
        <span className="oga-api-usage__block-label">{label}</span>
        <span className="oga-api-usage__block-pct">{Math.round(pct)}%</span>
      </div>
      <div className="oga-api-usage__block-value-row">
        <span className="oga-api-usage__block-value">{value}</span>
        <span className="oga-api-usage__block-divider">{divider}</span>
      </div>
      <div className="oga-api-usage__block-bar">
        <div
          className="oga-api-usage__block-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SimpleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="oga-api-usage__block oga-api-usage__block--simple">
      <span className="oga-api-usage__block-label">{label}</span>
      <span className="oga-api-usage__block-simple-value">{value}</span>
    </div>
  );
}

function QuickCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="oga-api-usage__quick-card">
      <div className="oga-api-usage__quick-head">
        <span className="oga-api-usage__quick-title">{title}</span>
        <span aria-hidden className="oga-api-usage__quick-arrow">→</span>
      </div>
      <div className="oga-api-usage__quick-body">{body}</div>
    </Link>
  );
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(day: string): string {
  if (!day) return "";
  return new Date(day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
