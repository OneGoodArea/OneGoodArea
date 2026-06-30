import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { getCrimeData, formatCrimeDataForPrompt } from "@/modules/signals/data-sources/police";
import type { CrimeSummary } from "@/modules/signals/inputs";

/* The legacy police fetcher had no test. MSW intercepts police.uk so we lock
   the failure modes (empty / upstream error -> null) and the aggregation
   shape without touching the real API. AR-393: getCrimeData fetches 12
   trailing months (was 3 — caused label drift since the result was
   labelled "Recorded crimes (12 months)"). The handler answers all
   twelve identically (date query ignored). */

const ENDPOINT = "https://data.police.uk/api/crimes-street/all-crime";

const FIXTURE = [
  {
    category: "anti-social-behaviour",
    location_type: "Force",
    location: { latitude: "53.4", longitude: "-2.2", street: { id: 1, name: "High Street" } },
    context: "",
    outcome_status: null,
    month: "2026-01",
  },
  {
    category: "violent-crime",
    location_type: "Force",
    location: { latitude: "53.4", longitude: "-2.2", street: { id: 2, name: "Main Road" } },
    context: "",
    outcome_status: { category: "Investigation complete; no suspect identified", date: "2026-01" },
    month: "2026-01",
  },
];

describe("getCrimeData", () => {
  it("returns a zero-crime summary when every month is empty (AR-268)", async () => {
    /* AR-268: previously this returned null and area-profile.ts then
       labelled the area "No police.uk coverage" — false for every
       England/Wales LSOA. Now a definitive HTTP-200-but-empty yields
       a summary with total_crimes: 0 so callers can distinguish. */
    server.use(http.get(ENDPOINT, () => HttpResponse.json([])));
    const result = await getCrimeData(53.4, -2.2);
    expect(result).not.toBeNull();
    expect(result).toEqual({
      total_crimes: 0,
      months_covered: 0,
      by_category: {},
      top_streets: [],
      outcome_breakdown: {},
      monthly_trend: [],
    });
  });

  it("returns null when every month errors (AR-268: distinguishes from empty)", async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 })));
    expect(await getCrimeData(53.4, -2.2)).toBeNull();
  });

  it("returns the zero summary when SOME months error but at least one returned OK with []", async () => {
    /* If at least one of the 12 months responded HTTP 200 with [], the
       area IS covered; conservative behaviour is to report the zero count. */
    let n = 0;
    server.use(
      http.get(ENDPOINT, () => {
        n += 1;
        return n === 1 ? HttpResponse.json([]) : new HttpResponse(null, { status: 500 });
      }),
    );
    const result = await getCrimeData(53.4, -2.2);
    expect(result).not.toBeNull();
    expect(result!.total_crimes).toBe(0);
  });

  it("aggregates crimes across the 12 trailing months (AR-393)", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json(FIXTURE)));

    const result = await getCrimeData(53.4, -2.2);
    expect(result).not.toBeNull();
    const r = result!;

    // 2 crimes x 12 months (the handler returns the same fixture for every month)
    expect(r.total_crimes).toBe(24);
    expect(r.months_covered).toBe(12);
    expect(r.by_category).toEqual({ "Anti Social Behaviour": 12, "Violent Crime": 12 });
    expect(r.outcome_breakdown).toEqual({
      "Under investigation": 12,
      "Investigation complete; no suspect identified": 12,
    });
    expect(r.top_streets).toContainEqual({ name: "High Street", count: 12 });
    expect(r.top_streets).toContainEqual({ name: "Main Road", count: 12 });
    expect(r.monthly_trend).toEqual([{ month: "2026-01", count: 24 }]);
  });
});

describe("formatCrimeDataForPrompt", () => {
  it("renders categories with percentages and the streets/trend blocks", () => {
    const summary: CrimeSummary = {
      total_crimes: 10,
      months_covered: 3,
      by_category: { Burglary: 6, Robbery: 4 },
      top_streets: [{ name: "High Street", count: 5 }],
      outcome_breakdown: { "Under investigation": 10 },
      monthly_trend: [
        { month: "2025-11", count: 3 },
        { month: "2025-12", count: 7 },
      ],
    };

    const out = formatCrimeDataForPrompt(summary);
    expect(out).toContain("Source: police.uk, last 3 months");
    expect(out).toContain("Total recorded crimes: 10");
    expect(out).toContain("Burglary: 6 (60.0%)");
    expect(out).toContain("Robbery: 4 (40.0%)");
    expect(out).toContain("High Street: 5 incidents");
    expect(out).toContain("2025-12: 7 crimes");
  });
});
