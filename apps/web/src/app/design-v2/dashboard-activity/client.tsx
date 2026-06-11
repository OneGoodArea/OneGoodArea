"use client";

/* AR-257 [AR-217] /dashboard/activity client.

   Renders the user's activity events newest-first. Fetches
   /api/me/activity (web BFF proxy to apps/api GET /me/activity).
   Pagination via prev/next chips driven by total + page_size in the
   response. Empty state when the user has never made a call.

   Event vocabulary: a small label registry maps the dotted event
   names emitted by trackEvent() ("api.score.computed",
   "api.report.generated", ...) to short human-readable labels.
   Unknown event names fall through as the raw dotted string so the
   feed never hides an event we forgot to add to the registry. */

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../_shared/app-shell";
import "./client.css";

interface ActivityEvent {
  id: string;
  user_id: string | null;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActivityResponse {
  events: ActivityEvent[];
  total: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 20;

/* Event label registry. Add a row here when trackEvent() gets a new
   event name and you want a non-default label. */
const EVENT_LABELS: Record<string, string> = {
  "api.score.computed": "Scored an area",
  "api.area.profiled": "Profiled an area",
  "api.report.generated": "Generated a report",
  "api.signals.category": "Read a signal category",
  "api.areas.queried": "Queried areas",
  "api.portfolio.created": "Created a portfolio",
  "api.portfolio.areas_added": "Added areas to a portfolio",
  "api.portfolio.enriched": "Enriched a portfolio",
  "api.portfolio.changes_checked": "Checked portfolio changes",
  "api.org.created": "Created an organisation",
};

function labelFor(event: string): string {
  return EVENT_LABELS[event] ?? event;
}

export default function ActivityClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

/* Brand mark for the activity product header. Reuses the exact "read"
   path data from NavIconDark (the sidebar's Recent activity glyph) at
   product-mark scale so the two surfaces line up visually. */
function ActivityMark() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7 L14 9 L24 7 V22 L14 20 L4 22 Z" />
      <path d="M14 9 V20" />
    </svg>
  );
}

function Body() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/me/activity?page=${p}&page_size=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError("Couldn't load activity. Try again in a moment.");
        return;
      }
      const json = (await res.json()) as ActivityResponse;
      setData(json);
    } catch {
      setError("Network error. Retry shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       fetchPage's first synchronous step is setLoading(true) to drive
       the skeleton state. That's the intended pattern for a paginated
       data fetch on mount + on page change. */
    fetchPage(page);
  }, [page, fetchPage]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const canPrev = page > 1;
  const canNext = data ? page < totalPages : false;

  return (
    <div className="oga-activity">
      <header className="oga-activity__product">
        <span className="oga-activity__product-mark" aria-hidden>
          <ActivityMark />
        </span>
        <div className="oga-activity__product-text">
          <span className="oga-activity__product-eyebrow">Activity</span>
          <h2 className="oga-activity__product-title">Recent activity</h2>
          <p className="oga-activity__product-tagline">
            Every API call, every change. Newest first. Each row links to the
            event metadata your code received.
          </p>
        </div>
      </header>

      {loading && !data ? <SkeletonList /> : null}

      {!loading && error ? (
        <div className="oga-activity__error" role="alert">
          {error}
        </div>
      ) : null}

      {data && !error ? (
        data.events.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ul className="oga-activity__list">
              {data.events.map((e) => (
                <li key={e.id} className="oga-activity__row">
                  <EventRow event={e} />
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="oga-activity__pagination">
                <span className="oga-activity__count">
                  Page {page} of {totalPages} · {data.total.toLocaleString()}{" "}
                  total
                </span>
                <div className="oga-activity__paginator">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={!canPrev}
                    className="oga-activity__page-btn"
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={!canNext}
                    className="oga-activity__page-btn"
                  >
                    Next →
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const label = labelFor(event.event);
  const ago = formatAgo(event.created_at);
  const meta = summariseMetadata(event.metadata);

  return (
    <>
      <span className="oga-activity__dot" aria-hidden />
      <div className="oga-activity__body">
        <span className="oga-activity__label">{label}</span>
        {meta ? <span className="oga-activity__meta">{meta}</span> : null}
        <code className="oga-activity__event-code">{event.event}</code>
      </div>
      <span className="oga-activity__when">{ago}</span>
    </>
  );
}

function EmptyState() {
  return (
    <div className="oga-activity__empty">
      <p>No activity yet. Every API call lands here.</p>
      <p className="oga-activity__empty-hint">
        Drop the curl example from your dashboard into your shell to see your
        first event.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="oga-activity__list oga-activity__list--loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="oga-activity__row oga-activity__row--skeleton"
          aria-hidden
        >
          <span className="oga-activity__dot oga-activity__dot--skeleton" />
          <div className="oga-activity__body">
            <span className="oga-activity__skeleton oga-activity__skeleton--label" />
            <span className="oga-activity__skeleton oga-activity__skeleton--meta" />
          </div>
          <span className="oga-activity__skeleton oga-activity__skeleton--when" />
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   Metadata summary: pick a few common, useful fields off the
   event.metadata blob and render them as a single editorial line.
   Falls back to nothing when no recognised field is present.
   ============================================================ */
function summariseMetadata(metadata: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const get = (k: string): string | null => {
    const v = metadata[k];
    return typeof v === "string" || typeof v === "number" ? String(v) : null;
  };

  const area = get("area");
  if (area) parts.push(area);

  const postcode = get("postcode");
  if (postcode) parts.push(postcode);

  const preset = get("preset") ?? get("intent");
  if (preset) parts.push(`preset=${preset}`);

  const score = get("score");
  if (score) parts.push(`score ${score}`);

  const portfolioId = get("portfolioId");
  if (portfolioId) parts.push(`portfolio ${portfolioId.slice(0, 10)}`);

  const orgId = get("orgId");
  if (orgId) parts.push(`org ${orgId.slice(0, 10)}`);

  const source = get("source");
  if (source) parts.push(source);

  return parts.length > 0 ? parts.join(" · ") : null;
}

/* Compact relative-time formatter, lifted from the dashboard Home
   client. Local-only, no library. Static snapshot at render time
   (the page re-renders on pagination so freshness isn't an issue). */
function formatAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return `${diffWk}w ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}
