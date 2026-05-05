"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import {
  AppShell, AppCard, StatCell, PrimaryCta, GhostCta, appRag,
} from "../_shared/app-shell";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /dashboard
   Reports list + usage + watchlist + API keys (if API plan).
   All real endpoints preserved: /api/stripe/portal, /api/keys,
   /api/report/:id, /api/watchlist/:id.
   ═══════════════════════════════════════════════════════════════ */

type Report = { id: string; area: string; intent: string; score: number; created_at: string };
type SavedArea = { id: string; postcode: string; label: string; intent: string | null; created_at: string };
type ApiKey = { id: string; key_preview: string; name: string; created_at: string; last_used_at: string | null };

// API enum -> B2B display label. Per AR-139 / AR-120 (strategic repositioning),
// dashboard surfaces should show "Origination" not the raw "moving" enum.
const INTENT_LABEL: Record<string, string> = {
  moving:    "Origination",
  business:  "Site selection",
  investing: "Investment",
  research:  "Reference",
};
const intentLabel = (id: string | null | undefined) =>
  id ? (INTENT_LABEL[id] ?? id) : "";

type McpStatus = {
  access: boolean;
  addonOwned: boolean;
  includedFreeViaPlan: boolean;
  callsThisMonth: number;
};

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
    <>
      <Styles />
      <AppShell
        title="Dashboard"
        subtitle="Your reports, watchlist, and usage."
        actions={
          <PrimaryCta href="/report">
            New report
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </PrimaryCta>
        }
      >
        <Body {...props} />
      </AppShell>
    </>
  );
}

function Body({ reports: initialReports, plan, planName, used, limit, savedAreas: initialSaved, mcp }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>(initialSaved);
  const [portalLoading, setPortalLoading] = useState(false);

  // V1 grandfathered (developer/business/growth) + V2 active (sandbox/starter_v2/build/scale/growth_v2/enterprise)
  // all grant API access. Keep in sync with API_PLANS in src/lib/stripe.ts.
  const apiPlans = ["developer", "business", "growth", "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
  const isApiPlan = apiPlans.includes(plan);
  const stats = useMemo(() => {
    if (reports.length === 0) return null;
    const avg = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
    const best = reports.reduce((b, r) => r.score > b.score ? r : b, reports[0]);
    return { avg, best };
  }, [reports]);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setPortalLoading(false); }
  }

  async function deleteReport(id: string) {
    const res = await fetch(`/api/report/${id}`, { method: "DELETE" });
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function removeWatchlist(id: string) {
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (res.ok) setSavedAreas((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
      <UsageStrip plan={plan} planName={planName} isApiPlan={isApiPlan}
                  used={used} limit={limit}
                  onBilling={openBillingPortal} billingLoading={portalLoading} />

      {stats && (
        <div className="aiq-dash-stats" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          borderRadius: 4, overflow: "hidden",
        }}>
          <StatCell label="Total reports"  value={reports.length} />
          <StatCell label="Average score"  value={stats.avg}      accent={appRag(stats.avg).tone} />
          <StatCell label="Best area"      value={
            <span style={{ fontSize: 17, lineHeight: 1.25, letterSpacing: "-0.012em" }}>
              {stats.best.area}
            </span>
          } />
          <StatCell label="Best score"     value={stats.best.score} accent={appRag(stats.best.score).tone} />
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

/* ─────── MCP add-on section (AR-144 Session 5) ─────── */

function McpAddOnSection({ mcp }: { mcp: McpStatus }) {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyMcpAddon() {
    setPurchaseLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addon: "mcp" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout. Please try again.");
        setPurchaseLoading(false);
        return;
      }
      if (data.already_owned) {
        setError("You already have the MCP add-on active.");
        setPurchaseLoading(false);
        return;
      }
      if (data.plan_includes) {
        setError("Your plan already includes MCP — no add-on needed.");
        setPurchaseLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setPurchaseLoading(false);
    }
  }

  // STATE 1: Has MCP access — render active card with appropriate label.
  // Branches in priority: plan-included > add-on > catch-all (e.g. superuser
  // implicit access without a paid plan or add-on row).
  if (mcp.access) {
    let label = "Active";
    if (mcp.includedFreeViaPlan) label = "Included free on your plan";
    else if (mcp.addonOwned) label = "MCP add-on · £29 / month";
    return (
      <AppCard title="MCP Server">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <McpStatusBadge status="active" label={label} />
          <McpUsageStat callsThisMonth={mcp.callsThisMonth} />
          <McpInstallHelp />
        </div>
      </AppCard>
    );
  }

  // STATE 2: No MCP access (not superuser, plan doesn't include, no add-on).
  // Show purchase CTA.
  return (
    <AppCard title="MCP Server">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <McpStatusBadge status="inactive" label="Not on your plan" />
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.55,
          color: "var(--text-2)", margin: 0,
        }}>
          Add OneGoodArea to Claude Desktop, Cursor, or any MCP-compatible client. Score postcodes inline in your AI workflow.
          Included free on Growth (£1,499 / mo) and Enterprise tiers, or available as a £29 / month add-on on any paid plan.
        </p>
        {error && (
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11,
            color: "#A01B00", padding: "10px 12px",
            background: "rgba(160,27,0,0.08)",
            border: "1px solid rgba(160,27,0,0.18)",
            borderRadius: 4,
          }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PrimaryCta onClick={buyMcpAddon} disabled={purchaseLoading}>
            {purchaseLoading ? "Starting checkout…" : "Add MCP · £29 / month"}
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </PrimaryCta>
          <GhostCta href="/docs/mcp">What is MCP?</GhostCta>
        </div>
      </div>
    </AppCard>
  );
}

function McpStatusBadge({ status, label }: { status: "active" | "inactive"; label: string }) {
  const isActive = status === "active";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 9,
      fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: isActive ? "var(--ink)" : "var(--text-3)",
    }}>
      <span aria-hidden style={{
        width: 7, height: 7, borderRadius: 999,
        background: isActive ? "var(--signal)" : "var(--text-4)",
        boxShadow: isActive ? "0 0 0 4px rgba(212,243,58,0.18)" : "none",
      }} />
      {label}
    </div>
  );
}

function McpUsageStat({ callsThisMonth }: { callsThisMonth: number }) {
  return (
    <div style={{
      padding: "12px 16px",
      background: "var(--bg-off)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>MCP calls this month</span>
      <span style={{
        fontFamily: "var(--display)", fontSize: 24, fontWeight: 400,
        color: "var(--ink-deep)", letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>{callsThisMonth.toLocaleString()}</span>
    </div>
  );
}

function McpInstallHelp() {
  return (
    <div style={{
      padding: "12px 16px",
      background: "var(--bg)",
      border: "1px solid var(--border)",
      borderLeft: "3px solid var(--signal)",
      borderRadius: 4,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--ink)", paddingTop: 3, flexShrink: 0,
      }}>Install</span>
      <span style={{
        fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.55,
        color: "var(--ink-deep)",
      }}>
        Add to your Claude Desktop or Cursor config with your API key. Full instructions at{" "}
        <Link href="/docs/mcp" style={{ color: "var(--ink)", borderBottom: "1px solid var(--signal)" }}>
          /docs/mcp
        </Link>.
      </span>
    </div>
  );
}

/* ─────── Usage strip ─────── */

function UsageStrip({ plan, planName, isApiPlan, used, limit, onBilling, billingLoading }: {
  plan: string; planName: string; isApiPlan: boolean;
  used: number; limit: number;
  onBilling: () => void; billingLoading: boolean;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const rag = pct >= 90 ? "#FFB8A8" : pct >= 70 ? "#FFE07A" : "var(--signal)";

  return (
    <div className="aiq-dash-usage" style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 0,
      background: "var(--bg-ink)",
      borderRadius: 4,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 20px 50px -28px rgba(6,42,30,0.35)",
    }}>
      {/* Chartreuse wash */}
      <div aria-hidden style={{
        position: "absolute", top: -120, right: -80,
        width: 420, height: 420,
        background: "radial-gradient(circle, rgba(212,243,58,0.2) 0%, rgba(212,243,58,0) 58%)",
        pointerEvents: "none",
      }} />

      {/* Plan */}
      <div style={{
        padding: "26px 28px",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", gap: 12,
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(212,243,58,0.88)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
            boxShadow: "0 0 8px rgba(212,243,58,0.5)",
          }} />
          Current plan
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 32, fontWeight: 500,
            letterSpacing: "-0.018em", color: "#FFFFFF",
            lineHeight: 1,
          }}>{planName}</span>
          {isApiPlan && (
            <span style={{
              fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "3px 8px", borderRadius: 2,
            }}>API</span>
          )}
        </div>
        <div style={{ marginTop: 2 }}>
          {plan === "free" ? (
            <PrimaryCta href="/pricing">Upgrade plan</PrimaryCta>
          ) : (
            <button
              onClick={onBilling}
              style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#FFFFFF", background: "transparent",
                border: "1px solid rgba(255,255,255,0.24)",
                padding: "10px 18px", borderRadius: 999, cursor: "pointer",
                transition: "background 140ms ease, border-color 140ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)"; }}
            >
              {billingLoading ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div style={{
        padding: "26px 28px",
        display: "flex", flexDirection: "column", gap: 14,
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
        }}>
          <span>Monthly usage</span>
          {!unlimited && <span style={{ color: rag }}>{Math.round(pct)}%</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 38, fontWeight: 500,
            letterSpacing: "-0.02em", color: "#FFFFFF",
            lineHeight: 1,
          }}>{used}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 14,
            color: "rgba(255,255,255,0.5)",
          }}>/ {unlimited ? "∞" : limit}</span>
        </div>
        <div style={{
          height: 5, width: "100%",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: unlimited ? "0%" : `${pct}%`,
            background: rag,
            transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
            boxShadow: `0 0 12px ${rag}33`,
          }} />
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.45)",
        }}>Resets on the 1st of the month</div>
      </div>
    </div>
  );
}

/* ─────── Watchlist ─────── */

function Watchlist({ items, onRemove }: {
  items: SavedArea[]; onRemove: (id: string) => void;
}) {
  return (
    <AppCard title={`Watchlist · ${items.length} area${items.length !== 1 ? "s" : ""}`} noPad>
      <ul className="aiq-watchlist" style={{
        listStyle: "none", margin: 0, padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0,
      }}>
        {items.map((area, i) => (
          <li key={area.id} style={{
            padding: "16px 20px",
            borderRight: (i % 3 !== 2) ? "1px solid var(--border-dim)" : "none",
            borderTop: i >= 3 ? "1px solid var(--border-dim)" : "none",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
                letterSpacing: "-0.008em", color: "var(--ink-deep)",
                lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {area.label || area.postcode}
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.14em",
                color: "var(--text-3)",
                marginTop: 3,
              }}>
                {area.postcode}{area.intent ? ` · ${intentLabel(area.intent)}` : ""}
              </div>
            </div>
            <button
              onClick={() => onRemove(area.id)}
              aria-label="Remove from watchlist"
              style={{
                width: 26, height: 26, flexShrink: 0,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4, cursor: "pointer",
                color: "var(--text-3)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                transition: "color 140ms, border-color 140ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#A01B00"; e.currentTarget.style.borderColor = "#A01B00"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}

/* ─────── API keys (conditional on API plan) ─────── */

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
    } finally { setLoading(false); }
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
      <div style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{
          fontFamily: "var(--sans)", fontSize: 13, color: "var(--text-2)",
          maxWidth: "60ch", lineHeight: 1.5,
        }}>
          Create a key, drop it in your <code style={inlineCode}>Authorization: Bearer</code> header. 30 requests per minute per key; cached responses don&apos;t count.
        </div>
        <PrimaryCta onClick={createKey} disabled={loading}>
          {loading ? "Creating…" : "New key"}
        </PrimaryCta>
      </div>

      {newKey && (
        <div style={{
          margin: "0 22px 18px",
          padding: "14px 18px",
          background: "var(--signal-dim)",
          border: "1px solid var(--ink)",
          borderRadius: 4,
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--ink-deep)", marginBottom: 8,
          }}>
            Save this key now · it won&apos;t be shown again
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <code style={{
              fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
              color: "var(--ink-deep)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "6px 10px", borderRadius: 2,
              flex: 1, minWidth: 0,
              overflow: "auto", whiteSpace: "nowrap",
            }}>{newKey}</code>
            <button
              onClick={() => copy(newKey)}
              style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: copied ? "var(--ink-deep)" : "var(--ink)",
                background: copied ? "var(--bg)" : "transparent",
                border: `1px solid var(--ink-deep)`,
                padding: "6px 12px", borderRadius: 2, cursor: "pointer",
              }}
            >{copied ? "Copied ✓" : "Copy"}</button>
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }}>
        {keys === null ? (
          <div style={{
            padding: "22px", textAlign: "center",
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", color: "var(--text-3)",
          }}>Loading keys…</div>
        ) : keys.length === 0 ? (
          <div style={{
            padding: "26px 22px", textAlign: "center",
            fontFamily: "var(--sans)", fontSize: 14,
            color: "var(--text-3)",
          }}>No keys yet. Create one to start making requests.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {keys.map((k, i) => (
              <li key={k.id} style={{
                padding: "14px 22px",
                borderBottom: i < keys.length - 1 ? "1px solid var(--border-dim)" : "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 14, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <code style={inlineCode}>{k.key_preview}</code>
                  <span style={{
                    fontFamily: "var(--display)", fontSize: 14, fontWeight: 500,
                    color: "var(--ink-deep)", letterSpacing: "-0.005em",
                  }}>{k.name}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                    letterSpacing: "0.14em", color: "var(--text-3)",
                  }}>
                    {k.last_used_at ? `Last used ${formatDate(k.last_used_at)}` : "Never used"}
                  </span>
                </div>
                <GhostCta onClick={() => revokeKey(k.id)} danger>Revoke</GhostCta>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppCard>
  );
}

const inlineCode: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
  color: "var(--ink-deep)",
  background: "var(--bg-off)",
  border: "1px solid var(--border)",
  padding: "2px 7px", borderRadius: 2,
};

/* ─────── Reports table ─────── */

function ReportsTable({ reports, onDelete }: {
  reports: Report[]; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "area">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const intents = useMemo(() => Array.from(new Set(reports.map((r) => r.intent))), [reports]);
  const filtered = useMemo(() => reports
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
    }), [reports, search, intentFilter, sortBy, sortDir]);

  function toggleSort(col: "date" | "score" | "area") {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function exportCSV() {
    const header = "Area,Intent,Score,Status,Generated";
    const rowStrings = filtered.map((r) => {
      const rag = appRag(r.score);
      const date = new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
      <div style={{
        padding: "14px 22px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <input
          type="search"
          placeholder="Search area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180,
            height: 36, padding: "0 12px",
            fontFamily: "var(--sans)", fontSize: 13.5,
            color: "var(--ink-deep)", background: "var(--bg)",
            border: "1px solid var(--border)", borderRadius: 4,
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,243,58,0.22)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
        />
        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          style={{
            height: 36, padding: "0 12px",
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.08em",
            color: "var(--ink-deep)", background: "var(--bg)",
            border: "1px solid var(--border)", borderRadius: 4,
            outline: "none", cursor: "pointer",
          }}
        >
          <option value="all">All intents</option>
          {intents.map((i) => <option key={i} value={i}>{intentLabel(i)}</option>)}
        </select>
        {filtered.length > 0 && <GhostCta onClick={exportCSV}>Export CSV</GhostCta>}
      </div>

      {/* Header row */}
      {filtered.length > 0 && (
        <div className="aiq-reports-head" style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px 80px 120px 40px",
          gap: 14, padding: "10px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-off)",
          fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <SortHeader label="Area"     active={sortBy === "area"}   dir={sortDir} onClick={() => toggleSort("area")} />
          <span>Intent</span>
          <SortHeader label="Score"    active={sortBy === "score"}  dir={sortDir} onClick={() => toggleSort("score")} />
          <SortHeader label="Created"  active={sortBy === "date"}   dir={sortDir} onClick={() => toggleSort("date")} />
          <span />
        </div>
      )}

      {/* Rows */}
      {filtered.length === 0 ? (
        <EmptyState hasReports={reports.length > 0} />
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {filtered.map((r, i) => <ReportRow key={r.id} report={r} isLast={i === filtered.length - 1} onDelete={onDelete} />)}
        </ul>
      )}
    </AppCard>
  );
}

function SortHeader({ label, active, dir, onClick }: {
  label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: active ? "var(--ink-deep)" : "var(--text-3)",
        padding: 0,
      }}
    >
      {label}
      {active && <span aria-hidden style={{ fontSize: 9 }}>{dir === "desc" ? "▼" : "▲"}</span>}
    </button>
  );
}

function ReportRow({ report, isLast, onDelete }: {
  report: Report; isLast: boolean; onDelete: (id: string) => void;
}) {
  const rag = appRag(report.score);
  const [confirm, setConfirm] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <li
      className="aiq-reports-row"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 120px 80px 120px 40px",
        gap: 14,
        alignItems: "center",
        padding: "14px 22px",
        borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
        background: hover ? "var(--bg-off)" : "var(--bg)",
        transition: "background 140ms ease",
      }}
    >
      <Link href={`/report/${report.id}`} style={{
        fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
        letterSpacing: "-0.008em",
        color: "var(--ink-deep)", textDecoration: "none",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{report.area}</Link>

      <span style={{
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.04em",
        color: "var(--signal-ink)", background: "var(--signal)",
        padding: "3px 8px", borderRadius: 2, justifySelf: "start",
      }}>{intentLabel(report.intent)}</span>

      <span style={{
        fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600,
        color: rag.dot,
        display: "inline-flex", alignItems: "center", gap: 7,
      }}>
        <span aria-hidden style={{
          width: 6, height: 6, borderRadius: 6, background: rag.dot,
        }} />
        {report.score}
      </span>

      <span style={{
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.06em", color: "var(--text-3)",
      }}>{formatDate(report.created_at)}</span>

      <div style={{ justifySelf: "end", position: "relative" }}>
        {confirm ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { onDelete(report.id); setConfirm(false); }}
              style={{
                fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "#FFFFFF", background: "#A01B00",
                border: "1px solid #A01B00", padding: "4px 8px", borderRadius: 2,
                cursor: "pointer",
              }}
            >Delete</button>
            <button
              onClick={() => setConfirm(false)}
              style={{
                fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-2)", background: "transparent",
                border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 2,
                cursor: "pointer",
              }}
            >No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            aria-label="Delete report"
            style={{
              width: 28, height: 28,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 4, cursor: "pointer",
              color: "var(--text-3)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              transition: "color 140ms, border-color 140ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#A01B00"; e.currentTarget.style.borderColor = "#A01B00"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 7 H19 M9 7 V5 A1 1 0 0 1 10 4 H14 A1 1 0 0 1 15 5 V7 M7 7 V20 A1 1 0 0 0 8 21 H16 A1 1 0 0 0 17 20 V7 M10 11 V17 M14 11 V17"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyState({ hasReports }: { hasReports: boolean }) {
  return (
    <div style={{
      padding: "48px 22px",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "0 0 8px",
      }}>
        {hasReports ? "No reports match your filter" : "No reports yet"}
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
        color: "var(--text-2)", lineHeight: 1.5,
        margin: "0 auto 20px", maxWidth: "44ch",
      }}>
        {hasReports
          ? "Clear the search or change the intent filter to see your reports again."
          : "Generate your first report. Three are free every month."}
      </p>
      {!hasReports && (
        <PrimaryCta href="/report">
          Generate a report
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </PrimaryCta>
      )}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
