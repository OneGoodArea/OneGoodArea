"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppCard, GhostCta, appRag } from "../_shared/app-shell";
import type { AreaReport } from "@/lib/types";
import "./compare.css";

/* /compare — Brand v3 rewrite (AR-204 close-out 10/15).

   Retires per dashboard proposal: becomes part of
   /dashboard/intelligence (rank_areas builder + peers tab). This
   migration is light-touch — token swap + zero inline styles so
   the .aiq block can be stripped cleanly at the end of the sweep.
   No layout restructure since the page won't survive long. */

type Report = {
  id: string;
  area: string;
  intent: string;
  report: AreaReport;
  score: number;
  created_at: string;
};
type Summary = {
  id: string;
  area: string;
  intent: string;
  score: number;
  created_at: string;
};

export default function CompareClient({
  selected,
  all,
}: {
  selected: Report[];
  all: Summary[];
}) {
  const comparisonRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(selected.length);

  useEffect(() => {
    if (
      selected.length === 2 &&
      prevCountRef.current < 2 &&
      comparisonRef.current
    ) {
      comparisonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    prevCountRef.current = selected.length;
  }, [selected.length]);

  return (
    <AppShell
      title="Compare postcodes"
      subtitle="Select two reports to see the scores side by side. Useful for portfolio screening and site-shortlisting workflows."
      actions={<GhostCta href="/dashboard">← Dashboard</GhostCta>}
    >
      <div className="oga-compare">
        <Picker selected={selected} all={all} />
        {selected.length === 2 && (
          <div ref={comparisonRef} data-oga-comparison-anchor>
            <SideBySide a={selected[0]} b={selected[1]} />
          </div>
        )}
        {selected.length === 1 && <OneSelected report={selected[0]} />}
        {selected.length === 0 && <EmptyCompare />}
      </div>
    </AppShell>
  );
}

/* ============================================================
   Picker
   ============================================================ */
function Picker({
  selected,
  all,
}: {
  selected: Report[];
  all: Summary[];
}) {
  const router = useRouter();
  const selectedIds = new Set(selected.map((r) => r.id));
  const ready = selected.length === 2;

  function toggle(id: string) {
    const current = [...selectedIds];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length >= 2
        ? [current[1], id]
        : [...current, id];
    const qs = next.length > 0 ? `?reports=${next.join(",")}` : "";
    router.push(`/compare${qs}`);
  }

  function scrollToComparison() {
    const el = document.querySelector("[data-oga-comparison-anchor]");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppCard
      title={
        ready
          ? "Comparing 2 reports below"
          : `Select two · ${selected.length}/2 picked`
      }
      noPad
    >
      <div
        className={
          ready
            ? "oga-compare__bar oga-compare__bar--ready"
            : "oga-compare__bar"
        }
      >
        <div className="oga-compare__bar-msg">
          {ready && (
            <span aria-hidden className="oga-compare__bar-check">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 12 L10 17 L19 8"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          {ready
            ? "Ready. Scroll down to see the side-by-side."
            : "Tap a report to add or remove."}
        </div>
        <div className="oga-compare__bar-actions">
          {ready && (
            <button
              type="button"
              onClick={scrollToComparison}
              className="oga-compare__bar-jump"
            >
              See comparison
              <span aria-hidden>↓</span>
            </button>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/compare")}
              className="oga-compare__bar-clear"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {all.length === 0 ? (
        <div className="oga-compare__empty-list">
          <div className="oga-compare__empty-title">
            No reports to compare yet
          </div>
          <p className="oga-compare__empty-body">
            Generate two reports, then come back here.
          </p>
          <GhostCta href="/report">Generate a report</GhostCta>
        </div>
      ) : (
        <ul className="oga-compare__list">
          {all.map((r) => {
            const isPicked = selectedIds.has(r.id);
            const rag = appRag(r.score);
            return (
              <li key={r.id} className="oga-compare__list-item">
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={
                    isPicked
                      ? "oga-compare__row oga-compare__row--picked"
                      : "oga-compare__row"
                  }
                >
                  <span
                    aria-hidden
                    className={
                      isPicked
                        ? "oga-compare__check oga-compare__check--on"
                        : "oga-compare__check"
                    }
                  >
                    {isPicked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M5 12 L10 17 L19 8"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="oga-compare__row-area">{r.area}</span>
                  <span className="oga-compare__row-intent">{r.intent}</span>
                  <span
                    className="oga-compare__row-score"
                    style={{ color: rag.dot }}
                  >
                    {r.score}
                  </span>
                  <span className="oga-compare__row-date">
                    {formatDate(r.created_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppCard>
  );
}

/* ============================================================
   Side-by-side
   ============================================================ */
function SideBySide({ a, b }: { a: Report; b: Report }) {
  const alignedDims = alignDimensions(a, b);
  return (
    <>
      <AppCard noPad>
        <div className="oga-compare__heads">
          <CompareHead report={a} />
          <CompareHead report={b} border="left" />
        </div>
      </AppCard>

      <AppCard title="Dimension-by-dimension">
        <div className="oga-compare__dims">
          {alignedDims.map((row, i) => (
            <CompareDim key={i} row={row} />
          ))}
        </div>
      </AppCard>

      <AppCard title="Summaries">
        <div className="oga-compare__summaries">
          <SummaryCol label={a.area} text={a.report.summary} />
          <SummaryCol label={b.area} text={b.report.summary} />
        </div>
      </AppCard>
    </>
  );
}

function CompareHead({
  report,
  border,
}: {
  report: Report;
  border?: "left";
}) {
  return (
    <div
      className={
        border === "left"
          ? "oga-compare__head oga-compare__head--bordered"
          : "oga-compare__head"
      }
      data-oga-surface="dark"
    >
      <div className="oga-compare__head-text">
        <div className="oga-compare__head-intent">{report.intent}</div>
        <div className="oga-compare__head-area">{report.area}</div>
      </div>
      <div className="oga-compare__head-score">
        <div className="oga-compare__head-score-value">{report.score}</div>
        <div className="oga-compare__head-score-label">/ 100</div>
      </div>
    </div>
  );
}

function alignDimensions(a: Report, b: Report) {
  const labelsA = a.report.sub_scores.map((s) => s.label);
  const labelsB = b.report.sub_scores.map((s) => s.label);
  const allLabels = Array.from(new Set([...labelsA, ...labelsB]));
  return allLabels.map((label) => ({
    label,
    a: a.report.sub_scores.find((s) => s.label === label) || null,
    b: b.report.sub_scores.find((s) => s.label === label) || null,
  }));
}

function CompareDim({
  row,
}: {
  row: {
    label: string;
    a: AreaReport["sub_scores"][number] | null;
    b: AreaReport["sub_scores"][number] | null;
  };
}) {
  return (
    <div>
      <div className="oga-compare__dim-label">{row.label}</div>
      <div className="oga-compare__dim-bars">
        <DimBar sub={row.a} />
        <DimBar sub={row.b} />
      </div>
    </div>
  );
}

function DimBar({
  sub,
}: {
  sub: AreaReport["sub_scores"][number] | null;
}) {
  if (!sub) {
    return <div className="oga-compare__dim-empty">Not in this intent</div>;
  }
  const rag = appRag(sub.score);
  return (
    <div>
      <div className="oga-compare__dim-head">
        <span className="oga-compare__dim-weight">Weight {sub.weight}</span>
        <span className="oga-compare__dim-score" style={{ color: rag.dot }}>
          {sub.score}
        </span>
      </div>
      <div
        className="oga-compare__dim-track"
        style={{ background: rag.bg }}
      >
        <div
          className="oga-compare__dim-fill"
          style={{ width: `${sub.score}%`, background: rag.dot }}
        />
      </div>
      <p className="oga-compare__dim-summary">{sub.summary}</p>
    </div>
  );
}

function SummaryCol({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="oga-compare__summary-label">
        <span aria-hidden className="oga-compare__summary-dot" />
        {label}
      </div>
      <p className="oga-compare__summary-text">{text}</p>
    </div>
  );
}

function OneSelected({ report }: { report: Report }) {
  return (
    <AppCard>
      <div className="oga-compare__status-title">Pick one more report</div>
      <p className="oga-compare__status-body">
        <strong className="oga-compare__status-strong">{report.area}</strong>{" "}
        is waiting. Tap another report above to see the comparison.
      </p>
    </AppCard>
  );
}

function EmptyCompare() {
  return (
    <AppCard>
      <div className="oga-compare__status-title">Pick two reports</div>
      <p className="oga-compare__status-body">
        Tap any two reports in the list above. OneGoodArea will line them up
        score-by-score, dimension-by-dimension.
      </p>
    </AppCard>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
