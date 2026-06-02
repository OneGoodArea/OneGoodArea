"use client";

import { useState, type ReactNode } from "react";
import { AppShell, AppCard, appRag, GhostCta } from "../../_shared/app-shell";
import type { AreaReport } from "@/lib/types";
import { intentLabel } from "@/lib/intents";
import "./report-id.css";

/* /report/[id] — Brand v3 rewrite (AR-204 close-out 12/15).

   Saved report viewer: score ring + dimensions + summary + sections
   + property + schools + recommendations + meta. Retires per the
   dashboard proposal (absorbs into /dashboard/scores). Light-touch
   migration: token swap + CSS extraction so the .aiq strip lands
   cleanly at the end of the sweep. */

type Props = {
  id: string;
  report: AreaReport;
  score: number;
  createdAt: string;
};

export default function ReportViewClient({
  id,
  report,
  score,
  createdAt,
}: Props) {
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );

  function flash(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <AppShell
      title={report.area}
      subtitle={`${intentLabel(report.intent)} · generated ${formatDate(createdAt)}`}
      actions={
        <ReportActions
          id={id}
          report={report}
          score={score}
          onToast={flash}
        />
      }
    >
      <div className="oga-rpt">
        {toast && <Toast kind={toast.kind} msg={toast.msg} />}
        <HeroBlock report={report} score={score} />
        <Dimensions subScores={report.sub_scores} />
        <SummaryBlock summary={report.summary} />
        {report.property_data && <PropertyBlock data={report.property_data} />}
        {report.schools_data &&
          report.schools_data.schools.length > 0 && (
            <SchoolsBlock data={report.schools_data} />
          )}
        <SectionsBlock sections={report.sections} />
        <RecommendationsBlock recs={report.recommendations} />
        <MetaBlock report={report} id={id} />
      </div>
    </AppShell>
  );
}

/* ============================================================
   Action bar — bookmark / PDF / share / back
   ============================================================ */
function ReportActions({
  id,
  report,
  score,
  onToast,
}: {
  id: string;
  report: AreaReport;
  score: number;
  onToast: (kind: "ok" | "err", msg: string) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/report/${id}`
      : `https://www.onegoodarea.com/report/${id}`;
  const shareText = `${report.area} scored ${score}/100 for ${intentLabel(report.intent)} on OneGoodArea`;

  function copyLink() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(shareUrl);
    onToast("ok", "Link copied");
    setShareOpen(false);
  }

  function openSocial(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }

  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const { exportReportPDF } = await import("@/lib/pdf-export");
      exportReportPDF(report);
      onToast("ok", "PDF downloaded");
    } catch {
      onToast("err", "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  async function saveToWatchlist() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode: report.area,
          label: "",
          intent: report.intent,
        }),
      });
      if (res.ok) {
        setSaved(true);
        onToast("ok", "Added to monitored postcodes");
      } else if (res.status === 409) {
        setSaved(true);
        onToast("ok", "Already monitored");
      } else {
        onToast("err", "Could not add");
      }
    } catch {
      onToast("err", "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="oga-rpt__actions">
      <ActionBtn
        onClick={saveToWatchlist}
        disabled={saving || saved}
        tone={saved ? "active" : "ghost"}
      >
        <BookmarkIcon filled={saved} />
        {saved ? "Monitoring" : saving ? "Adding…" : "Monitor postcode"}
      </ActionBtn>

      <ActionBtn onClick={exportPDF} disabled={exporting} tone="ghost">
        <DownloadIcon />
        {exporting ? "Preparing…" : "PDF"}
      </ActionBtn>

      <div className="oga-rpt__share-wrap">
        <ActionBtn
          onClick={() => setShareOpen(!shareOpen)}
          tone="ghost"
        >
          <ShareIcon />
          Share
        </ActionBtn>
        {shareOpen && (
          <ShareMenu
            shareUrl={shareUrl}
            shareText={shareText}
            onCopy={copyLink}
            onSocial={openSocial}
            onClose={() => setShareOpen(false)}
          />
        )}
      </div>

      <GhostCta href="/dashboard">← Reports</GhostCta>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "ghost" | "active";
}) {
  const className =
    tone === "active"
      ? "oga-rpt__action oga-rpt__action--active"
      : "oga-rpt__action";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

function ShareMenu({
  shareUrl,
  onCopy,
  onSocial,
  onClose,
}: {
  shareUrl: string;
  shareText: string;
  onCopy: () => void;
  onSocial: (url: string) => void;
  onClose: () => void;
}) {
  /* AR-149: WhatsApp + X removed (consumer-register surfaces).
     LinkedIn stays — professional network for regulated B2B shares.
     Copy link is primary — most useful in vendor evaluations. */
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <div aria-hidden onClick={onClose} className="oga-rpt__share-backdrop" />
      <div className="oga-rpt__share-menu">
        <ShareItem label="Copy link" onClick={onCopy} primary />
        <div className="oga-rpt__share-divider" />
        <ShareItem label="Share to LinkedIn" onClick={() => onSocial(liUrl)} />
      </div>
    </>
  );
}

function ShareItem({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "oga-rpt__share-item oga-rpt__share-item--primary"
          : "oga-rpt__share-item"
      }
    >
      {label}
    </button>
  );
}

function Toast({ kind, msg }: { kind: "ok" | "err"; msg: string }) {
  return (
    <div className="oga-rpt__toast" data-kind={kind}>
      <span aria-hidden className="oga-rpt__toast-dot" />
      {msg}
    </div>
  );
}

/* ============================================================
   Icons
   ============================================================ */
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden
    >
      <path
        d="M6 4 H18 V22 L12 17 L6 22 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4 V15 M6 11 L12 17 L18 11 M4 21 H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle
        cx="18"
        cy="19"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.2 11 L15.8 6.5 M8.2 13 L15.8 17.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================
   Hero — DARK strip with area + score ring
   ============================================================ */
function HeroBlock({
  report,
  score,
}: {
  report: AreaReport;
  score: number;
}) {
  return (
    <AppCard noPad>
      <div className="oga-rpt__hero" data-oga-surface="dark">
        <div className="oga-rpt__hero-text">
          <div className="oga-rpt__hero-eyebrow">
            <span aria-hidden className="oga-rpt__hero-eyebrow-dot" />
            Intent · {report.intent}
            {report.area_type && (
              <>
                <span aria-hidden className="oga-rpt__hero-eyebrow-sep" />
                <span>{report.area_type}</span>
              </>
            )}
          </div>
          <h2 className="oga-rpt__hero-area">{report.area}</h2>
          <p className="oga-rpt__hero-summary">{trimSummary(report.summary)}</p>
        </div>

        <ScoreRing score={score} />
      </div>
    </AppCard>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 220;
  const r = size / 2 - 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const tone: "strong" | "moderate" | "weak" =
    score >= 70 ? "strong" : score >= 45 ? "moderate" : "weak";
  const ringColor =
    tone === "strong"
      ? "var(--oga-white)"
      : tone === "moderate"
        ? "#FFE07A"
        : "#FFB8A8";
  return (
    <div className="oga-rpt__ring" data-tone={tone}>
      <div className="oga-rpt__ring-svg-wrap">
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ringColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="oga-rpt__ring-text">
          <span className="oga-rpt__ring-score">{score}</span>
          <span className="oga-rpt__ring-out">/ 100</span>
        </div>
      </div>
      <div className="oga-rpt__ring-label">Overall score</div>
    </div>
  );
}

function trimSummary(s: string, max = 300): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/[.,;:\s]*$/, "") + "…";
}

/* ============================================================
   Dimensions
   ============================================================ */
function Dimensions({ subScores }: { subScores: AreaReport["sub_scores"] }) {
  return (
    <AppCard title="Dimensions" note={`${subScores.length} weighted scores`}>
      <div className="oga-rpt__dims">
        {subScores.map((sub) => (
          <DimensionRow key={sub.label} sub={sub} />
        ))}
      </div>
    </AppCard>
  );
}

function DimensionRow({
  sub,
}: {
  sub: AreaReport["sub_scores"][number];
}) {
  const rag = appRag(sub.score);
  const lvl = confLevel(sub.confidence);
  const isStrong = lvl === "HIGH" || lvl === "MEDIUM";
  return (
    <div>
      <div className="oga-rpt__dim-head">
        <div className="oga-rpt__dim-meta">
          <span className="oga-rpt__dim-label">{sub.label}</span>
          <span className="oga-rpt__dim-weight">Weight {sub.weight}</span>
          {lvl && (
            <span className="oga-rpt__conf-chip">
              <span
                className={
                  isStrong
                    ? "oga-rpt__conf-pill oga-rpt__conf-pill--strong"
                    : "oga-rpt__conf-pill"
                }
              >
                {lvl}
              </span>
              <span className="oga-rpt__conf-tooltip" role="tooltip">
                <span className="oga-rpt__conf-tooltip-eyebrow">
                  {lvl} · {sub.confidence?.toFixed(2)}
                </span>
                {sub.confidence_reason ||
                  `Confidence ${sub.confidence?.toFixed(2)}`}
              </span>
            </span>
          )}
        </div>
        <span
          className="oga-rpt__dim-score"
          style={{ color: rag.dot }}
        >
          <span
            aria-hidden
            className="oga-rpt__dim-score-dot"
            style={{ background: rag.dot }}
          />
          {sub.score}
        </span>
      </div>
      <div className="oga-rpt__dim-track" style={{ background: rag.bg }}>
        <div
          className="oga-rpt__dim-fill"
          style={{ width: `${sub.score}%`, background: rag.dot }}
        />
      </div>
      <p className="oga-rpt__dim-summary">{sub.summary}</p>
    </div>
  );
}

/* ============================================================
   Summary + sections
   ============================================================ */
function SummaryBlock({ summary }: { summary: string }) {
  return (
    <AppCard title="Executive summary">
      <p className="oga-rpt__summary">{summary}</p>
    </AppCard>
  );
}

function SectionsBlock({
  sections,
}: {
  sections: AreaReport["sections"];
}) {
  if (!sections || sections.length === 0) return null;
  return (
    <AppCard
      title={`Detailed analysis · ${sections.length} section${sections.length !== 1 ? "s" : ""}`}
      noPad
    >
      <div>
        {sections.map((section, i) => (
          <div key={section.title} className="oga-rpt__section">
            <div className="oga-rpt__section-num">
              § {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="oga-rpt__section-title">{section.title}</h3>
            <p className="oga-rpt__section-body">{section.content}</p>
            {section.data_points && section.data_points.length > 0 && (
              <div className="oga-rpt__section-dps">
                {section.data_points.map((dp) => (
                  <div key={dp.label} className="oga-rpt__section-dp">
                    <div className="oga-rpt__section-dp-label">{dp.label}</div>
                    <div className="oga-rpt__section-dp-value">{dp.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppCard>
  );
}

/* ============================================================
   Property market
   ============================================================ */
function PropertyBlock({
  data,
}: {
  data: NonNullable<AreaReport["property_data"]>;
}) {
  const yoy = data.price_change_pct;
  const yoyTone: "up" | "down" | "flat" =
    yoy === null ? "flat" : yoy > 0 ? "up" : yoy < 0 ? "down" : "flat";
  return (
    <AppCard
      title={`Property market · ${data.postcode_area}`}
      note={data.period}
    >
      <div className="oga-rpt__props">
        <PropStat label="Median price" value={formatMoney(data.median_price)} />
        <PropStat
          label="YoY"
          value={
            yoy === null ? "—" : `${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}%`
          }
          tone={yoyTone}
        />
        <PropStat
          label="Transactions"
          value={data.transaction_count.toLocaleString()}
        />
        <PropStat
          label="Tenure"
          value={`${Math.round(data.tenure_split.freehold)}% freehold`}
        />
      </div>
      {data.by_property_type.length > 0 && (
        <div className="oga-rpt__props-types">
          <div className="oga-rpt__props-types-label">By property type</div>
          <ul className="oga-rpt__props-types-list">
            {data.by_property_type.map((t) => (
              <li key={t.type} className="oga-rpt__props-types-row">
                <span className="oga-rpt__props-types-name">{t.type}</span>
                <span className="oga-rpt__props-types-count">
                  {t.count} sales
                </span>
                <span className="oga-rpt__props-types-median">
                  {formatMoney(t.median)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppCard>
  );
}

function PropStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <div className="oga-rpt__prop" data-tone={tone}>
      <div className="oga-rpt__prop-label">{label}</div>
      <div className="oga-rpt__prop-value">{value}</div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

/* ============================================================
   Schools — RAG palette preserved (Outstanding/Good/Requires/Inadequate)
   ============================================================ */
function SchoolsBlock({
  data,
}: {
  data: NonNullable<AreaReport["schools_data"]>;
}) {
  return (
    <AppCard
      title={`Nearby schools · ${data.schools.length}`}
      note={data.inspectorate}
    >
      <div className="oga-rpt__sch-breakdown">
        {Object.entries(data.rating_breakdown).map(([rating, count]) => (
          <div key={rating} className="oga-rpt__sch-box">
            <div
              className="oga-rpt__sch-rating"
              data-rating={ratingKey(rating)}
            >
              <span aria-hidden className="oga-rpt__sch-rating-dot" />
              {rating}
            </div>
            <div className="oga-rpt__sch-count">{count}</div>
          </div>
        ))}
      </div>
      <ul className="oga-rpt__sch-list">
        {data.schools.slice(0, 6).map((s, i) => (
          <li key={s.name + i} className="oga-rpt__sch-row">
            <span>
              <span className="oga-rpt__sch-name">{s.name}</span>
              <span className="oga-rpt__sch-phase">{s.phase}</span>
            </span>
            <span
              className="oga-rpt__sch-rating-chip"
              data-rating={ratingKey(s.rating)}
            >
              {s.rating}
            </span>
            <span className="oga-rpt__sch-distance">
              {s.distance_km.toFixed(1)}km
            </span>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}

function ratingKey(rating: string): string {
  const r = rating.toLowerCase();
  if (r.includes("outstanding")) return "outstanding";
  if (r.includes("good")) return "good";
  if (r.includes("requires")) return "requires";
  if (r.includes("inadequate")) return "inadequate";
  return "unknown";
}

/* ============================================================
   Recommendations
   ============================================================ */
function RecommendationsBlock({ recs }: { recs: string[] }) {
  if (!recs || recs.length === 0) return null;
  return (
    <AppCard title={`Recommendations · ${recs.length}`} noPad>
      <ol className="oga-rpt__recs">
        {recs.map((rec, i) => (
          <li key={i} className="oga-rpt__rec-row">
            <span aria-hidden className="oga-rpt__rec-num">
              {i + 1}
            </span>
            <p className="oga-rpt__rec-text">{rec}</p>
          </li>
        ))}
      </ol>
    </AppCard>
  );
}

/* ============================================================
   Metadata footer
   ============================================================ */
function MetaBlock({ report, id }: { report: AreaReport; id: string }) {
  return (
    <div className="oga-rpt__meta">
      <span>Report · {id}</span>
      {report.data_sources && report.data_sources.length > 0 && (
        <>
          <span aria-hidden className="oga-rpt__meta-sep" />
          <span>Sources · {report.data_sources.join(" · ")}</span>
        </>
      )}
      <span aria-hidden className="oga-rpt__meta-sep" />
      <span>Methodology v{report.engine_version || "—"}</span>
      <span aria-hidden className="oga-rpt__meta-sep" />
      <span>Aggregate confidence · {confDisplay(report.confidence)}</span>
      <span aria-hidden className="oga-rpt__meta-sep" />
      <span>Generated · {formatDate(report.generated_at)}</span>
    </div>
  );
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}

/* ============================================================
   Confidence helpers
   ============================================================ */
type ConfLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

function confLevel(c: number | undefined): ConfLevel | null {
  if (c === undefined || c === null || Number.isNaN(c)) return null;
  if (c >= 0.85) return "HIGH";
  if (c >= 0.6) return "MEDIUM";
  if (c >= 0.3) return "LOW";
  return "NONE";
}

function confDisplay(c: number | undefined): string {
  const lvl = confLevel(c);
  if (!lvl || c === undefined) return "—";
  return `${c.toFixed(2)} ${lvl}`;
}
