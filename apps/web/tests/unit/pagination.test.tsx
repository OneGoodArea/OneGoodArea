// @vitest-environment jsdom

/* AR-242: Component tests for <Pagination> covering both cursor +
   page modes, callback wiring, disabled states, ellipsis math, and
   surface variants. Includes the page-range helper as a pure unit
   so the truncation math is independently verifiable. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, getPageRange } from "@/app/design-v2/_shared/dashboard/pagination";

describe("getPageRange (AR-242 page-range math)", () => {
  it("returns all pages when total <= 7", () => {
    expect(getPageRange(1, 1)).toEqual([1]);
    expect(getPageRange(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses with leading ellipsis when current is past the front", () => {
    expect(getPageRange(10, 12)).toEqual([1, "ellipsis", 9, 10, 11, 12]);
  });

  it("collapses with trailing ellipsis when current is near the front", () => {
    expect(getPageRange(2, 12)).toEqual([1, 2, 3, "ellipsis", 12]);
  });

  it("collapses with both ellipses when current is in the middle", () => {
    expect(getPageRange(7, 12)).toEqual([1, "ellipsis", 6, 7, 8, "ellipsis", 12]);
  });

  it("shows first + last with adjacent + ellipsis when total is huge", () => {
    expect(getPageRange(50, 100)).toEqual([1, "ellipsis", 49, 50, 51, "ellipsis", 100]);
  });
});

describe("<Pagination> cursor mode (AR-242)", () => {
  it("renders Newer / Older buttons with default labels", () => {
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Newer page/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Older page/ })).toBeInTheDocument();
  });

  it("uses custom prev/next labels when provided", () => {
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        prevLabel="Prev"
        nextLabel="Next"
      />,
    );
    expect(screen.getByRole("button", { name: /Prev page/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next page/ })).toBeInTheDocument();
  });

  it("disables Prev when hasPrev=false", () => {
    render(
      <Pagination
        mode="cursor"
        hasPrev={false}
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Newer page/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Older page/ })).not.toBeDisabled();
  });

  it("disables Next when hasNext=false", () => {
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Older page/ })).toBeDisabled();
  });

  it("fires onPrev when Newer button clicked", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={onPrev}
        onNext={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Newer page/ }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("fires onNext when Older button clicked", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={onNext}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Older page/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders the optional indicator slot", () => {
    render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        indicator="Showing events 11-20"
      />,
    );
    expect(screen.getByText("Showing events 11-20")).toBeInTheDocument();
  });
});

describe("<Pagination> page mode (AR-242)", () => {
  it("renders all pages when totalPages is small (5)", () => {
    render(<Pagination mode="page" page={3} totalPages={5} onChange={vi.fn()} />);
    for (const p of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: `Page ${p}` })).toBeInTheDocument();
    }
  });

  it("marks the current page with aria-current and data-active", () => {
    render(<Pagination mode="page" page={3} totalPages={5} onChange={vi.fn()} />);
    const currentBtn = screen.getByRole("button", { name: "Page 3" });
    expect(currentBtn).toHaveAttribute("aria-current", "page");
    expect(currentBtn).toHaveAttribute("data-active", "true");
  });

  it("renders ellipsis nodes for long ranges", () => {
    const { container } = render(
      <Pagination mode="page" page={7} totalPages={12} onChange={vi.fn()} />,
    );
    const ellipsisNodes = container.querySelectorAll(".oga-pagination__ellipsis");
    expect(ellipsisNodes).toHaveLength(2);
    expect(ellipsisNodes[0]).toHaveTextContent("…");
  });

  it("disables Prev on the first page and Next on the last page", () => {
    const { rerender } = render(
      <Pagination mode="page" page={1} totalPages={5} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Previous page/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Next page/ })).not.toBeDisabled();

    rerender(<Pagination mode="page" page={5} totalPages={5} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Previous page/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Next page/ })).toBeDisabled();
  });

  it("fires onChange with the right page when a page button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination mode="page" page={1} totalPages={5} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("fires onChange with page-1 when Prev clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination mode="page" page={3} totalPages={5} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Previous page/ }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("fires onChange with page+1 when Next clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination mode="page" page={3} totalPages={5} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /Next page/ }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("clamps an out-of-range page prop into the valid range", () => {
    render(<Pagination mode="page" page={99} totalPages={5} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
  });
});

describe("<Pagination> surface (AR-242)", () => {
  it("renders the dark surface variant via data-surface attribute", () => {
    const { container } = render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        surface="dark"
      />,
    );
    expect(container.querySelector(".oga-pagination")).toHaveAttribute("data-surface", "dark");
  });

  it("defaults to the light surface", () => {
    const { container } = render(
      <Pagination
        mode="cursor"
        hasPrev
        hasNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(container.querySelector(".oga-pagination")).toHaveAttribute("data-surface", "light");
  });

  it("uses a custom aria-label on the <nav> when provided", () => {
    render(
      <Pagination
        mode="page"
        page={1}
        totalPages={3}
        onChange={vi.fn()}
        aria-label="Activity feed pagination"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Activity feed pagination" })).toBeInTheDocument();
  });
});
