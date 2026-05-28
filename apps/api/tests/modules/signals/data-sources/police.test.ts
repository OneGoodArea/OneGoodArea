import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw-server";
import { getCrimeData, formatCrimeDataForPrompt } from "@/modules/signals/data-sources/police";
import type { CrimeSummary } from "@/modules/signals/inputs";

/* The legacy police fetcher had no test. MSW intercepts police.uk so we lock
   the failure modes (empty / upstream error -> null) and the aggregation
   shape without touching the real API. getCrimeData fetches 3 trailing
   months; the handler answers all three identically (date query ignored). */

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
  it("returns null when every month is empty", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json([])));
    expect(await getCrimeData(53.4, -2.2)).toBeNull();
  });

  it("returns null when the upstream errors", async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 })));
    expect(await getCrimeData(53.4, -2.2)).toBeNull();
  });

  it("aggregates crimes across the 3 trailing months", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json(FIXTURE)));

    const result = await getCrimeData(53.4, -2.2);
    expect(result).not.toBeNull();
    const r = result!;

    // 2 crimes x 3 months
    expect(r.total_crimes).toBe(6);
    expect(r.months_covered).toBe(3);
    expect(r.by_category).toEqual({ "Anti Social Behaviour": 3, "Violent Crime": 3 });
    expect(r.outcome_breakdown).toEqual({
      "Under investigation": 3, // null outcome -> default label
      "Investigation complete; no suspect identified": 3,
    });
    expect(r.top_streets).toContainEqual({ name: "High Street", count: 3 });
    expect(r.top_streets).toContainEqual({ name: "Main Road", count: 3 });
    expect(r.monthly_trend).toEqual([{ month: "2026-01", count: 6 }]);
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
