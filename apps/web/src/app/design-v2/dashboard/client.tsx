"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppShell, AppCard, StatCell, PrimaryCta, GhostCta, appRag,
} from "../_shared/app-shell";
import { McpAddOnSection, type McpStatus } from "../_shared/mcp-addon-section";
import { intentLabel } from "@/lib/intents";
import "./dashboard.css";

/* /dashboard — Brand v3 rewrite (AR-204 close-out 14/15).

   Visual altitude lift only. IA unchanged (structural restructure
   around the 4-product API is the next epic — see
   memory/project_dashboard_redesign_pending.md + task #172).
   Same shell + same data + same real endpoints. */

type Report = { id: string; area: string; intent: string; score: number; created_at: string };
type SavedArea = { id: string; postcode: string; label: string; intent: string | null; created_at: string };
type ApiKey = { id: string; key_preview: string; name: string; created_at: string; last_used_at: string | null };

type Props = {
  reports: Report[];
  plan: string;
  planName: string;
  used: number;
  limit: number;
  savedAreas: SavedArea[];
  mcp?: McpStatus;
};

export default function DashboardClient(props: Props) {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Reports, monitored postcodes, and usage."
      actions={<PrimaryCta href="/report">New report</PrimaryCta>}
    >
      <Body {...props} />
    </AppShell>
  );
}

function Body({
  reports: initialReports,
  plan,
  planName,
  used,
  limit,
  savedAreas: initialSaved,
  mcp,
}: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>(initialSaved);

  // V1 grandfathered (developer/business/growth) + V2 active (sandbox/starter_v2/build/scale/growth_v2/enterprise)
  // all grant API access. Keep in sync with API_PLANS in src/lib/stripe.ts.
  const apiPlans = ["developer", "business", "growth", "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
  const isApiPlan = apiPlans.includes(plan);

  const stats = useMemo(() => {
    if (reports.length === 0) return null;
    const avg = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
    const best = reports.reduce((b, r) => (r.score > b.score ? r : b), reports[0]);
    return { avg, best };
  }, [reports]);

  async function deleteReport(id: string) {
    const res = await fetch(`/api/report/${id}`, { method: "DELETE" });
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function removeWatchlist(id: string) {
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (res.ok) setSavedAreas((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="oga-dash">
      <UsageStrip
        plan={plan}
        planName={planName}
        isApiPlan={isApiPlan}
        used={used}
        limit={limit}
      />

      {stats && (
        <div className="oga-dash__stats">
          <StatCell label="Total reports" value={reports.length} />
          <StatCell
            label="Average score"
            value={stats.avg}
            accent={appRag(stats.avg).tone}
          />
          <StatCell
            label="Top-scoring postcode"
            value={<span className="oga-dash__stat-top">{stats.best.area}</span>}
          />
          <StatCell
            label="Top score"
            value={stats.best.score}
            accent={appRag(stats.best.score).tone}
          />
        </div>
      )}

      {savedAreas.length > 0 && (
        <Watchlist items={savedAreas} onRemove={removeWatchlist} />
      )}

      {isApiPlan && <ApiKeysSection />}
      {isApiPlan && mcp && <McpAddOnSection mcp={mcp} />}

      <ReportsTable reports={reports} onDelete={deleteReport} />
    </div>
  );
}

/* ============================================================
   Usage strip — DARK 2-col card (Plan | Usage)
   ============================================================ */
function UsageStrip({
  plan,
  planName,
  isApiPlan,
  used,
  limit,
}: {
  plan: string;
  planName: string;
  isApiPlan: boolean;
  used: number;
  limit: number;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const tone: "strong" | "moderate" | "weak" =
    pct >= 90 ? "weak" : pct >= 70 ? "moderate" : "strong";

  return (
    <div className="oga-dash__usage" data-oga-surface="dark">
      {/* Plan */}
      <div className="oga-dash__usage-cell">
        <div className="oga-dash__usage-eyebrow">
          <span aria-hidden className="oga-dash__usage-dot" />
          Current plan
        </div>
        <div className="oga-dash__usage-plan-row">
          <span className="oga-dash__usage-plan-name">{planName}</span>
          {isApiPlan && <span className="oga-dash__usage-badge">API</span>}
        </div>
        <div>
          <Link
            href="/dashboard/billing"
            className="oga-dash__usage-cta"
          >
            {plan === "free" || plan === "sandbox" ? "Upgrade plan" : "Manage billing"}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* Usage */}
      <div className="oga-dash__usage-cell oga-dash__usage-cell--bordered">
        <div className="oga-dash__usage-eyebrow">
          <span>Monthly usage</span>
          {!unlimited && (
            <span
              className="oga-dash__usage-pct"
              data-tone={tone}
            >
              {Math.round(pct)}%
            </span>
          )}
        </div>
        <div className="oga-dash__usage-count">
          <span className="oga-dash__usage-count-value">{used}</span>
          <span className="oga-dash__usage-count-out">/ {unlimited ? "∞" : limit}</span>
        </div>
        <div className="oga-dash__usage-bar" data-tone={tone}>
          <div
            className="oga-dash__usage-bar-fill"
            style={{ width: unlimited ? "0%" : `${pct}%` }}
          />
        </div>
        <div className="oga-dash__usage-reset">
          Resets on the 1st of the month
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Monitored postcodes
   ============================================================ */
function Watchlist({
  items,
  onRemove,
}: {
  items: SavedArea[];
  onRemove: (id: string) => void;
}) {
  return (
    <AppCard title={`Monitored postcodes · ${items.length}`} noPad>
      <ul className="oga-dash__watchlist">
        {items.map((area) => (
          <li key={area.id} className="oga-dash__watchlist-row">
            <div className="oga-dash__watchlist-text">
              <div className="oga-dash__watchlist-label">
                {area.label || area.postcode}
              </div>
              <div className="oga-dash__watchlist-meta">
                {area.postcode}
                {area.intent ? ` · ${intentLabel(area.intent)}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(area.id)}
              aria-label="Stop monitoring this postcode"
              className="oga-dash__icon-btn oga-dash__icon-btn--danger"
            >
              <XIcon />
            </button>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}

/* ============================================================
   API keys
   ============================================================ */
function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data.keys || []);
    })();
  }, []);

  async function createKey() {
    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key.key);
        const kRes = await fetch("/api/keys");
        const kData = await kRes.json();
        setKeys(kData.keys || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev?.filter((k) => k.id !== id) || null);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <AppCard
      title="API keys"
      note="Bearer tokens for the REST API"
      noPad
    >
      <div className="oga-dash__keys-head">
        <p className="oga-dash__keys-blurb">
          Create a key, drop it in your <code className="oga-dash__inline-code">Authorization: Bearer</code> header. 30 requests per minute per key; cached responses don&rsquo;t count.
        </p>
        <PrimaryCta onClick={createKey} disabled={loading}>
          {loading ? "Creating…" : "New key"}
        </PrimaryCta>
      </div>

      {newKey && (
        <div className="oga-dash__keys-reveal">
          <div className="oga-dash__keys-reveal-eyebrow">
            Save this key now &middot; it won&rsquo;t be shown again
          </div>
          <div className="oga-dash__keys-reveal-row">
            <code className="oga-dash__keys-reveal-code">{newKey}</code>
            <button
              type="button"
              onClick={() => copy(newKey)}
              className="oga-dash__keys-copy"
              data-copied={copied}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="oga-dash__keys-list-wrap">
        {keys === null ? (
          <div className="oga-dash__keys-empty">Loading keys&hellip;</div>
        ) : keys.length === 0 ? (
          <div className="oga-dash__keys-empty-body">
            No keys yet. Create one to start making requests.
          </div>
        ) : (
          <ul className="oga-dash__keys-list">
            {keys.map((k) => (
              <li key={k.id} className="oga-dash__keys-row">
                <div className="oga-dash__keys-row-text">
                  <code className="oga-dash__inline-code">{k.key_preview}</code>
                  <span className="oga-dash__keys-name">{k.name}</span>
                  <span className="oga-dash__keys-meta">
                    {k.last_used_at
                      ? `Last used ${formatDate(k.last_used_at)}`
                      : "Never used"}
                  </span>
                </div>
                <GhostCta onClick={() => revokeKey(k.id)} danger>
                  Revoke
                </GhostCta>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppCard>
  );
}

/* ============================================================
   Reports list
   ============================================================ */
function ReportsTable({
  reports,
  onDelete,
}: {
  reports: Report[];
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "area">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const intents = useMemo(
    () => Array.from(new Set(reports.map((r) => r.intent))),
    [reports],
  );
  const filtered = useMemo(
    () =>
      reports
        .filter((r) => {
          if (search && !r.area.toLowerCase().includes(search.toLowerCase())) return false;
          if (intentFilter !== "all" && r.intent !== intentFilter) return false;
          return true;
        })
        .sort((a, b) => {
          let cmp = 0;
          if (sortBy === "score") cmp = a.score - b.score;
          else if (sortBy === "area") cmp = a.area.localeCompare(b.area);
          else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return sortDir === "desc" ? -cmp : cmp;
        }),
    [reports, search, intentFilter, sortBy, sortDir],
  );

  function toggleSort(col: "date" | "score" | "area") {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  function exportCSV() {
    const header = "Area,Intent,Score,Status,Generated";
    const rowStrings = filtered.map((r) => {
      const rag = appRag(r.score);
      const date = new Date(r.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `"${r.area.replace(/"/g, '""')}","${r.intent}",${r.score},"${rag.label}","${date}"`;
    });
    const csv = [header, ...rowStrings].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onegoodarea-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppCard title={`Reports · ${reports.length}`} noPad>
      {/* Toolbar */}
      <div className="oga-dash__rep-toolbar">
        <input
          type="search"
          placeholder="Search area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="oga-dash__rep-search"
        />
        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="oga-dash__rep-filter"
        >
          <option value="all">All workflows</option>
          {intents.map((i) => (
            <option key={i} value={i}>
              {intentLabel(i)}
            </option>
          ))}
        </select>
        {filtered.length > 0 && (
          <GhostCta onClick={exportCSV}>Export CSV</GhostCta>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="oga-dash__rep-head">
          <SortHeader
            label="Postcode"
            active={sortBy === "area"}
            dir={sortDir}
            onClick={() => toggleSort("area")}
          />
          <span>Workflow</span>
          <SortHeader
            label="Score"
            active={sortBy === "score"}
            dir={sortDir}
            onClick={() => toggleSort("score")}
          />
          <SortHeader
            label="Created"
            active={sortBy === "date"}
            dir={sortDir}
            onClick={() => toggleSort("date")}
          />
          <span />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState hasReports={reports.length > 0} />
      ) : (
        <ul className="oga-dash__rep-list">
          {filtered.map((r) => (
            <ReportRow key={r.id} report={r} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </AppCard>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="oga-dash__sort"
      data-active={active}
    >
      {label}
      {active && (
        <span aria-hidden className="oga-dash__sort-arrow">
          {dir === "desc" ? "▼" : "▲"}
        </span>
      )}
    </button>
  );
}

function ReportRow({
  report,
  onDelete,
}: {
  report: Report;
  onDelete: (id: string) => void;
}) {
  const rag = appRag(report.score);
  const [confirm, setConfirm] = useState(false);

  return (
    <li className="oga-dash__rep-row">
      <Link
        href={`/report/${report.id}`}
        className="oga-dash__rep-area"
      >
        {report.area}
      </Link>

      <span className="oga-dash__rep-intent">{intentLabel(report.intent)}</span>

      <span className="oga-dash__rep-score" style={{ color: rag.dot }}>
        <span
          aria-hidden
          className="oga-dash__rep-score-dot"
          style={{ background: rag.dot }}
        />
        {report.score}
      </span>

      <span className="oga-dash__rep-date">{formatDate(report.created_at)}</span>

      <div className="oga-dash__rep-actions">
        {confirm ? (
          <div className="oga-dash__rep-confirm">
            <button
              type="button"
              onClick={() => {
                onDelete(report.id);
                setConfirm(false);
              }}
              className="oga-dash__rep-confirm-yes"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="oga-dash__rep-confirm-no"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label="Delete report"
            className="oga-dash__icon-btn oga-dash__icon-btn--danger"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyState({ hasReports }: { hasReports: boolean }) {
  return (
    <div className="oga-dash__empty">
      <div className="oga-dash__empty-title">
        {hasReports ? "No reports match your filter" : "No reports yet"}
      </div>
      <p className="oga-dash__empty-body">
        {hasReports
          ? "Clear the search or change the workflow filter to see your reports again."
          : "Generate your first report. The Sandbox tier includes free API calls a month, no card required."}
      </p>
      {!hasReports && (
        <PrimaryCta href="/report">Generate a report</PrimaryCta>
      )}
    </div>
  );
}

/* ============================================================
   Icons
   ============================================================ */
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7 H19 M9 7 V5 A1 1 0 0 1 10 4 H14 A1 1 0 0 1 15 5 V7 M7 7 V20 A1 1 0 0 0 8 21 H16 A1 1 0 0 0 17 20 V7 M10 11 V17 M14 11 V17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
