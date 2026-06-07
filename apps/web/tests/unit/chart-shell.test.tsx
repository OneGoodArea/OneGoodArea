// @vitest-environment jsdom

/* AR-245: Component tests for <ChartShell>. Covers all three variants
   (line / bar / sparkline), data rendering, multi-series + legend,
   confidence band, axis formatters, hover tooltip behaviour, and
   the dark surface variant. */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ChartShell,
  type ChartPoint,
} from "@/app/design-v2/_shared/dashboard/chart-shell";

const LINE_DATA: ChartPoint[] = [
  { x: "Jan", y: 100 },
  { x: "Feb", y: 140 },
  { x: "Mar", y: 130 },
  { x: "Apr", y: 180 },
  { x: "May", y: 220 },
];

const BAR_DATA: ChartPoint[] = [
  { x: "Jan", y: 12 },
  { x: "Feb", y: 18 },
  { x: "Mar", y: 9 },
  { x: "Apr", y: 21 },
];

describe("<ChartShell> (AR-245)", () => {
  it("renders a line chart with a single SVG <path>", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    expect(container.querySelectorAll(".oga-chart-shell__line")).toHaveLength(1);
    /* Plus a circle per data point for line variant. */
    expect(container.querySelectorAll(".oga-chart-shell__point")).toHaveLength(LINE_DATA.length);
  });

  it("renders one rect per data point in bar variant", () => {
    const { container } = render(<ChartShell variant="bar" data={BAR_DATA} />);
    expect(container.querySelectorAll(".oga-chart-shell__bar")).toHaveLength(BAR_DATA.length);
  });

  it("renders a sparkline path with no axes / gridlines / point circles", () => {
    const { container } = render(<ChartShell variant="sparkline" data={LINE_DATA} />);
    expect(container.querySelectorAll(".oga-chart-shell__line")).toHaveLength(1);
    expect(container.querySelectorAll(".oga-chart-shell__point")).toHaveLength(0);
    expect(container.querySelectorAll(".oga-chart-shell__gridline")).toHaveLength(0);
    expect(container.querySelectorAll(".oga-chart-shell__axis")).toHaveLength(0);
  });

  it("renders the confidence band as a closed path under the line", () => {
    const lower: ChartPoint[] = LINE_DATA.map((p) => ({ x: p.x, y: p.y - 20 }));
    const upper: ChartPoint[] = LINE_DATA.map((p) => ({ x: p.x, y: p.y + 20 }));
    const { container } = render(
      <ChartShell
        variant="line"
        data={LINE_DATA}
        confidenceBand={{ lower, upper }}
      />,
    );
    const band = container.querySelector(".oga-chart-shell__band");
    expect(band).not.toBeNull();
    /* Band path is closed: ends with "Z". */
    expect(band?.getAttribute("d")).toMatch(/Z$/);
  });

  it("omits the confidence band when not provided", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    expect(container.querySelector(".oga-chart-shell__band")).toBeNull();
  });

  it("renders a tick label for each y-axis tick (line + bar)", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    /* 5 y-ticks + N x-ticks. */
    expect(container.querySelectorAll(".oga-chart-shell__gridline")).toHaveLength(5);
  });

  it("applies the consumer's yAxis format function to tick labels", () => {
    const fmt = vi.fn((v: number | string) => `$${v}`);
    render(
      <ChartShell
        variant="line"
        data={LINE_DATA}
        yAxis={{ format: fmt, domain: [0, 250] }}
      />,
    );
    /* fmt called for each of the 5 y-ticks. */
    expect(fmt).toHaveBeenCalled();
    expect(fmt.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it("honours the yAxis.domain override", () => {
    /* If domain is [0, 1000], the topmost tick is 1000 — verify a tick label exists for it. */
    const { container } = render(
      <ChartShell
        variant="line"
        data={LINE_DATA}
        yAxis={{ domain: [0, 1000] }}
      />,
    );
    const tickLabels = Array.from(container.querySelectorAll(".oga-chart-shell__y-label")).map(
      (t) => t.textContent,
    );
    /* niceTicks for [0, 1000] gives step=200 -> ticks [0, 200, 400,
       600, 800, 1000]. formatNumber trims trailing zeros so 1000
       reads "1k" (not "1.0k") and 200 reads "200" (under the k
       threshold). */
    expect(tickLabels).toContain("1k");
    expect(tickLabels).toContain("0");
  });

  it("renders a legend with one item per series in multi-series mode", () => {
    const multiData: ChartPoint[] = [
      { x: 0, y: 100, series: "a" },
      { x: 1, y: 110, series: "a" },
      { x: 0, y: 80, series: "b" },
      { x: 1, y: 95, series: "b" },
    ];
    const { container } = render(
      <ChartShell
        variant="line"
        data={multiData}
        series={[
          { key: "a", label: "Series A" },
          { key: "b", label: "Series B" },
        ]}
      />,
    );
    expect(container.querySelectorAll(".oga-chart-shell__legend-item")).toHaveLength(2);
    expect(screen.getByText("Series A")).toBeInTheDocument();
    expect(screen.getByText("Series B")).toBeInTheDocument();
    /* One line per series. */
    expect(container.querySelectorAll(".oga-chart-shell__line")).toHaveLength(2);
  });

  it("does not render a legend in single-series mode", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    expect(container.querySelector(".oga-chart-shell__legend")).toBeNull();
  });

  it("does not render a legend in sparkline variant", () => {
    const multiData: ChartPoint[] = [
      { x: 0, y: 100, series: "a" },
      { x: 0, y: 80, series: "b" },
    ];
    const { container } = render(
      <ChartShell
        variant="sparkline"
        data={multiData}
        series={[
          { key: "a", label: "A" },
          { key: "b", label: "B" },
        ]}
      />,
    );
    expect(container.querySelector(".oga-chart-shell__legend")).toBeNull();
  });

  it("renders a tooltip + crosshair on mouse-move over the SVG", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    const svg = container.querySelector(".oga-chart-shell__svg") as SVGSVGElement;
    expect(svg).not.toBeNull();

    /* Stub the SVG's bounding rect so mouse-position math works under jsdom. */
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 600,
      bottom: 280,
      width: 600,
      height: 280,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseMove(svg, { clientX: 300, clientY: 140 });

    /* Tooltip + crosshair both present. */
    expect(container.querySelector(".oga-chart-shell__tooltip")).not.toBeNull();
    expect(container.querySelector(".oga-chart-shell__crosshair")).not.toBeNull();
  });

  it("does not render a tooltip in sparkline variant on hover", () => {
    const { container } = render(<ChartShell variant="sparkline" data={LINE_DATA} />);
    const svg = container.querySelector(".oga-chart-shell__svg") as SVGSVGElement;
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 600,
      bottom: 48,
      width: 600,
      height: 48,
      toJSON: () => ({}),
    } as DOMRect);
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 24 });
    expect(container.querySelector(".oga-chart-shell__tooltip")).toBeNull();
  });

  it("dismisses the tooltip on mouseleave", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    const svg = container.querySelector(".oga-chart-shell__svg") as SVGSVGElement;
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 600,
      bottom: 280,
      width: 600,
      height: 280,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseMove(svg, { clientX: 300, clientY: 140 });
    expect(container.querySelector(".oga-chart-shell__tooltip")).not.toBeNull();
    fireEvent.mouseLeave(svg);
    expect(container.querySelector(".oga-chart-shell__tooltip")).toBeNull();
  });

  it("uses the default height of 280 for line / bar", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} />);
    expect(
      container.querySelector(".oga-chart-shell__svg")?.getAttribute("viewBox"),
    ).toBe("0 0 600 280");
  });

  it("uses the default height of 48 for sparkline", () => {
    const { container } = render(<ChartShell variant="sparkline" data={LINE_DATA} />);
    expect(
      container.querySelector(".oga-chart-shell__svg")?.getAttribute("viewBox"),
    ).toBe("0 0 600 48");
  });

  it("honours a custom height prop", () => {
    const { container } = render(<ChartShell variant="line" data={LINE_DATA} height={400} />);
    expect(
      container.querySelector(".oga-chart-shell__svg")?.getAttribute("viewBox"),
    ).toBe("0 0 600 400");
  });

  it("applies the dark surface variant via data-surface", () => {
    const { container } = render(
      <ChartShell variant="line" data={LINE_DATA} surface="dark" />,
    );
    expect(container.querySelector(".oga-chart-shell")).toHaveAttribute("data-surface", "dark");
  });

  it("exposes role=img + aria-label on the chart SVG", () => {
    render(
      <ChartShell
        variant="line"
        data={LINE_DATA}
        aria-label="Monthly revenue trend"
      />,
    );
    expect(screen.getByRole("img", { name: "Monthly revenue trend" })).toBeInTheDocument();
  });
});
