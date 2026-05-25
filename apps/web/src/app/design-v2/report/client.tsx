"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Styles } from "../_shared/styles";
import { AppShell, AppCard, PrimaryCta, GhostCta } from "../_shared/app-shell";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /report (generator)
   Form with area + intent selector, then a live-looking pipeline
   loading state, then redirect to /report/[id].
   Real endpoints preserved: /api/usage, /api/report.
   ═══════════════════════════════════════════════════════════════ */

type Intent = "moving" | "business" | "investing" | "research";

const INTENTS: { value: Intent; label: string; desc: string; icon: IconName }[] = [
  { value: "moving",    label: "Origination",    desc: "Mortgage suitability + demand-side risk", icon: "buyer" },
  { value: "business",  label: "Site selection", desc: "Footfall, competition, commercial viability", icon: "operator" },
  { value: "investing", label: "Investment",     desc: "Yield, growth, regeneration, tenant risk",     icon: "investor" },
  { value: "research",  label: "Reference",      desc: "Neutral baseline for analysts + planning",     icon: "researcher" },
];

const PIPELINE = [
  { label: "Geocoding location",      source: "postcodes.io" },
  { label: "Fetching crime data",     source: "police.uk" },
  { label: "Reading deprivation",     source: "IMD 2025" },
  { label: "Mapping amenities",       source: "OpenStreetMap" },
  { label: "Checking flood risk",     source: "Environment Agency" },
  { label: "Querying sold prices",    source: "HM Land Registry" },
  { label: "Looking up schools",      source: "Ofsted" },
  { label: "Classifying area type",   source: "the engine" },
  { label: "Computing dimensions",    source: "the engine" },
  { label: "Writing the narrative",   source: "the engine" },
  { label: "Finalising the report",   source: "OneGoodArea" },
];

export default function ReportGeneratorClient() {
  const { status } = useSession();
  const router = useRouter();
  const [area, setArea] = useState("");
  const [intent, setIntent] = useState<Intent>("research");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ plan: string; used: number; limit: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/usage").then((r) => r.json()).then((data) => {
      setUsage({ plan: data.plan, used: data.used, limit: data.limit });
      if (!data.allowed) setLimitReached(true);
    }).catch(() => {});
  }, [status]);

  if (status === "loading") {
    return <><Styles /><AppShell title="New report"><div style={{ padding: 40 }} /></AppShell></>;
  }
  if (status === "unauthenticated") {
    router.push("/sign-in?callbackUrl=/report");
    return null;
  }

  function validate(value: string): string | null {
    const v = value.trim();
    if (!v) return "Enter a postcode or place name.";
    if (v.length > 100) return "Too long (max 100 characters).";
    if (/<[^>]*>/i.test(v)) return "Contains invalid characters.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || limitReached) return;
    const err = validate(area);
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: area.trim(), intent }),
      });
      if (res.status === 403) {
        const data = await res.json();
        if (data.error === "limit_reached") { setLimitReached(true); setLoading(false); return; }
      }
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      router.push(`/report/${data.id}`);
    } catch {
      setError("Failed to generate report. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Styles />
      <AppShell
        title="New report"
        subtitle={loading ? "Fetching live data. This takes 15-45 seconds." : "Enter a postcode or place name. Pick why you're looking."}
        actions={!loading && <GhostCta href="/dashboard">← My reports</GhostCta>}
      >
        <div style={{
          padding: "28px 40px 64px",
          display: "flex", flexDirection: "column", gap: 22,
          maxWidth: 820,
        }}>
          {loading ? (
            <LoadingPipeline area={area} intent={intent} />
          ) : (
            <GeneratorForm
              area={area} setArea={setArea}
              intent={intent} setIntent={setIntent}
              usage={usage}
              limitReached={limitReached}
              error={error}
              setError={setError}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </AppShell>
    </>
  );
}

/* ─────── Form ─────── */

function GeneratorForm({
  area, setArea, intent, setIntent, usage, limitReached, error, setError, onSubmit,
}: {
  area: string; setArea: (v: string) => void;
  intent: Intent; setIntent: (v: Intent) => void;
  usage: { plan: string; used: number; limit: number } | null;
  limitReached: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      {usage && <UsageBar usage={usage} />}

      {limitReached && (
        <div style={{
          border: "1px solid rgba(212,149,0,0.4)",
          background: "#FFF4D1",
          borderRadius: 4,
          padding: "16px 20px",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#6E5300", marginBottom: 8,
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: "#D49900" }} />
            Monthly limit reached
          </div>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 14,
            color: "#6E5300", margin: "0 0 12px", lineHeight: 1.5,
          }}>
            You&apos;ve used all {usage?.limit} reports this month. Upgrade to keep going.
          </p>
          <PrimaryCta href="/pricing">See plans</PrimaryCta>
        </div>
      )}

      <AppCard title="What do you want to score?">
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Postcode or place</label>
            <AreaInput
              value={area}
              onChange={(v) => { setArea(v); if (error) setError(null); }}
              placeholder="e.g. SW1A 1AA, Shoreditch, or Manchester city centre"
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Intent</label>
            <div className="aiq-report-intents" style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}>
              {INTENTS.map((i) => <IntentPill key={i.value} item={i} active={intent === i.value} onClick={() => setIntent(i.value)} />)}
            </div>
          </div>

          {error && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 12,
              color: "#A01B00", background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.25)",
              padding: "10px 14px", borderRadius: 4, marginBottom: 16,
            }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={!area.trim() || limitReached}
              style={{
                fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--signal-ink)", background: "var(--signal)",
                border: "1px solid var(--ink-deep)",
                padding: "12px 22px", borderRadius: 999,
                display: "inline-flex", alignItems: "center", gap: 10,
                cursor: (!area.trim() || limitReached) ? "default" : "pointer",
                opacity: (!area.trim() || limitReached) ? 0.5 : 1,
                transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
              }}
              onMouseEnter={(e) => {
                if (!area.trim() || limitReached) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 8px 18px rgba(6,42,30,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Generate report
              <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
            </button>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--text-3)",
            }}>
              ~15-45s · 7 live data sources
            </span>
          </div>
        </form>
      </AppCard>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 10,
  fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
  letterSpacing: "0.22em", textTransform: "uppercase",
  color: "var(--text-2)",
};

function AreaInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{
        position: "absolute", top: "50%", left: 14, transform: "translateY(-50%)",
        color: focused ? "var(--ink-deep)" : "var(--text-3)",
        transition: "color 140ms ease",
      }}>
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 15.5 L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%", height: 48,
          padding: "0 16px 0 40px",
          fontFamily: "var(--sans)", fontSize: 15,
          color: "var(--ink-deep)", background: "var(--bg)",
          border: `1px solid ${focused ? "var(--ink)" : "var(--border)"}`,
          borderRadius: 4, outline: "none",
          transition: "border-color 140ms ease, box-shadow 140ms ease",
          boxShadow: focused ? "0 0 0 3px rgba(212,243,58,0.22)" : "none",
        }}
      />
    </div>
  );
}

function IntentPill({ item, active, onClick }: {
  item: { value: Intent; label: string; desc: string; icon: IconName };
  active: boolean; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "14px 14px 12px",
        background: active ? "var(--signal-dim)" : hover ? "var(--bg-off)" : "var(--bg)",
        border: `1px solid ${active ? "var(--ink-deep)" : "var(--border)"}`,
        borderRadius: 4,
        cursor: "pointer", textAlign: "left",
        display: "flex", flexDirection: "column", gap: 8,
        transition: "background 140ms ease, border-color 140ms ease",
        position: "relative",
      }}
    >
      {active && (
        <span aria-hidden style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 3, background: "var(--signal)",
        }} />
      )}
      <AiqIcon name={item.icon} size={20} />
      <div>
        <div style={{
          fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
          letterSpacing: "-0.01em",
          color: active ? "var(--ink-deep)" : "var(--ink-deep)",
          lineHeight: 1.15,
        }}>{item.label}</div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.12em",
          color: "var(--text-3)", marginTop: 3,
        }}>{item.desc}</div>
      </div>
    </button>
  );
}

/* ─────── Usage bar ─────── */

function UsageBar({ usage }: { usage: { plan: string; used: number; limit: number } }) {
  const unlimited = usage.limit === Infinity;
  const pct = unlimited ? 0 : Math.min((usage.used / usage.limit) * 100, 100);
  const rag = pct >= 90 ? "#A01B00" : pct >= 70 ? "#D49900" : "var(--ink)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "12px 18px",
      border: "1px solid var(--border)",
      background: "var(--bg)",
      borderRadius: 4,
    }}>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--ink)", background: "var(--signal-dim)",
        padding: "3px 8px", borderRadius: 2,
      }}>{usage.plan}</span>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
        color: "var(--text-2)",
      }}>
        {usage.used}/{unlimited ? "∞" : usage.limit} this month
      </span>
      <div style={{
        flex: 1, minWidth: 100,
        height: 4, background: "var(--border-dim)",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: unlimited ? "0%" : `${pct}%`,
          background: rag,
          transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

/* ─────── Loading pipeline ─────── */

function LoadingPipeline({ area, intent }: { area: string; intent: Intent }) {
  const [step, setStep] = useState(0);
  const [times] = useState(() => PIPELINE.map(() => (Math.random() * 1.2 + 0.2).toFixed(1)));

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => s < PIPELINE.length - 1 ? s + 1 : s);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const intentLabel = INTENTS.find((i) => i.value === intent)?.label ?? intent;
  const pct = Math.round(((step + 1) / PIPELINE.length) * 100);

  return (
    <AppCard noPad>
      <div style={{
        padding: "24px 28px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-ink)",
        color: "#FFFFFF",
        position: "relative", overflow: "hidden",
      }}>
        <div aria-hidden style={{
          position: "absolute", top: -80, right: -60,
          width: 280, height: 280,
          background: "radial-gradient(circle, rgba(212,243,58,0.2) 0%, rgba(212,243,58,0) 60%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal)", marginBottom: 10,
          }}>
            <span aria-hidden style={{
              width: 7, height: 7, borderRadius: 7, background: "var(--signal)",
              animation: "aiq-pulse-dot 1.2s ease-in-out infinite",
              boxShadow: "0 0 10px rgba(212,243,58,0.6)",
            }} />
            {intentLabel} · Generating
          </div>
          <div style={{
            fontFamily: "var(--display)", fontSize: 26, fontWeight: 500,
            letterSpacing: "-0.014em", lineHeight: 1.15,
            color: "#FFFFFF",
          }}>{area}</div>
        </div>
      </div>

      <div style={{ padding: "18px 28px 22px" }}>
        {PIPELINE.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
          const isPending = i > step;
          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr auto auto",
              gap: 12, alignItems: "center",
              padding: "9px 0",
              opacity: isPending ? 0.3 : 1,
              transition: "opacity 300ms",
            }}>
              <span style={{
                width: 22, height: 22, display: "inline-flex",
                alignItems: "center", justifyContent: "center",
              }}>
                {isDone && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" fill="var(--signal)" />
                    <path d="M7 12 L11 16 L17 9" stroke="var(--signal-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
                {isActive && (
                  <span aria-hidden style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid var(--ink)", borderTopColor: "transparent",
                    animation: "aiq-spin 900ms linear infinite",
                  }} />
                )}
                {isPending && (
                  <span aria-hidden style={{
                    width: 5, height: 5, borderRadius: 5, background: "var(--border)",
                  }} />
                )}
              </span>
              <span style={{
                fontFamily: "var(--sans)", fontSize: 14,
                color: isActive ? "var(--ink-deep)" : "var(--text-2)",
                fontWeight: isActive ? 500 : 400,
              }}>{s.label}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: isDone ? "var(--ink)" : "var(--text-3)",
                background: isDone ? "var(--signal-dim)" : "transparent",
                padding: isDone ? "2px 7px" : 0,
                borderRadius: 2,
              }}>{s.source}</span>
              {isDone && (
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10,
                  color: "var(--text-3)",
                  width: 36, textAlign: "right",
                }}>{times[i]}s</span>
              )}
              {!isDone && <span style={{ width: 36 }} />}
            </div>
          );
        })}

        <div style={{ marginTop: 20 }}>
          <div style={{
            height: 4, width: "100%",
            background: "var(--border-dim)", borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: "var(--signal)",
              transition: "width 700ms cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
          <div style={{
            marginTop: 10,
            display: "flex", justifyContent: "space-between",
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-3)",
          }}>
            <span>{step < PIPELINE.length - 1 ? "Reading live data" : "Finalising"}</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </AppCard>
  );
}
