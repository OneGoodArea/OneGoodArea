/* AR-242 (Dashboard redesign Epic AR-217 — Phase 0.5): pagination primitive.

   Two pagination flavours in one primitive — consumers pick via the
   `mode` discriminator. No client-side pagination logic: the primitive
   renders controls only, the consumer slices its data.

   - **cursor** mode: Prev / Next buttons + optional indicator label.
     Use for cursor-based APIs (Activity feed per ADR 0024, OpenAPI
     listings, anything backed by `?after=cursor`/`?before=cursor`).
     The consumer drives `hasPrev` / `hasNext` from the API response.
   - **page** mode: numbered pages with ellipsis truncation for long
     ranges, plus prev/next arrows. Use for offset-based APIs where
     the total page count is known (Monitor changes feed, exports
     list, etc.).

   2-3 immediate Phase 1-5 consumers. Composes ABOVE/BELOW
   <DataTable> (DataTable deliberately doesn't bake pagination in —
   the model differs per consumer).

   Brand v3 visual vocabulary: mono caps labels (matching the rest
   of the dashboard editorial typography), soft-warm hover signature
   on inactive controls (shared with .oga-dropdown__item + DataTable
   row hover + .oga-tabs__tab hover), inverted ink-filled background
   on the active page (page mode only). Light + dark surface variants.

   Keyboard accessible: every control is a native <button>; focus-
   visible outlines per the project standard; Enter + Space activate
   per HTML default. */

"use client";

import type { ReactNode } from "react";
import "./pagination.css";

/* ============================================================
   Types
   ============================================================ */

export type PaginationMode = "cursor" | "page";

interface PaginationBaseProps {
  /** Surface variant. Default "light". */
  surface?: "light" | "dark";
  /** Accessible label for the <nav>. Defaults to "Pagination". */
  "aria-label"?: string;
}

export interface CursorPaginationProps extends PaginationBaseProps {
  mode: "cursor";
  /** Whether a previous page exists. Drives the Prev button's
      disabled state. */
  hasPrev: boolean;
  /** Whether a next page exists. */
  hasNext: boolean;
  /** Fired when the user clicks Prev. */
  onPrev: () => void;
  /** Fired when the user clicks Next. */
  onNext: () => void;
  /** Optional indicator rendered between the buttons (e.g. "Showing
      events 11-20" or a date range). Pass any ReactNode. */
  indicator?: ReactNode;
  /** Custom button labels. Defaults to "Newer" / "Older" which read
      well for activity feeds; consumers showing chronological list
      views may prefer "Prev" / "Next". */
  prevLabel?: string;
  nextLabel?: string;
}

export interface PagePaginationProps extends PaginationBaseProps {
  mode: "page";
  /** Current page (1-indexed). */
  page: number;
  /** Total pages. Must be >= 1. */
  totalPages: number;
  /** Fired with the new page when the user navigates. The consumer
      handles bounds clamping if needed. */
  onChange: (page: number) => void;
}

export type PaginationProps = CursorPaginationProps | PagePaginationProps;

/* ============================================================
   Component
   ============================================================ */

export function Pagination(props: PaginationProps) {
  const ariaLabel = props["aria-label"] ?? "Pagination";
  return (
    <nav
      className="oga-pagination"
      data-mode={props.mode}
      data-surface={props.surface ?? "light"}
      aria-label={ariaLabel}
    >
      {props.mode === "cursor" ? (
        <CursorControls {...props} />
      ) : (
        <PageControls {...props} />
      )}
    </nav>
  );
}

/* ============================================================
   Cursor mode
   ============================================================ */

function CursorControls({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  indicator,
  prevLabel = "Newer",
  nextLabel = "Older",
}: CursorPaginationProps) {
  return (
    <>
      <button
        type="button"
        className="oga-pagination__btn oga-pagination__btn--arrow"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label={`${prevLabel} page`}
      >
        <span aria-hidden className="oga-pagination__arrow">←</span>
        <span>{prevLabel}</span>
      </button>

      {indicator ? (
        <span className="oga-pagination__indicator">{indicator}</span>
      ) : null}

      <button
        type="button"
        className="oga-pagination__btn oga-pagination__btn--arrow"
        onClick={onNext}
        disabled={!hasNext}
        aria-label={`${nextLabel} page`}
      >
        <span>{nextLabel}</span>
        <span aria-hidden className="oga-pagination__arrow">→</span>
      </button>
    </>
  );
}

/* ============================================================
   Page mode
   ============================================================ */

function PageControls({ page, totalPages, onChange }: PagePaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(safeTotal, Math.max(1, page));
  const range = getPageRange(safePage, safeTotal);
  const canPrev = safePage > 1;
  const canNext = safePage < safeTotal;

  return (
    <>
      <button
        type="button"
        className="oga-pagination__btn oga-pagination__btn--arrow"
        onClick={() => onChange(safePage - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
      >
        <span aria-hidden className="oga-pagination__arrow">←</span>
        <span>Prev</span>
      </button>

      <ol className="oga-pagination__pages">
        {range.map((entry, i) =>
          entry === "ellipsis" ? (
            <li
              key={`ellipsis-${i}`}
              className="oga-pagination__ellipsis"
              aria-hidden="true"
            >
              …
            </li>
          ) : (
            <li key={`page-${entry}`}>
              <button
                type="button"
                className="oga-pagination__page"
                data-active={entry === safePage ? "true" : undefined}
                onClick={() => onChange(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === safePage ? "page" : undefined}
              >
                {entry}
              </button>
            </li>
          ),
        )}
      </ol>

      <button
        type="button"
        className="oga-pagination__btn oga-pagination__btn--arrow"
        onClick={() => onChange(safePage + 1)}
        disabled={!canNext}
        aria-label="Next page"
      >
        <span>Next</span>
        <span aria-hidden className="oga-pagination__arrow">→</span>
      </button>
    </>
  );
}

/* ============================================================
   Page-range computation
   ============================================================
   For long ranges (>7 pages), collapse to: [1, ..., current-1,
   current, current+1, ..., last]. Always shows first + last so
   navigation to the extremes is one click. Ellipsis fills the
   gaps. Adjacent pages around the current page provide context. */

export function getPageRange(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const range: Array<number | "ellipsis"> = [1];

  if (current > 3) range.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  if (current < totalPages - 2) range.push("ellipsis");

  range.push(totalPages);
  return range;
}
