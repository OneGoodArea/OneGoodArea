"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, CreditCard, Loader2, GitCompareArrows, Key, Copy, Trash2, Search, ArrowUpDown } from "lucide-react";
import { UserButton } from "@/components/user-button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

interface ReportSummary {
  id: string;
  area: string;
  intent: string;
  score: number;
  created_at: string;
}

function getRAG(score: number) {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", glow: "neon-green-glow", label: "Strong" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", glow: "neon-amber-glow", label: "Moderate" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", glow: "neon-red-glow", label: "Weak" };
}

interface DashboardProps {
  reports: ReportSummary[];
  plan: string;
  planName: string;
  used: number;
  limit: number;
}

interface ApiKeyInfo {
  id: string;
  key_preview: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export function DashboardClient({ reports, plan, planName, used, limit }: DashboardProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[] | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "area">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const intents = Array.from(new Set(reports.map((r) => r.intent)));

  const filteredReports = reports
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
    });

  function toggleSort(col: "date" | "score" | "area") {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  const avgScore = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : 0;
  const bestReport = reports.length > 0 ? reports.reduce((best, r) => (r.score > best.score ? r : best), reports[0]) : null;

  async function loadApiKeys() {
    if (keysLoaded) return;
    const res = await fetch("/api/keys");
    const data = await res.json();
    setApiKeys(data.keys || []);
    setKeysLoaded(true);
  }

  async function createKey() {
    setKeyLoading(true);
    try {
      const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key.key);
        setKeysLoaded(false);
        loadApiKeys();
      }
    } finally {
      setKeyLoading(false);
    }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setApiKeys((prev) => prev?.filter((k) => k.id !== id) || null);
  }

  function toggleCompare(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Dashboard" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          <Plus size={11} />
          New Report
        </Link>
        <UserButton />
      </Navbar>

      {/* Main */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        {/* Plan & Usage */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-px mb-6" style={{ background: "var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-elevated)" }}>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
              Current Plan
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {planName}
              </span>
              {plan === "free" ? (
                <Link
                  href="/pricing"
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors"
                  style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
                >
                  Upgrade
                </Link>
              ) : (
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors"
                  style={{ color: "var(--text-tertiary)", background: "var(--bg-active)" }}
                >
                  {portalLoading ? <Loader2 size={10} className="animate-spin" /> : <CreditCard size={10} />}
                  Manage
                </button>
              )}
            </div>
          </div>
          <div className="p-4" style={{ background: "var(--bg-elevated)" }}>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
              Monthly Usage
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {used}
                <span className="text-[12px] font-normal" style={{ color: "var(--text-tertiary)" }}>
                  /{limit === Infinity ? "∞" : limit}
                </span>
              </span>
              <div className="flex-1 h-1.5" style={{ background: "var(--border)" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: limit === Infinity ? "0%" : `${Math.min((used / limit) * 100, 100)}%`,
                    background: used >= limit && limit !== Infinity ? "var(--neon-red)" : "var(--neon-green)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Section — Business plan only */}
        {plan === "business" && (
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Key size={12} style={{ color: "var(--text-tertiary)" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  API Keys
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/docs"
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
                  style={{ color: "var(--text-tertiary)", background: "var(--bg-active)" }}
                >
                  Docs
                </Link>
                <button
                  onClick={createKey}
                  disabled={keyLoading}
                  className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
                  style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
                >
                  {keyLoading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  New Key
                </button>
              </div>
            </div>

            {/* New key reveal */}
            {newKey && (
              <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-active)" }}>
                <div className="text-[10px] font-mono mb-1" style={{ color: "var(--neon-amber)" }}>
                  Save this key. It won&apos;t be shown again
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[12px] font-mono flex-1" style={{ color: "var(--text-primary)" }}>{newKey}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(newKey); }}
                    className="p-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Key list */}
            <div className="px-5 py-3">
              {!keysLoaded ? (
                <button
                  onClick={loadApiKeys}
                  className="text-[11px] font-mono"
                  style={{ color: "var(--accent)" }}
                >
                  Load API keys
                </button>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between">
                      <div>
                        <code className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{k.key_preview}</code>
                        <span className="text-[10px] font-mono ml-2" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(k.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        {k.last_used_at && (
                          <span className="text-[10px] font-mono ml-2" style={{ color: "var(--text-tertiary)" }}>
                            Last used: {new Date(k.last_used_at).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="p-1 transition-colors"
                        style={{ color: "var(--neon-red)" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>No API keys yet</span>
              )}
            </div>
          </div>
        )}

        {/* Stats Strip */}
        {reports.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-6" style={{ background: "var(--border)" }}>
            <div className="p-3" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Total Reports</div>
              <span className="text-[18px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{reports.length}</span>
            </div>
            <div className="p-3" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Avg Score</div>
              <span className={`text-[18px] font-mono font-semibold ${getRAG(avgScore).glow}`} style={{ color: getRAG(avgScore).color }}>{avgScore}</span>
            </div>
            <div className="p-3" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Best Area</div>
              <span className="text-[13px] font-medium truncate block" style={{ color: "var(--neon-green)" }}>{bestReport?.area ?? "-"}</span>
            </div>
            <div className="p-3" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Best Score</div>
              <span className="text-[18px] font-mono font-semibold" style={{ color: "var(--neon-green)" }}>{bestReport?.score ?? "-"}</span>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
              My Reports
            </h1>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              {filteredReports.length === reports.length
                ? `${reports.length} report${reports.length !== 1 ? "s" : ""} generated`
                : `${filteredReports.length} of ${reports.length} reports`}
              {compareIds.length > 0 && (
                <span style={{ color: "var(--accent)" }}> · {compareIds.length}/2 selected for comparison</span>
              )}
            </p>
          </div>
          {compareIds.length === 2 && (
            <Link
              href={`/compare?reports=${compareIds.join(",")}`}
              className="h-8 px-4 flex items-center gap-2 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors shrink-0"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              <GitCompareArrows size={12} />
              Compare
            </Link>
          )}
        </div>

        {/* Search & Filter Bar */}
        {reports.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Search by area name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[11px] font-mono border outline-none transition-colors"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={intentFilter}
                onChange={(e) => setIntentFilter(e.target.value)}
                className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider border outline-none cursor-pointer"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <option value="all">All intents</option>
                {intents.map((intent) => (
                  <option key={intent} value={intent}>{intent}</option>
                ))}
              </select>
              {(["date", "score", "area"] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="h-8 px-2.5 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider border transition-colors"
                  style={{
                    background: sortBy === col ? "var(--bg-active)" : "var(--bg)",
                    borderColor: sortBy === col ? "var(--text-tertiary)" : "var(--border)",
                    color: sortBy === col ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {col}
                  {sortBy === col && <ArrowUpDown size={9} style={{ opacity: 0.6 }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 ? (
          <div
            className="border p-12 text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
          >
            <div className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
              No reports yet
            </div>
            <div className="text-[11px] mb-6" style={{ color: "var(--text-tertiary)" }}>
              Generate your first area intelligence report.
            </div>
            <Link
              href="/report"
              className="inline-flex h-9 px-5 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Generate Report
              <ArrowRight size={12} />
            </Link>
          </div>
        ) : filteredReports.length === 0 ? (
          <div
            className="border p-8 text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
          >
            <div className="text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>
              No matching reports
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Try a different search or filter.
            </div>
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block border" style={{ borderColor: "var(--border)" }}>
            <div
              className="grid grid-cols-[32px_1fr_120px_80px_80px_140px_40px] gap-4 px-5 py-2.5 border-b"
              style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
            >
              <span />
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Area</span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Intent</span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Score</span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Status</span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Generated</span>
              <span />
            </div>

            {filteredReports.map((report) => {
              const rag = getRAG(report.score);
              const isSelected = compareIds.includes(report.id);
              return (
                <Link
                  key={report.id}
                  href={`/report/${report.id}`}
                  className="grid grid-cols-[32px_1fr_120px_80px_80px_140px_40px] gap-4 px-5 py-3 border-b transition-colors hover:brightness-110"
                  style={{ borderColor: "var(--border)", background: isSelected ? "var(--bg-active)" : "var(--bg)" }}
                >
                  <span className="flex items-center" onClick={(e) => toggleCompare(report.id, e)}>
                    <span
                      className="w-4 h-4 border flex items-center justify-center cursor-pointer transition-colors"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--border-hover)",
                        background: isSelected ? "var(--accent)" : "transparent",
                      }}
                    >
                      {isSelected && <span className="text-[10px]" style={{ color: "var(--bg)" }}>✓</span>}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {report.area}
                  </span>
                  <span className="text-[11px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>
                    {report.intent}
                  </span>
                  <span className={`text-[13px] font-mono font-semibold ${rag.glow}`} style={{ color: rag.color }}>
                    {report.score}
                  </span>
                  <span className="text-[10px] font-mono self-center" style={{ color: rag.color }}>
                    {rag.label}
                  </span>
                  <span className="text-[11px] font-mono self-center" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="flex items-center justify-end">
                    <ArrowRight size={12} style={{ color: "var(--text-tertiary)" }} />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filteredReports.map((report) => {
              const rag = getRAG(report.score);
              const isSelected = compareIds.includes(report.id);
              return (
                <Link
                  key={report.id}
                  href={`/report/${report.id}`}
                  className="block border p-4 transition-colors"
                  style={{ borderColor: isSelected ? "var(--accent)" : "var(--border)", background: isSelected ? "var(--bg-active)" : "var(--bg-elevated)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        onClick={(e) => toggleCompare(report.id, e)}
                        className="w-4 h-4 border flex items-center justify-center cursor-pointer shrink-0"
                        style={{
                          borderColor: isSelected ? "var(--accent)" : "var(--border-hover)",
                          background: isSelected ? "var(--accent)" : "transparent",
                        }}
                      >
                        {isSelected && <span className="text-[10px]" style={{ color: "var(--bg)" }}>✓</span>}
                      </span>
                      <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {report.area}
                      </span>
                    </div>
                    <span className={`text-[16px] font-mono font-bold shrink-0 ${rag.glow}`} style={{ color: rag.color }}>
                      {report.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-7">
                    <span className="text-[10px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>
                      {report.intent}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: rag.color }}>
                      {rag.label}
                    </span>
                    <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(report.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
