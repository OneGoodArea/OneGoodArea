// @vitest-environment jsdom

/* AR-244: Component tests for <FilterBuilder>. Covers controlled
   state, add/remove/change of clauses, sort-by validation against
   ADR 0019 (sort_by must reference a signal present in the
   clauses), and surface variants. */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FilterBuilder,
  type FilterSignal,
  type FilterClause,
} from "@/app/design-v2/_shared/dashboard/filter-builder";

const SIGNALS: FilterSignal[] = [
  { key: "deprivation.imd_decile", label: "IMD decile", category: "Deprivation" },
  { key: "deprivation.income_score", label: "Income score", category: "Deprivation" },
  { key: "property.median_price", label: "Median price", category: "Property", unit: "£" },
  { key: "property.price_change_pct_yoy", label: "YoY change", category: "Property", unit: "%" },
  { key: "crime.total_12m_percentile", label: "Crime percentile", category: "Crime" },
];

describe("<FilterBuilder> (AR-244)", () => {
  it("renders both section labels (Where / Sort by)", () => {
    render(
      <FilterBuilder signals={SIGNALS} value={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Where")).toBeInTheDocument();
    expect(screen.getByText("Sort by")).toBeInTheDocument();
  });

  it("shows empty-state copy when no clauses are present", () => {
    render(
      <FilterBuilder signals={SIGNALS} value={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/No filters yet/)).toBeInTheDocument();
    expect(screen.getByText(/Add at least one filter clause/)).toBeInTheDocument();
  });

  it("fires onChange with a new clause when 'Add condition' is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterBuilder signals={SIGNALS} value={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: /Add condition/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as FilterClause[];
    expect(next).toHaveLength(1);
    expect(next[0].signalKey).toBe(SIGNALS[0].key);
    expect(next[0].operator).toBe("gt");
    expect(next[0].value).toBe(0);
  });

  it("picks the next unused signal when adding a clause", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const existing: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={existing} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: /Add condition/i }));
    const next = onChange.mock.calls[0][0] as FilterClause[];
    expect(next).toHaveLength(2);
    /* Second clause picks the first signal NOT already used. */
    expect(next[1].signalKey).toBe(SIGNALS[1].key);
  });

  it("disables 'Add condition' when every signal is already in use", () => {
    const allUsed: FilterClause[] = SIGNALS.map((s) => ({
      signalKey: s.key,
      operator: "gt",
      value: 0,
    }));
    render(
      <FilterBuilder signals={SIGNALS} value={allUsed} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Add condition/i })).toBeDisabled();
  });

  it("renders one row per clause with signal + operator + value pickers", () => {
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
      { signalKey: SIGNALS[2].key, operator: "lt", value: 250000 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={vi.fn()} />,
    );
    /* Picker triggers are buttons with aria-label per clause. Each
       trigger's visible content is the currently selected label. */
    expect(screen.getByLabelText("Clause 1 signal")).toHaveTextContent(SIGNALS[0].label);
    expect(screen.getByLabelText("Clause 1 operator")).toHaveTextContent("Greater than");
    expect(screen.getByLabelText("Clause 2 signal")).toHaveTextContent(SIGNALS[2].label);
    expect(screen.getByLabelText("Clause 2 operator")).toHaveTextContent("Less than");
  });

  it("fires onChange with the updated operator when picked from the dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={onChange} />,
    );
    /* Open the operator picker by clicking the trigger button. */
    await user.click(screen.getByLabelText("Clause 1 operator"));
    /* Click the "Less than or equal" option in the now-open dropdown. */
    await user.click(screen.getByRole("menuitem", { name: "Less than or equal" }));

    const next = onChange.mock.calls[0][0] as FilterClause[];
    expect(next[0].operator).toBe("lte");
    expect(next[0].signalKey).toBe(SIGNALS[0].key);
    expect(next[0].value).toBe(5);
  });

  it("fires onChange with the new value (as a number) when the value input changes", () => {
    const onChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 0 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Clause 1 value"), {
      target: { value: "42" },
    });
    const next = onChange.mock.calls[0][0] as FilterClause[];
    expect(next[0].value).toBe(42);
    expect(typeof next[0].value).toBe("number");
  });

  it("fires onChange (removing the clause) when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
      { signalKey: SIGNALS[2].key, operator: "lt", value: 250000 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: /Remove clause 1/i }));
    const next = onChange.mock.calls[0][0] as FilterClause[];
    expect(next).toHaveLength(1);
    expect(next[0].signalKey).toBe(SIGNALS[2].key);
  });

  it("clears sortBy if the removed clause was the sort signal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSortByChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={onChange}
        sortBy={SIGNALS[0].key}
        onSortByChange={onSortByChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Remove clause 1/i }));
    expect(onSortByChange).toHaveBeenCalledWith(undefined);
  });

  it("renders the unit hint inside the value cell when the signal has one", () => {
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[2].key, operator: "lt", value: 250000 },
    ];
    const { container } = render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={vi.fn()} />,
    );
    expect(container.querySelector(".oga-filter-builder__unit")).toHaveTextContent("£");
  });

  it("offers sort options drawn from clauses present in value (ADR 0019)", async () => {
    const user = userEvent.setup();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
      { signalKey: SIGNALS[2].key, operator: "lt", value: 250000 },
    ];
    render(
      <FilterBuilder signals={SIGNALS} value={clauses} onChange={vi.fn()} />,
    );
    /* Open the sort picker. */
    await user.click(screen.getByLabelText("Sort signal"));
    /* Both clause signal labels appear as menu items. */
    expect(screen.getByRole("menuitem", { name: SIGNALS[0].label })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: SIGNALS[2].label })).toBeInTheDocument();
    /* The "— No sort —" sentinel is always present. */
    expect(screen.getByRole("menuitem", { name: /No sort/ })).toBeInTheDocument();
    /* Non-clause signals do NOT appear. */
    expect(screen.queryByRole("menuitem", { name: SIGNALS[1].label })).not.toBeInTheDocument();
  });

  it("treats sortBy as cleared when it doesn't reference a clause signal", () => {
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={vi.fn()}
        sortBy={SIGNALS[3].key /* not present in clauses */}
        onSortByChange={vi.fn()}
      />,
    );
    /* When sortBy doesn't reference a clause, the picker label
       falls back to the "No sort" sentinel. */
    expect(screen.getByLabelText("Sort signal")).toHaveTextContent(/No sort/);
  });

  it("fires onSortByChange with the new key when a sort option is picked", async () => {
    const user = userEvent.setup();
    const onSortByChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
      { signalKey: SIGNALS[2].key, operator: "lt", value: 250000 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={vi.fn()}
        onSortByChange={onSortByChange}
      />,
    );
    await user.click(screen.getByLabelText("Sort signal"));
    await user.click(screen.getByRole("menuitem", { name: SIGNALS[2].label }));
    expect(onSortByChange).toHaveBeenCalledWith(SIGNALS[2].key);
  });

  it("fires onSortByChange with undefined when '— No sort —' is picked", async () => {
    const user = userEvent.setup();
    const onSortByChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={vi.fn()}
        sortBy={SIGNALS[0].key}
        onSortByChange={onSortByChange}
      />,
    );
    await user.click(screen.getByLabelText("Sort signal"));
    await user.click(screen.getByRole("menuitem", { name: /No sort/ }));
    expect(onSortByChange).toHaveBeenCalledWith(undefined);
  });

  it("disables the sort direction picker when sortBy is cleared", () => {
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Sort direction")).toBeDisabled();
  });

  it("fires onSortOrderChange when a direction is picked from the dropdown", async () => {
    const user = userEvent.setup();
    const onSortOrderChange = vi.fn();
    const clauses: FilterClause[] = [
      { signalKey: SIGNALS[0].key, operator: "gt", value: 5 },
    ];
    render(
      <FilterBuilder
        signals={SIGNALS}
        value={clauses}
        onChange={vi.fn()}
        sortBy={SIGNALS[0].key}
        sortOrder="asc"
        onSortOrderChange={onSortOrderChange}
      />,
    );
    await user.click(screen.getByLabelText("Sort direction"));
    await user.click(screen.getByRole("menuitem", { name: "Descending" }));
    expect(onSortOrderChange).toHaveBeenCalledWith("desc");
  });

  it("applies the dark surface variant via data-surface attribute", () => {
    const { container } = render(
      <FilterBuilder
        signals={SIGNALS}
        value={[]}
        onChange={vi.fn()}
        surface="dark"
      />,
    );
    expect(container.querySelector(".oga-filter-builder")).toHaveAttribute("data-surface", "dark");
  });
});
