import { describe, it, expect } from "vitest";
import {
  crimeConfidence,
  crimePeriod,
  CRIME_CONF_HIGH,
  CRIME_CONF_MEDIUM,
  CRIME_CONF_LOW,
  CRIME_CONF_ZERO_RECORDED,
  CRIME_WINDOW_MONTHS,
} from "@/modules/signals/crime-confidence";
import type { CrimeSummary } from "@/modules/signals/inputs";

/* AR-393: shared crime-confidence module.

   Two surfaces consume this:
     - /v1/score Safety & Crime dimension (engine v2.ts scoreSafety)
     - /v1/area crime.total_12m signal (area-profile.ts)

   Pre-AR-393 they had divergent ladders, producing 40% vs 60% on the same
   M1 1AE input. These tests pin the unified behaviour. The "both surfaces
   match" assertion is implicit: they both import this module. */

function summary(overrides: Partial<CrimeSummary> = {}): CrimeSummary {
  return {
    total_crimes: 50,
    months_covered: 12,
    by_category: {},
    top_streets: [],
    outcome_breakdown: {},
    monthly_trend: [],
    ...overrides,
  };
}

describe("CRIME_WINDOW_MONTHS", () => {
  it("is 12 (the live police fetcher and bulk archive both trail 12 months)", () => {
    expect(CRIME_WINDOW_MONTHS).toBe(12);
  });
});

describe("crimeConfidence (unified ladder)", () => {
  it("HIGH requires both substantial sample (>=100) AND full window (>=12mo)", () => {
    const r = crimeConfidence(summary({ total_crimes: 200, months_covered: 12 }));
    expect(r.confidence).toBe(CRIME_CONF_HIGH);
    expect(r.confidence_reason).toMatch(/strong signal/);
  });

  it("a high sample count alone does not earn HIGH if the window is short", () => {
    const r = crimeConfidence(summary({ total_crimes: 500, months_covered: 3 }));
    expect(r.confidence).toBe(CRIME_CONF_MEDIUM);
  });

  it("MEDIUM for >=30 crimes regardless of window length", () => {
    expect(crimeConfidence(summary({ total_crimes: 30, months_covered: 6 })).confidence).toBe(
      CRIME_CONF_MEDIUM,
    );
    expect(crimeConfidence(summary({ total_crimes: 99, months_covered: 12 })).confidence).toBe(
      CRIME_CONF_MEDIUM,
    );
  });

  it("LOW for sparse samples (<30 crimes)", () => {
    const r = crimeConfidence(summary({ total_crimes: 4, months_covered: 12 }));
    expect(r.confidence).toBe(CRIME_CONF_LOW);
    expect(r.confidence_reason).toMatch(/sparse|indicative/i);
    expect(r.confidence_reason).toContain("4");
  });

  it("ZERO_RECORDED (0.6) when the area was covered but no crimes were recorded", () => {
    const r = crimeConfidence(summary({ total_crimes: 0, months_covered: 0 }));
    expect(r.confidence).toBe(CRIME_CONF_ZERO_RECORDED);
    expect(r.confidence_reason).toMatch(/zero crimes/i);
    expect(r.confidence_reason).toContain(String(CRIME_WINDOW_MONTHS));
  });

  it("includes the actual months_covered in the reason (audit trail)", () => {
    const r = crimeConfidence(summary({ total_crimes: 50, months_covered: 9 }));
    expect(r.confidence_reason).toContain("9 months");
  });

  it("uses no em-dashes (project HARD RULE)", () => {
    for (const c of [
      summary({ total_crimes: 200, months_covered: 12 }),
      summary({ total_crimes: 50, months_covered: 6 }),
      summary({ total_crimes: 4, months_covered: 12 }),
      summary({ total_crimes: 0, months_covered: 0 }),
    ]) {
      const r = crimeConfidence(c);
      expect(r.confidence_reason).not.toContain("—");
    }
  });
});

describe("crimePeriod", () => {
  it("falls back to 'Last 12 months' when no monthly trend is present", () => {
    expect(crimePeriod(null)).toBe("Last 12 months");
    expect(crimePeriod(summary({ monthly_trend: [] }))).toBe("Last 12 months");
  });

  it("renders a single-month range as the formatted month", () => {
    const out = crimePeriod(summary({ monthly_trend: [{ month: "2026-01", count: 5 }] }));
    expect(out).toBe("Jan 2026");
  });

  it("renders multi-month ranges as 'oldest to newest'", () => {
    const out = crimePeriod(
      summary({
        monthly_trend: [
          { month: "2025-08", count: 5 },
          { month: "2025-12", count: 8 },
          { month: "2026-03", count: 4 },
        ],
      }),
    );
    expect(out).toBe("Aug 2025 to Mar 2026");
  });
});
