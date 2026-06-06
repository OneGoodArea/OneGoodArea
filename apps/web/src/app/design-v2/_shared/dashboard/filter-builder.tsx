/* AR-244 (Dashboard redesign Epic AR-217 — Phase 0.5): compound rank_areas filter builder.

   Bespoke primitive. Only consumer is the Signals playground
   cross-area mode at /dashboard/signals (Phase 2 — AR-217-C1).
   Iteration expected when the real consumer wires it into the live
   /v1/signals catalog + /v1/areas response.

   Implements the compound rank_areas grammar per ADR 0019:
   - signals[] array of filter clauses
   - Each clause: signal_key + operator (gt/gte/lt/lte/eq) + value
   - AND semantics across rows (no OR in v1)
   - sort_by must be a signal_key that appears in the clauses
     (validated client-side; the API also enforces)

   Composition model:
   - Fully controlled. Consumer owns the FilterClause[] array via
     value + onChange. Sort state similarly controlled.
   - Reuses existing primitives:
     - <Select> (from FormGroup) for signal + operator + sort
       dropdowns
     - <Input> (from FormGroup) for the numeric value field
     - <DropdownMenu> for the row-action menu (delete)
   - Renders stacked rows with mono caps "AND" dividers between,
     a "+ AND" add-row button below, then a SORT BY section with
     signal picker + direction.
   - Catalog grouping: signals[] grouped by category via <optgroup>
     in the picker. Categories render in their source order.

   Brand v3 visual:
   - Outer container shares the warm-white gradient + edge-lit
     material recipe used by DataTable + EmptyState light
   - Section dividers (WHERE / SORT BY) in mono caps eyebrow at
     0.14em letter-spacing
   - Hairline AND divider between clause rows
   - Soft-warm hover on the add-row + remove-row affordances
   - Light + dark surface variants

   Out of scope (per Jira):
   - OR semantics (AND only across rows for v1)
   - Nested clauses / parentheses
   - Multi-value operators (in, between)
   - Free-text fuzzy signal search */

"use client";

import { useId, useMemo } from "react";
import { Input } from "./form-group";
import { DropdownMenu, type DropdownEntry } from "./dropdown-menu";
import "./filter-builder.css";

/* ============================================================
   Types
   ============================================================ */

export type FilterOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export interface FilterSignal {
  /** Programmatic key (e.g. "deprivation.imd_decile"). */
  key: string;
  /** Display label (e.g. "IMD decile"). */
  label: string;
  /** Category for grouping in the picker (e.g. "Deprivation"). */
  category: string;
  /** Optional unit hint shown next to the value input (e.g. "%", "£"). */
  unit?: string;
}

export interface FilterClause {
  /** Reference to a signal in the catalog. */
  signalKey: string;
  /** Comparison operator. */
  operator: FilterOperator;
  /** Numeric threshold. */
  value: number;
}

export type FilterSortOrder = "asc" | "desc";

export interface FilterBuilderProps {
  /** Available signals (consumer fetches from /v1/signals or similar). */
  signals: FilterSignal[];
  /** Current filter state (controlled). */
  value: FilterClause[];
  /** Fired with the new clause array on add/remove/change. */
  onChange: (next: FilterClause[]) => void;
  /** Optional sort signal key. Must reference a signal present in
      `value` (per ADR 0019); if it doesn't, the sort selector treats
      it as "none" until the consumer corrects it. */
  sortBy?: string;
  /** Fired when the sort signal changes. */
  onSortByChange?: (signalKey: string | undefined) => void;
  /** Sort direction. Default "asc". */
  sortOrder?: FilterSortOrder;
  /** Fired when the sort direction changes. */
  onSortOrderChange?: (order: FilterSortOrder) => void;
  /** Surface variant. Default "light". */
  surface?: "light" | "dark";
}

/* ============================================================
   Constants
   ============================================================ */

const OPERATOR_OPTIONS: Array<{ value: FilterOperator; label: string }> = [
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "eq", label: "Equal to" },
];

/* ============================================================
   Component
   ============================================================ */

export function FilterBuilder({
  signals,
  value,
  onChange,
  sortBy,
  onSortByChange,
  sortOrder = "asc",
  onSortOrderChange,
  surface = "light",
}: FilterBuilderProps) {
  const idBase = useId();

  /* Group catalog by category so the picker renders grouped sections. */
  const grouped = useMemo(() => groupByCategory(signals), [signals]);

  /* Validate sort-by against the current clauses (ADR 0019: sort_by
     must reference a signal present in `signals[]` of the query).
     If the consumer's sortBy doesn't appear, treat it as cleared so
     the UI doesn't show a stale selection. */
  const clauseSignalKeys = useMemo(
    () => value.map((c) => c.signalKey),
    [value],
  );
  const sortByIsValid = sortBy ? clauseSignalKeys.includes(sortBy) : false;
  const resolvedSortBy = sortByIsValid && sortBy ? sortBy : "";

  /* ---------- Clause mutations ---------- */

  function handleAddClause() {
    /* Pick the first signal NOT already used; fall back to the first
       signal in the catalog if all are used (edge case — consumer
       can prevent this by capping clauses to signals.length). */
    const usedKeys = new Set(clauseSignalKeys);
    const candidate = signals.find((s) => !usedKeys.has(s.key)) ?? signals[0];
    if (!candidate) return;
    const next: FilterClause = {
      signalKey: candidate.key,
      operator: "gt",
      value: 0,
    };
    onChange([...value, next]);
  }

  function handleRemoveClause(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    /* If the sort-by referenced the removed clause, clear it. */
    if (sortBy && next.find((c) => c.signalKey === sortBy) === undefined) {
      onSortByChange?.(undefined);
    }
  }

  function handleClauseChange(index: number, patch: Partial<FilterClause>) {
    const next = value.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  }

  const canAddRow = value.length < signals.length;

  return (
    <div
      className="oga-filter-builder"
      data-surface={surface}
      /* Also surface the dark context as data-oga-surface so the
         descendant FormGroup CSS picks up its dark variant for
         Inputs + Selects. Same pattern CodeBlock uses for
         .oga-verb--{verb} brightening. */
      data-oga-surface={surface === "dark" ? "dark" : undefined}
    >
      {/* ---------- WHERE section ---------- */}
      <div className="oga-filter-builder__section">
        <div className="oga-filter-builder__section-label">Where</div>

        {value.length === 0 ? (
          <p className="oga-filter-builder__empty">
            No filters yet. Click <strong>+ Add condition</strong> to add the
            first AND clause.
          </p>
        ) : (
          <ul className="oga-filter-builder__clauses">
            {value.map((clause, i) => {
              const signal = signals.find((s) => s.key === clause.signalKey);
              const usedByOthers = new Set(
                value
                  .filter((_, j) => j !== i)
                  .map((c) => c.signalKey),
              );
              return (
                <li key={i} className="oga-filter-builder__clause">
                  {i > 0 ? (
                    <div className="oga-filter-builder__and-divider">
                      <span className="oga-filter-builder__and-line" aria-hidden />
                      <span className="oga-filter-builder__and-label">AND</span>
                      <span className="oga-filter-builder__and-line" aria-hidden />
                    </div>
                  ) : null}
                  <div className="oga-filter-builder__row">
                    <SignalPicker
                      grouped={grouped}
                      selectedKey={clause.signalKey}
                      usedByOthers={usedByOthers}
                      onSelect={(key) => handleClauseChange(i, { signalKey: key })}
                      ariaLabel={`Clause ${i + 1} signal`}
                    />

                    <OperatorPicker
                      selected={clause.operator}
                      onSelect={(op) => handleClauseChange(i, { operator: op })}
                      ariaLabel={`Clause ${i + 1} operator`}
                    />

                    <div className="oga-filter-builder__value-wrap">
                      <Input
                        id={`${idBase}-value-${i}`}
                        type="number"
                        value={clause.value}
                        onChange={(e) =>
                          handleClauseChange(i, {
                            value: Number(e.target.value),
                          })
                        }
                        aria-label={`Clause ${i + 1} value`}
                      />
                      {signal?.unit ? (
                        <span
                          className="oga-filter-builder__unit"
                          aria-hidden="true"
                        >
                          {signal.unit}
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="oga-filter-builder__remove"
                      onClick={() => handleRemoveClause(i)}
                      aria-label={`Remove clause ${i + 1}`}
                    >
                      <RemoveGlyph />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="oga-filter-builder__add"
          onClick={handleAddClause}
          disabled={!canAddRow}
        >
          <span aria-hidden className="oga-filter-builder__add-plus">+</span>
          Add condition
        </button>
      </div>

      {/* ---------- SORT BY section ---------- */}
      <div className="oga-filter-builder__section">
        <div className="oga-filter-builder__section-label">Sort by</div>
        {value.length === 0 ? (
          <p className="oga-filter-builder__empty">
            Add at least one filter clause to enable sorting.
          </p>
        ) : (
          <div className="oga-filter-builder__sort-row">
            <SortByPicker
              signals={signals}
              clauses={value}
              selectedKey={resolvedSortBy}
              onSelect={(key) => onSortByChange?.(key)}
              ariaLabel="Sort signal"
            />

            <SortOrderPicker
              selected={sortOrder}
              disabled={!resolvedSortBy}
              onSelect={(order) => onSortOrderChange?.(order)}
              ariaLabel="Sort direction"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */

function groupByCategory(signals: FilterSignal[]): Array<{
  category: string;
  items: FilterSignal[];
}> {
  const byCategory = new Map<string, FilterSignal[]>();
  for (const s of signals) {
    const list = byCategory.get(s.category);
    if (list) {
      list.push(s);
    } else {
      byCategory.set(s.category, [s]);
    }
  }
  return Array.from(byCategory.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

function RemoveGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 3l6 6M9 3l-6 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================
   Pickers — DropdownMenu-backed select replacements
   ============================================================
   Native <select> popups render with OS-default colours and
   typography, which can never match Brand v3. These wrappers use
   <DropdownMenu> instead — the popup picks up the full editorial
   vocabulary (warm-white/graphite gradient, edge-lit material,
   soft-warm hover, Geist typography, hairline dividers, optional
   eyebrow header). */

interface SignalPickerProps {
  grouped: Array<{ category: string; items: FilterSignal[] }>;
  selectedKey: string;
  usedByOthers: Set<string>;
  onSelect: (key: string) => void;
  ariaLabel: string;
}

function SignalPicker({
  grouped,
  selectedKey,
  usedByOthers,
  onSelect,
  ariaLabel,
}: SignalPickerProps) {
  const selected = grouped.flatMap((g) => g.items).find((s) => s.key === selectedKey);

  const entries: DropdownEntry[] = [];
  grouped.forEach((group, gi) => {
    if (gi > 0) entries.push({ divider: true, label: group.category });
    else entries.push({ divider: true, label: group.category });
    group.items.forEach((s) => {
      entries.push({
        label: s.label,
        onClick: () => onSelect(s.key),
        disabled: usedByOthers.has(s.key) && s.key !== selectedKey,
      });
    });
  });

  return (
    <DropdownMenu
      trigger={
        <span className="oga-filter-builder__picker-trigger-content">
          <span className="oga-filter-builder__picker-trigger-label">
            {selected?.label ?? "Select a signal"}
          </span>
          <ChevronDown />
        </span>
      }
      triggerLabel={ariaLabel}
      triggerClassName="oga-filter-builder__picker-trigger"
      items={entries}
    />
  );
}

interface OperatorPickerProps {
  selected: FilterOperator;
  onSelect: (op: FilterOperator) => void;
  ariaLabel: string;
}

function OperatorPicker({ selected, onSelect, ariaLabel }: OperatorPickerProps) {
  const selectedLabel = OPERATOR_OPTIONS.find((op) => op.value === selected)?.label ?? "";

  return (
    <DropdownMenu
      trigger={
        <span className="oga-filter-builder__picker-trigger-content">
          <span className="oga-filter-builder__picker-trigger-label">
            {selectedLabel}
          </span>
          <ChevronDown />
        </span>
      }
      triggerLabel={ariaLabel}
      triggerClassName="oga-filter-builder__picker-trigger"
      items={OPERATOR_OPTIONS.map((op) => ({
        label: op.label,
        onClick: () => onSelect(op.value),
      }))}
    />
  );
}

interface SortByPickerProps {
  signals: FilterSignal[];
  clauses: FilterClause[];
  selectedKey: string;
  onSelect: (key: string | undefined) => void;
  ariaLabel: string;
}

function SortByPicker({
  signals,
  clauses,
  selectedKey,
  onSelect,
  ariaLabel,
}: SortByPickerProps) {
  const selected = signals.find((s) => s.key === selectedKey);
  const label = selected?.label ?? "— No sort —";

  const entries: DropdownEntry[] = [
    { label: "— No sort —", onClick: () => onSelect(undefined) },
  ];
  if (clauses.length > 0) {
    entries.push({ divider: true, label: "Sort by signal" });
    clauses.forEach((clause) => {
      const s = signals.find((sig) => sig.key === clause.signalKey);
      if (!s) return;
      entries.push({
        label: s.label,
        onClick: () => onSelect(clause.signalKey),
      });
    });
  }

  return (
    <DropdownMenu
      trigger={
        <span className="oga-filter-builder__picker-trigger-content">
          <span className="oga-filter-builder__picker-trigger-label">{label}</span>
          <ChevronDown />
        </span>
      }
      triggerLabel={ariaLabel}
      triggerClassName="oga-filter-builder__picker-trigger"
      items={entries}
    />
  );
}

interface SortOrderPickerProps {
  selected: FilterSortOrder;
  disabled: boolean;
  onSelect: (order: FilterSortOrder) => void;
  ariaLabel: string;
}

function SortOrderPicker({
  selected,
  disabled,
  onSelect,
  ariaLabel,
}: SortOrderPickerProps) {
  const label = selected === "asc" ? "Ascending" : "Descending";

  if (disabled) {
    return (
      <button
        type="button"
        className="oga-filter-builder__picker-trigger"
        disabled
        aria-label={ariaLabel}
      >
        <span className="oga-filter-builder__picker-trigger-content">
          <span className="oga-filter-builder__picker-trigger-label">{label}</span>
          <ChevronDown />
        </span>
      </button>
    );
  }

  return (
    <DropdownMenu
      trigger={
        <span className="oga-filter-builder__picker-trigger-content">
          <span className="oga-filter-builder__picker-trigger-label">{label}</span>
          <ChevronDown />
        </span>
      }
      triggerLabel={ariaLabel}
      triggerClassName="oga-filter-builder__picker-trigger"
      items={[
        { label: "Ascending", onClick: () => onSelect("asc") },
        { label: "Descending", onClick: () => onSelect("desc") },
      ]}
    />
  );
}
