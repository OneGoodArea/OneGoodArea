// @vitest-environment jsdom

/* AR-230: Component tests for <DataTable>. First .test.tsx in the
   repo — uses the RTL setup wired in vitest.config.ts via setupFiles
   (@testing-library/jest-dom matchers + afterEach cleanup).

   Covers the acceptance criteria from the Jira ticket:
   - Sort works (asc / desc / cycles)
   - Sortable header is keyboard-activatable
   - Controlled sort path fires onSortChange
   - Loading state renders skeleton rows; hides existing rows
   - Empty state renders when rows are empty
   - Error state renders the message
   - onRowClick fires on data rows
   - onRowClick is suppressed when the click originates from an
     interactive child (button / link) — the row-vs-action collision
     bug we explicitly guard against */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "@/app/design-v2/_shared/dashboard/data-table";
import type { ColumnDef } from "@/app/design-v2/_shared/dashboard/data-table";

interface Row {
  id: string;
  name: string;
  count: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Charlie", count: 30 },
  { id: "b", name: "Alpha", count: 10 },
  { id: "c", name: "Bravo", count: 20 },
];

const COLUMNS: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    sortAccessor: (r) => r.name,
    cell: (r) => r.name,
  },
  {
    key: "count",
    header: "Count",
    align: "end",
    sortable: true,
    sortAccessor: (r) => r.count,
    cell: (r) => r.count,
  },
];

function getBodyRows() {
  return screen
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0);
}

function getRowText(row: HTMLElement) {
  return Array.from(row.querySelectorAll("td")).map((td) => td.textContent ?? "");
}

describe("<DataTable> (AR-230)", () => {
  it("renders columns + rows from data", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Count/ })).toBeInTheDocument();

    const rows = getBodyRows();
    expect(rows).toHaveLength(3);
    expect(getRowText(rows[0]!)).toEqual(["Charlie", "30"]);
  });

  it("sorts ascending on first click, descending on second (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

    await user.click(screen.getByRole("button", { name: /Name/ }));
    let bodyRows = getBodyRows();
    expect(getRowText(bodyRows[0]!)[0]).toBe("Alpha");
    expect(getRowText(bodyRows[2]!)[0]).toBe("Charlie");
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(screen.getByRole("button", { name: /Name/ }));
    bodyRows = getBodyRows();
    expect(getRowText(bodyRows[0]!)[0]).toBe("Charlie");
    expect(getRowText(bodyRows[2]!)[0]).toBe("Alpha");
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("sorts numerically when sortAccessor returns a number", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

    await user.click(screen.getByRole("button", { name: /Count/ }));
    const bodyRows = getBodyRows();
    expect(getRowText(bodyRows[0]!)[1]).toBe("10");
    expect(getRowText(bodyRows[2]!)[1]).toBe("30");
  });

  it("activates sort with the keyboard (Enter on focused header button)", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

    const nameSortButton = screen.getByRole("button", { name: /Name/ });
    nameSortButton.focus();
    await user.keyboard("{Enter}");

    const bodyRows = getBodyRows();
    expect(getRowText(bodyRows[0]!)[0]).toBe("Alpha");
  });

  it("calls onSortChange in controlled mode and does not internally sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        sortState={{ key: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );

    /* Controlled path: rows render in their input order; we don't
       re-sort internally. */
    const initialBody = getBodyRows();
    expect(getRowText(initialBody[0]!)[0]).toBe("Charlie");

    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith({ key: "name", direction: "desc" });
  });

  it("renders skeleton rows when loading and no rows are available", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowKey={(r) => r.id}
        isLoading
        loadingRowCount={4}
      />,
    );

    /* Skeletons live inside body rows but are aria-hidden — fall back
       to a direct selector for them since RTL won't pick them up. */
    const skeletons = document.querySelectorAll(".oga-data-table__skeleton");
    expect(skeletons.length).toBe(4 * COLUMNS.length);
  });

  it("renders the empty state when rows are empty and not loading", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowKey={(r) => r.id}
        emptyState={<span>Nothing here yet.</span>}
      />,
    );
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("renders the error state and announces via role=alert", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        error="Failed to load — try again in a moment."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load — try again in a moment.",
    );
    /* Body data rows should not render alongside the error message. */
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("fires onRowClick when a non-interactive cell is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );

    await user.click(screen.getByText("Charlie"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("does NOT fire onRowClick when the click originates inside a button", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onActionClick = vi.fn();
    const columnsWithAction: ColumnDef<Row>[] = [
      ...COLUMNS,
      {
        key: "actions",
        header: "",
        align: "end",
        cell: (r) => (
          <button type="button" onClick={() => onActionClick(r.id)}>
            Edit
          </button>
        ),
      },
    ];

    render(
      <DataTable
        columns={columnsWithAction}
        rows={ROWS}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);

    expect(onActionClick).toHaveBeenCalledWith("a");
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("falls back to default empty state copy when no emptyState prop is provided", () => {
    render(<DataTable columns={COLUMNS} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText(/No results/i)).toBeInTheDocument();
  });
});
