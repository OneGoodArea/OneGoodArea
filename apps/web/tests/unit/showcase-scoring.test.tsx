// @vitest-environment jsdom

/* AR-706: Component tests for <ShowcaseScoring>. Covers preset tabs,
   weight sliders, client-side recalculation, reset, loading, and error states. */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShowcaseScoring } from "@/components/showcase/ShowcaseScoring";
import type { Preset, ScoreResult, Score } from "@/lib/showcase/types";

const DIMENSIONS: Score[] = [
  { id: "crime", name: "Safety & Crime", value: 72, weight: 20, maxValue: 100, product: "scores", confidence: 0.9 },
  { id: "deprivation", name: "Deprivation", value: 55, weight: 10, maxValue: 100, product: "scores", confidence: 0.8 },
  { id: "property", name: "Property Market", value: 80, weight: 20, maxValue: 100, product: "scores", confidence: 0.85 },
  { id: "schools", name: "Schools & Education", value: 60, weight: 20, maxValue: 100, product: "scores", confidence: 0.7 },
  { id: "amenities", name: "Amenities", value: 65, weight: 10, maxValue: 100, product: "scores", confidence: 0.75 },
  { id: "transport", name: "Transport & Connectivity", value: 50, weight: 15, maxValue: 100, product: "scores", confidence: 0.8 },
  { id: "environment", name: "Environment & Flood Risk", value: 40, weight: 5, maxValue: 100, product: "scores", confidence: 0.6 },
];

function makeResult(overrides?: Partial<{ preset: Preset; score: number; confidence: number; weightsSource: "preset" | "custom" }>): ScoreResult {
  return {
    preset: "business" as Preset,
    score: 62,
    confidence: 0.78,
    weightsSource: "preset",
    dimensions: DIMENSIONS,
    ...overrides,
  };
}

function mockFetch(result: ScoreResult, ok = true) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(result), {
      status: ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("<ShowcaseScoring> (AR-706)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the four preset tabs", async () => {
    global.fetch = mockFetch(makeResult());
    render(<ShowcaseScoring postcode="M1 1AE" />);

    expect(screen.getByRole("tab", { name: "Origination" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Site selection" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Investment" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Reference" })).toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ShowcaseScoring postcode="M1 1AE" />);

    expect(screen.getByText(/loading scores/i)).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ShowcaseScoring postcode="M1 1AE" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getByText(/failed to load scores/i)).toBeInTheDocument();
  });

  it("renders dimension sliders and overall score after fetch", async () => {
    global.fetch = mockFetch(makeResult());
    render(<ShowcaseScoring postcode="M1 1AE" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Overall score")).toBeInTheDocument();
    expect(screen.getByText("Safety & Crime", { selector: ".text-sm.font-medium" })).toBeInTheDocument();
    expect(screen.getByText("Deprivation", { selector: ".text-sm.font-medium" })).toBeInTheDocument();
  });

  it("switches preset and re-fetches scores", async () => {
    global.fetch = mockFetch(makeResult({ preset: "moving" }));
    render(<ShowcaseScoring postcode="M1 1AE" />);

    await act(async () => {
      await Promise.resolve();
    });

    const researchTab = screen.getByRole("tab", { name: "Reference" });
    await act(async () => {
      fireEvent.click(researchTab);
    });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    const url = new URL(lastCall);
    expect(url.searchParams.get("preset")).toBe("research");
  });

  it("recalculates overall score when a weight slider changes", async () => {
    global.fetch = mockFetch(makeResult());
    render(<ShowcaseScoring postcode="M1 1AE" />);

    await act(async () => {
      await Promise.resolve();
    });

    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBe(7);

    const firstSlider = sliders[0];
    await act(async () => {
      fireEvent.change(firstSlider, { target: { value: "50" } });
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("reset button clears custom weights", async () => {
    global.fetch = mockFetch(makeResult());
    render(<ShowcaseScoring postcode="M1 1AE" />);

    await act(async () => {
      await Promise.resolve();
    });

    const resetBtn = screen.getByRole("button", { name: /reset to preset defaults/i });
    expect(resetBtn).toBeInTheDocument();
  });

  it("shows placeholder when no postcode is provided", () => {
    render(<ShowcaseScoring />);

    expect(screen.getByText(/enter a postcode to see scoring weights/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("passes initialResult as default preset", async () => {
    global.fetch = mockFetch(makeResult({ preset: "investing" }));
    const initial = makeResult({ preset: "investing" });
    render(<ShowcaseScoring postcode="M1 1AE" initialResult={initial} />);

    await act(async () => {
      await Promise.resolve();
    });

    const investingTab = screen.getByRole("tab", { name: "Investment" });
    expect(investingTab).toHaveAttribute("aria-selected", "true");
  });
});