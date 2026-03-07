"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, CreditCard, Loader2, GitCompareArrows, Key, Copy, Trash2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserButton } from "@clerk/nextjs";

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
      {/* Header */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/" />
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/report"
              className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              <Plus size={11} />
              New Report
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

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

        {/* API Keys Section — API plan only */}
        {plan === "api" && (
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
                  Save this key — it won&apos;t be shown again
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

        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
              My Reports
            </h1>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              {reports.length} report{reports.length !== 1 ? "s" : ""} generated
              {compareIds.length > 0 && (
                <span style={{ color: "var(--accent)" }}> — {compareIds.length}/2 selected for comparison</span>
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

            {reports.map((report) => {
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
            {reports.map((report) => {
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

      {/* Footer */}
      <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-10 flex items-center justify-between">
          <Logo size="sm" variant="footer" />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
