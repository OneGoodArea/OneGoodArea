/* AR-230 (Dashboard redesign Epic AR-217): generic, typed data table primitive.

   The workhorse for every tabular dashboard surface:
   - Levers: members, bundles, presets, cohorts, ip-allowlist
   - Monitor: portfolios, changes feed
   - Webhooks list
   - Signals: ranked rank_areas results
   - Activity feed (paginated, server-sort)

   Composition model:
   - Columns are typed: ColumnDef<TRow> with a cell renderer per column.
     The primitive is fully generic — the row type flows through to
     every renderer + sort accessor + rowKey.
   - Sort: client-side by default. If the consumer passes sortState +
     onSortChange, sort becomes controlled (server-side path).
   - Pagination: not built in. Consumer renders pagination above/below
     and only passes the visible page of rows.
   - Selection: deferred — extract-on-second-use per AR-211 convention.
     The first real consumer (likely /dashboard/org/members) builds
     it inline; if a second wants it, it's extracted then.
   - Row actions: just a column with align="end" + a cell that renders
     a DropdownMenu trigger. No special "actions" API.

   Built-in states:
   - isLoading: 5 skeleton rows (or rows.length if provided, for layout
     stability on subsequent pages)
   - error: single inline row with the error string
   - empty (rows.length === 0): consumer-provided emptyState slot

   Accessibility:
   - Native <table> for semantics + screen-reader support
   - aria-sort on sortable header cells reflects asc/desc/none
   - Sortable headers are <button> children — keyboard-activatable, focus ring
   - Caption (visually hidden by default) gives the table a name
   - Loading rows are aria-hidden so screen readers don't announce skeletons

   Visual:
   - Sticky header (table sits in a scroll container; header stays put)
   - Striped rows alternate at low contrast; hover lifts to the soft-warm
     tint shared with .oga-dropdown__item + /about cards
   - Edge-lit material recipe on the container (matches .oga-btn / .oga-dropdown)
   - Dark surface variant via surface="dark"
   - Density: comfortable (default) vs compact for >100-row surfaces

   Out of scope (per Jira + plan):
   - Virtualization (paginate server-side; if a 10k-row surface shows
     up, extract <VirtualizedDataTable>)
   - Multi-column sort
   - Column resize / reorder
   - Tree rows
   - Built-in selection (extract-on-second-use)
*/

"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./data-table.css";

/* ============================================================
   Types
   ============================================================ */

export type SortDirection = "asc" | "desc";

export interface SortState {
  /** Column key currently sorted. */
  key: string;
  /** Sort direction. */
  direction: SortDirection;
}

export interface ColumnDef<TRow> {
  /** Unique column id. Doubles as default sort key. Must be stable. */
  key: string;
  /** Header cell content. ReactNode so consumers can put icons + tooltips inside. */
  header: ReactNode;
  /** Cell renderer. Receives the row + its index in the current rows array. */
  cell: (row: TRow, index: number) => ReactNode;
  /** Cell alignment. Default "start". Numbers + dates often use "end". */
  align?: "start" | "end" | "center";
  /** CSS grid-template-columns track size. Examples: "120px",
      "minmax(160px, 1fr)", "20%". Default "minmax(120px, 1fr)". */
  width?: string;
  /** Show sort affordance + handle click. Default false. */
  sortable?: boolean;
  /** Custom value used for client-side sorting. If absent, the column
      sorts by the string representation of the rendered cell. Set this
      for numeric or date columns so sort is correct. */
  sortAccessor?: (row: TRow) => string | number | Date | null | undefined;
  /** Hide this column at narrow widths. "sm" hides below ~640px,
      "md" below ~960px. Adopt sparingly — prefer denser cell content. */
  hideBelow?: "sm" | "md";
  /** Accessible header label when `header` is a non-text node (e.g.
      icon-only). Used as the aria-label on the sort button. */
  headerLabel?: string;
}

export interface DataTableProps<TRow> {
  /** Column definitions in render order. */
  columns: ColumnDef<TRow>[];
  /** Rows for the current page / view. The primitive never paginates
      or filters — consumer slices the data first. */
  rows: TRow[];
  /** Stable React key per row. Must be unique within `rows`. */
  rowKey: (row: TRow) => string;
  /** When true, body renders skeleton rows; existing rows remain in
      layout space to avoid jump. */
  isLoading?: boolean;
  /** Inline error string; replaces the body with a single-row message. */
  error?: string | null;
  /** Rendered when !isLoading && !error && rows is empty. */
  emptyState?: ReactNode;
  /** Optional row click handler. Action-column buttons should call
      stopPropagation if they shouldn't also fire this. */
  onRowClick?: (row: TRow) => void;
  /** Controlled sort. If both `sortState` AND `onSortChange` are
      provided, the primitive becomes a dumb view (server-side sort
      path). Otherwise sort is internal client-side. */
  sortState?: SortState;
  /** Fired when the user clicks a sortable header. */
  onSortChange?: (next: SortState) => void;
  /** Initial sort for the uncontrolled (client-side) case. */
  defaultSort?: SortState;
  /** Visually hidden by default; gives the table a screen-reader name. */
  caption?: string;
  /** Dark surface variant. */
  surface?: "light" | "dark";
  /** Row density. "compact" tightens vertical padding for high-count tables. */
  density?: "comfortable" | "compact";
  /** Number of skeleton rows to render while loading + no current rows. Default 5. */
  loadingRowCount?: number;
}

/* ============================================================
   Component
   ============================================================ */

export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  error = null,
  emptyState,
  onRowClick,
  sortState,
  onSortChange,
  defaultSort,
  caption,
  surface,
  density = "comfortable",
  loadingRowCount = 5,
}: DataTableProps<TRow>) {
  const isControlled = sortState !== undefined && onSortChange !== undefined;

  /* Uncontrolled sort state — only used when consumer didn't provide
     sortState + onSortChange. */
  const [internalSort, setInternalSort] = useState<SortState | undefined>(defaultSort);

  const activeSort: SortState | undefined = isControlled ? sortState : internalSort;

  const handleSortClick = useCallback(
    (key: string) => {
      const next: SortState =
        activeSort?.key === key
          ? { key, direction: activeSort.direction === "asc" ? "desc" : "asc" }
          : { key, direction: "asc" };
      if (isControlled) {
        onSortChange!(next);
      } else {
        setInternalSort(next);
      }
    },
    [activeSort, isControlled, onSortChange],
  );

  /* Sort rows when the table owns sort state. Memoised so we don't
     re-sort on every render. */
  const sortedRows = useMemo(() => {
    if (isControlled || !activeSort) return rows;
    const col = columns.find((c) => c.key === activeSort.key);
    if (!col || !col.sortable) return rows;
    const accessor = col.sortAccessor;
    const direction = activeSort.direction === "asc" ? 1 : -1;
    const indexed = rows.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => {
      const av = accessor ? accessor(a.r) : null;
      const bv = accessor ? accessor(b.r) : null;
      const cmp = compareSortValues(av, bv);
      return cmp !== 0 ? cmp * direction : a.i - b.i;
    });
    return indexed.map((x) => x.r);
  }, [rows, columns, activeSort, isControlled]);

  const gridTemplate = useMemo(
    () => columns.map((c) => c.width ?? "minmax(120px, 1fr)").join(" "),
    [columns],
  );

  const bodyState = resolveBodyState({ isLoading, error, rowCount: sortedRows.length });

  return (
    <div
      className="oga-data-table"
      data-density={density}
      data-surface={surface ?? undefined}
    >
      <div
        className="oga-data-table__scroll"
        role="region"
        aria-label={caption ?? "Data table"}
        tabIndex={0}
      >
        <table
          className="oga-data-table__table"
          style={{ "--oga-dt-cols": gridTemplate } as React.CSSProperties}
        >
          {caption ? (
            <caption className="oga-data-table__caption">{caption}</caption>
          ) : null}
          <thead className="oga-data-table__thead">
            <tr className="oga-data-table__tr">
              {columns.map((col) => (
                <HeaderCell
                  key={col.key}
                  col={col}
                  activeSort={activeSort}
                  onSortClick={handleSortClick}
                />
              ))}
            </tr>
          </thead>
          <tbody className="oga-data-table__tbody">
            {bodyState === "loading" ? (
              <LoadingRows
                columns={columns}
                count={sortedRows.length || loadingRowCount}
              />
            ) : bodyState === "error" ? (
              <MessageRow columns={columns} message={error!} variant="error" />
            ) : bodyState === "empty" ? (
              <EmptyRow columns={columns} content={emptyState} />
            ) : (
              sortedRows.map((row, i) => (
                <BodyRow
                  key={rowKey(row)}
                  row={row}
                  index={i}
                  columns={columns}
                  onRowClick={onRowClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Header cell — sortable button or static label
   ============================================================ */

interface HeaderCellProps<TRow> {
  col: ColumnDef<TRow>;
  activeSort: SortState | undefined;
  onSortClick: (key: string) => void;
}

function HeaderCell<TRow>({ col, activeSort, onSortClick }: HeaderCellProps<TRow>) {
  const isActive = activeSort?.key === col.key;
  const ariaSort: "ascending" | "descending" | "none" | undefined = col.sortable
    ? isActive
      ? activeSort!.direction === "asc"
        ? "ascending"
        : "descending"
      : "none"
    : undefined;

  return (
    <th
      className="oga-data-table__th"
      data-align={col.align ?? "start"}
      data-hide-below={col.hideBelow ?? undefined}
      aria-sort={ariaSort}
      scope="col"
    >
      {col.sortable ? (
        <button
          type="button"
          className="oga-data-table__sort-button"
          onClick={() => onSortClick(col.key)}
          aria-label={
            col.headerLabel
              ? `Sort by ${col.headerLabel}`
              : undefined
          }
        >
          <span className="oga-data-table__th-label">{col.header}</span>
          <SortIndicator state={isActive ? activeSort!.direction : undefined} />
        </button>
      ) : (
        <span className="oga-data-table__th-label">{col.header}</span>
      )}
    </th>
  );
}

/* ============================================================
   Body row — data, action, or skeleton
   ============================================================ */

interface BodyRowProps<TRow> {
  row: TRow;
  index: number;
  columns: ColumnDef<TRow>[];
  onRowClick?: (row: TRow) => void;
}

function BodyRow<TRow>({ row, index, columns, onRowClick }: BodyRowProps<TRow>) {
  /* Clicking interactive children (buttons, links) shouldn't also
     fire onRowClick — the event will have a target inside one of
     them. We let consumers handle this with stopPropagation on
     their own buttons, OR detect closest interactive parent here.
     The detect-here approach prevents the common bug where a
     dropdown trigger inside a row also navigates. */
  const handleClick = onRowClick
    ? (e: React.MouseEvent<HTMLTableRowElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, select, textarea, [role='button']")) {
          return;
        }
        onRowClick(row);
      }
    : undefined;

  return (
    <tr
      className="oga-data-table__tr"
      data-interactive={onRowClick ? "true" : undefined}
      onClick={handleClick}
    >
      {columns.map((col) => (
        <td
          key={col.key}
          className="oga-data-table__td"
          data-align={col.align ?? "start"}
          data-hide-below={col.hideBelow ?? undefined}
        >
          {col.cell(row, index)}
        </td>
      ))}
    </tr>
  );
}

interface LoadingRowsProps<TRow> {
  columns: ColumnDef<TRow>[];
  count: number;
}

function LoadingRows<TRow>({ columns, count }: LoadingRowsProps<TRow>) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={`skeleton-${rowIdx}`} className="oga-data-table__tr" aria-hidden="true">
          {columns.map((col) => (
            <td
              key={col.key}
              className="oga-data-table__td"
              data-align={col.align ?? "start"}
              data-hide-below={col.hideBelow ?? undefined}
            >
              <span className="oga-data-table__skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface EmptyRowProps<TRow> {
  columns: ColumnDef<TRow>[];
  content: ReactNode;
}

function EmptyRow<TRow>({ columns, content }: EmptyRowProps<TRow>) {
  return (
    <tr className="oga-data-table__tr oga-data-table__tr--empty">
      <td colSpan={columns.length} className="oga-data-table__td-message">
        {content ?? <DefaultEmptyState />}
      </td>
    </tr>
  );
}

interface MessageRowProps<TRow> {
  columns: ColumnDef<TRow>[];
  message: string;
  variant: "error";
}

function MessageRow<TRow>({ columns, message, variant }: MessageRowProps<TRow>) {
  return (
    <tr className="oga-data-table__tr oga-data-table__tr--message">
      <td
        colSpan={columns.length}
        className="oga-data-table__td-message"
        data-variant={variant}
        role="alert"
      >
        {message}
      </td>
    </tr>
  );
}

function DefaultEmptyState() {
  return (
    <div className="oga-data-table__empty-default">
      <p className="oga-data-table__empty-title">No results</p>
      <p className="oga-data-table__empty-body">
        Adjust your filter or come back when there&apos;s new data.
      </p>
    </div>
  );
}

/* ============================================================
   Sort indicator — small chevron pair, active arrow lit
   ============================================================ */

interface SortIndicatorProps {
  state: SortDirection | undefined;
}

function SortIndicator({ state }: SortIndicatorProps) {
  return (
    <span
      className="oga-data-table__sort-indicator"
      data-state={state ?? "none"}
      aria-hidden="true"
    >
      <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
        <path
          d="M4 0.5L7 4H1L4 0.5z"
          fill="currentColor"
          className="oga-data-table__sort-up"
        />
        <path
          d="M4 9.5L1 6H7L4 9.5z"
          fill="currentColor"
          className="oga-data-table__sort-down"
        />
      </svg>
    </span>
  );
}

/* ============================================================
   Helpers
   ============================================================ */

type BodyState = "loading" | "error" | "empty" | "rows";

function resolveBodyState({
  isLoading,
  error,
  rowCount,
}: {
  isLoading: boolean;
  error: string | null;
  rowCount: number;
}): BodyState {
  if (isLoading) return "loading";
  if (error) return "error";
  if (rowCount === 0) return "empty";
  return "rows";
}

/* Compare two sort values. Nulls + undefineds sort to the bottom in
   asc and to the top in desc (we apply the direction multiplier in
   the caller, so here null is just "always greater" — which lands at
   the bottom for asc). */
function compareSortValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  const aVal = a instanceof Date ? a.getTime() : a;
  const bVal = b instanceof Date ? b.getTime() : b;

  if (typeof aVal === "number" && typeof bVal === "number") {
    return aVal - bVal;
  }
  return String(aVal).localeCompare(String(bVal));
}
