"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard, PrimaryCta, GhostCta } from "../_shared/app-shell";
import { AiqIcon, type IconName } from "../_shared/icons";
import "./report.css";

/* /report — Brand v3 rewrite (AR-204 close-out 11/15).

   Report generator: postcode input + intent picker + live-looking
   pipeline -> redirect to /report/[id]. Retires per the dashboard
   proposal (gets absorbed into /dashboard/scores). Light-touch
   token swap to land the .aiq strip cleanly. Real endpoints
   preserved: /api/usage, /api/report. */

type Intent = "moving" | "business" | "investing" | "research";

const INTENTS: { value: Intent; label: string; desc: string; icon: IconName }[] = [
  { value: "moving",    label: "Origination",    desc: "Mortgage suitability + demand-side risk",        icon: "buyer" },
  { value: "business",  label: "Site selection", desc: "Footfall, competition, commercial viability",     icon: "operator" },
  { value: "investing", label: "Investment",     desc: "Yield, growth, regeneration, tenant risk",        icon: "investor" },
  { value: "research",  label: "Reference",      desc: "Neutral baseline for analysts + planning",        icon: "researcher" },
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
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsage({ plan: data.plan, used: data.used, limit: data.limit });
        if (!data.allowed) setLimitReached(true);
      })
      .catch(() => {});
  }, [status]);

  if (status === "loading") {
    return (
      <AppShell title="New report">
        <div className="oga-report__placeholder" />
      </AppShell>
    );
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || limitReached) return;
    const err = validate(area);
    if (err) {
      setError(err);
      return;
    }

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
        if (data.error === "limit_reached") {
          setLimitReached(true);
          setLoading(false);
          return;
        }
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
    <AppShell
      title="New report"
      subtitle={
        loading
          ? "Fetching live data. This takes 15-45 seconds."
          : "Enter a postcode or place name. Pick why you're looking."
      }
      actions={!loading && <GhostCta href="/dashboard">← My reports</GhostCta>}
    >
      <div className="oga-report">
        {loading ? (
          <LoadingPipeline area={area} intent={intent} />
        ) : (
          <GeneratorForm
            area={area}
            setArea={setArea}
            intent={intent}
            setIntent={setIntent}
            usage={usage}
            limitReached={limitReached}
            error={error}
            setError={setError}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Form
   ============================================================ */
function GeneratorForm({
  area,
  setArea,
  intent,
  setIntent,
  usage,
  limitReached,
  error,
  setError,
  onSubmit,
}: {
  area: string;
  setArea: (v: string) => void;
  intent: Intent;
  setIntent: (v: Intent) => void;
  usage: { plan: string; used: number; limit: number } | null;
  limitReached: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <>
      {usage && <UsageBar usage={usage} />}

      {limitReached && (
        <div className="oga-report__limit">
          <div className="oga-report__limit-eyebrow">
            <span aria-hidden className="oga-report__limit-dot" />
            Monthly limit reached
          </div>
          <p className="oga-report__limit-body">
            You&rsquo;ve used all {usage?.limit} reports this month. Upgrade to
            keep going.
          </p>
          <PrimaryCta href="/pricing">See plans</PrimaryCta>
        </div>
      )}

      <AppCard title="What do you want to score?">
        <form onSubmit={onSubmit}>
          <div className="oga-report__field">
            <label className="oga-report__field-label">Postcode or place</label>
            <AreaInput
              value={area}
              onChange={(v) => {
                setArea(v);
                if (error) setError(null);
              }}
              placeholder="e.g. SW1A 1AA, Shoreditch, or Manchester city centre"
            />
          </div>

          <div className="oga-report__field oga-report__field--intent">
            <label className="oga-report__field-label">Intent</label>
            <div className="oga-report__intents">
              {INTENTS.map((i) => (
                <IntentPill
                  key={i.value}
                  item={i}
                  active={intent === i.value}
                  onClick={() => setIntent(i.value)}
                />
              ))}
            </div>
          </div>

          {error && <div className="oga-report__error">{error}</div>}

          <div className="oga-report__submit-row">
            <button
              type="submit"
              disabled={!area.trim() || limitReached}
              className="oga-app-cta oga-app-cta--primary"
            >
              Generate report
              <span aria-hidden>→</span>
            </button>
            <span className="oga-report__submit-hint">
              ~15-45s · 7 live data sources
            </span>
          </div>
        </form>
      </AppCard>
    </>
  );
}

function AreaInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="oga-report__input-wrap">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="oga-report__input-icon"
      >
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M15.5 15.5 L20 20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="oga-report__input"
      />
    </div>
  );
}

function IntentPill({
  item,
  active,
  onClick,
}: {
  item: { value: Intent; label: string; desc: string; icon: IconName };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "oga-report__pill oga-report__pill--active"
          : "oga-report__pill"
      }
    >
      {active && <span aria-hidden className="oga-report__pill-accent" />}
      <AiqIcon name={item.icon} size={20} />
      <div>
        <div className="oga-report__pill-label">{item.label}</div>
        <div className="oga-report__pill-desc">{item.desc}</div>
      </div>
    </button>
  );
}

/* ============================================================
   Usage bar
   ============================================================ */
function UsageBar({
  usage,
}: {
  usage: { plan: string; used: number; limit: number };
}) {
  const unlimited = usage.limit === Infinity;
  const pct = unlimited ? 0 : Math.min((usage.used / usage.limit) * 100, 100);
  const tone: "strong" | "moderate" | "weak" =
    pct >= 90 ? "weak" : pct >= 70 ? "moderate" : "strong";
  return (
    <div className="oga-report__usage" data-tone={tone}>
      <span className="oga-report__usage-plan">{usage.plan}</span>
      <span className="oga-report__usage-text">
        {usage.used}/{unlimited ? "∞" : usage.limit} this month
      </span>
      <div className="oga-report__usage-bar">
        <div
          className="oga-report__usage-bar-fill"
          style={{ width: unlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Loading pipeline (DARK head + 11-step animation)
   ============================================================ */
function LoadingPipeline({
  area,
  intent,
}: {
  area: string;
  intent: Intent;
}) {
  const [step, setStep] = useState(0);
  const [times] = useState(() =>
    PIPELINE.map(() => (Math.random() * 1.2 + 0.2).toFixed(1)),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => (s < PIPELINE.length - 1 ? s + 1 : s));
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const intentLabel = INTENTS.find((i) => i.value === intent)?.label ?? intent;
  const pct = Math.round(((step + 1) / PIPELINE.length) * 100);

  return (
    <AppCard noPad>
      <div className="oga-report__pipe-head" data-oga-surface="dark">
        <div className="oga-report__pipe-eyebrow">
          <span aria-hidden className="oga-report__pipe-pulse" />
          {intentLabel} · Generating
        </div>
        <div className="oga-report__pipe-area">{area}</div>
      </div>

      <div className="oga-report__pipe-body">
        {PIPELINE.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
          const isPending = i > step;
          return (
            <div
              key={i}
              className={
                isPending
                  ? "oga-report__pipe-row oga-report__pipe-row--pending"
                  : "oga-report__pipe-row"
              }
            >
              <span className="oga-report__pipe-icon">
                {isDone && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                    <path
                      d="M7 12 L11 16 L17 9"
                      stroke="var(--oga-white)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="oga-report__pipe-spinner"
                  />
                )}
                {isPending && (
                  <span aria-hidden className="oga-report__pipe-dot" />
                )}
              </span>
              <span
                className={
                  isActive
                    ? "oga-report__pipe-label oga-report__pipe-label--active"
                    : "oga-report__pipe-label"
                }
              >
                {s.label}
              </span>
              <span
                className={
                  isDone
                    ? "oga-report__pipe-source oga-report__pipe-source--done"
                    : "oga-report__pipe-source"
                }
              >
                {s.source}
              </span>
              <span className="oga-report__pipe-time">
                {isDone ? `${times[i]}s` : ""}
              </span>
            </div>
          );
        })}

        <div className="oga-report__pipe-progress">
          <div className="oga-report__pipe-progress-bar">
            <div
              className="oga-report__pipe-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="oga-report__pipe-progress-foot">
            <span>
              {step < PIPELINE.length - 1 ? "Reading live data" : "Finalising"}
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </AppCard>
  );
}
