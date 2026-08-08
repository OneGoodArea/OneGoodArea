// @vitest-environment jsdom

/* AR-786: Component tests for <PriceChangesTab>. Covers the empty state,
   the YoY/median stat cards, the forecast chart render, and the recent
   sales table. */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceChangesTab } from "@/modules/showcase-proptech/PriceChangesTab";
import type { ForecastResult, Signal, TransactionsResult } from "@/lib/showcase/types";

const SIGNALS: Signal[] = [
  {
    id: "property.median_price",
    name: "Median sale price",
    description: "£285,000",
    value: 285000,
    category: "property",
  },
  {
    id: "property.price_change_pct",
    name: "Price change (year on year)",
    description: "3.42%",
    value: 3.42,
    category: "property",
  },
];

const FORECAST: ForecastResult = {
  signalKey: "property.median_price",
  points: [
    { observed_period: "2026-01", projected_value: 285000, lower_bound: 280000, upper_bound: 290000 },
    { observed_period: "2026-02", projected_value: 287000, lower_bound: 281000, upper_bound: 293000 },
    { observed_period: "2026-03", projected_value: 289000, lower_bound: 282000, upper_bound: 296000 },
  ],
  meta: {
    window_months: 24,
    horizon_months: 3,
    n_observations: 24,
    r2: 0.82,
    slope_per_month: 800,
    latest_observed_period: "2026-01",
  },
};

const TRANSACTIONS: TransactionsResult = {
  postcodeArea: "M21",
  period: { from: "2025-08-01", to: "2026-08-01" },
  transactionCount: 12,
  transactions: [
    {
      date: "2026-07-14",
      price: 275000,
      propertyType: "Terraced",
      estateType: "Freehold",
    },
  ],
};

describe("PriceChangesTab", () => {
  it("shows an empty-state hint when there is no price data", () => {
    render(<PriceChangesTab signals={[]} forecast={null} transactions={null} />);
    expect(screen.getByText(/enter a postcode to see price changes/i)).toBeTruthy();
  });

  it("renders the median and YoY stat cards", () => {
    render(<PriceChangesTab signals={SIGNALS} forecast={null} transactions={null} />);
    expect(screen.getByText("Median sale price")).toBeTruthy();
    expect(screen.getByText("£285,000")).toBeTruthy();
    expect(screen.getByText("Change (year on year)")).toBeTruthy();
    expect(screen.getByText("+3.42%")).toBeTruthy();
  });

  it("renders the forecast chart when points exist", () => {
    render(<PriceChangesTab signals={SIGNALS} forecast={FORECAST} transactions={null} />);
    expect(screen.getByText("Median price forecast")).toBeTruthy();
    expect(screen.getByRole("img", { name: /projected median price/i })).toBeTruthy();
  });

  it("renders the forecast SVG with valid coordinate-pair points (no path commands)", () => {
    const { container } = render(<PriceChangesTab signals={SIGNALS} forecast={FORECAST} transactions={null} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const polygon = svg?.querySelector("polygon");
    const polyline = svg?.querySelector("polyline");
    expect(polygon).not.toBeNull();
    expect(polyline).not.toBeNull();
    const polygonPoints = polygon?.getAttribute("points") ?? "";
    const polylinePoints = polyline?.getAttribute("points") ?? "";
    expect(polygonPoints).not.toMatch(/[ML]/);
    expect(polylinePoints).not.toMatch(/[ML]/);
  });

  it("degrades the forecast to a hint when only one point exists", () => {
    const singlePoint = { ...FORECAST, points: [FORECAST.points[0]!] };
    render(<PriceChangesTab signals={SIGNALS} forecast={singlePoint} transactions={null} />);
    expect(screen.getByText("Forecast not available for this area.")).toBeTruthy();
  });

  it("renders the recent sales table", () => {
    render(<PriceChangesTab signals={SIGNALS} forecast={null} transactions={TRANSACTIONS} />);
    expect(screen.getByText("Recent sales")).toBeTruthy();
    expect(screen.getByText("£275,000")).toBeTruthy();
  });
});
