import { describe, it, expect, vi, beforeEach } from "vitest";

/* Integration test for the orchestrator. The deterministic scoring engine and
   the report assembly run for real; the AI is the MockAiProvider
   (OGA_AI_PROVIDER=mock); the I/O boundaries (data sources, cache, tracking,
   webhooks, db) are mocked so we exercise the wiring without the network/DB. */

vi.mock("@/modules/signals/data-sources/postcodes", () => ({ geocodeArea: vi.fn() }));
vi.mock("@/modules/signals/data-sources/police", () => ({ getCrimeData: vi.fn(), formatCrimeDataForPrompt: () => "CRIME" }));
vi.mock("@/modules/signals/data-sources/deprivation", () => ({ getDeprivationData: vi.fn(), formatDeprivationForPrompt: () => "DEP" }));
vi.mock("@/modules/signals/data-sources/openstreetmap", () => ({ getNearbyAmenities: vi.fn(), formatAmenitiesForPrompt: () => "AMEN" }));
vi.mock("@/modules/signals/data-sources/flood", () => ({ getFloodRisk: vi.fn(), formatFloodRiskForPrompt: () => "FLOOD" }));
vi.mock("@/modules/signals/data-sources/land-registry", () => ({ getPropertyPrices: vi.fn(), formatPropertyDataForPrompt: () => "PROP" }));
vi.mock("@/modules/signals/data-sources/ofsted", () => ({ getOfstedSchools: vi.fn(), formatOfstedForPrompt: () => "OFSTED" }));
vi.mock("@/modules/cache/area-cache", () => ({ getCachedAreaResult: vi.fn(), setCachedAreaResult: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/modules/webhooks", () => ({ fireWebhookEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { geocodeArea } from "@/modules/signals/data-sources/postcodes";
import { getCrimeData } from "@/modules/signals/data-sources/police";
import { getDeprivationData } from "@/modules/signals/data-sources/deprivation";
import { getNearbyAmenities } from "@/modules/signals/data-sources/openstreetmap";
import { getFloodRisk } from "@/modules/signals/data-sources/flood";
import { getPropertyPrices } from "@/modules/signals/data-sources/land-registry";
import { getOfstedSchools } from "@/modules/signals/data-sources/ofsted";
import { getCachedAreaResult, setCachedAreaResult } from "@/modules/cache/area-cache";
import { trackEvent } from "@/modules/tracking/activity";
import { fireWebhookEvent } from "@/modules/webhooks";
import { sql } from "@/infrastructure/db/client";
import { computeScores } from "@/modules/engine/scoring-engine";
import { METHODOLOGY_VERSION } from "@/modules/engine/methodology";
import type { GeocodedArea } from "@/modules/signals/data-sources/postcodes";
import type { CrimeSummary, PropertyPriceData, OfstedData } from "@/modules/signals/inputs";
import type { AreaReport } from "@onegoodarea/contracts";
import { generateReport } from "@/modules/reports/report-generator";

const GEO: GeocodedArea = {
  query: "M1 1AE",
  latitude: 53.4,
  longitude: -2.2,
  admin_district: "Manchester",
  region: "North West",
  ward: "Piccadilly",
  constituency: "Manchester Central",
  country: "England",
  lsoa: "E01033677",
  lsoa11: "E01005227",
  msoa: "E02001234",
  rural_urban: "Urban major conurbation",
  area_type: "urban",
};

const CRIME: CrimeSummary = {
  total_crimes: 120,
  months_covered: 3,
  by_category: { "Violent Crime": 40, "Anti Social Behaviour": 80 },
  top_streets: [{ name: "High Street", count: 12 }],
  outcome_breakdown: { "Under investigation": 120 },
  monthly_trend: [
    { month: "2025-11", count: 60 },
    { month: "2025-12", count: 60 },
  ],
};

const PROPERTY: PropertyPriceData = {
  postcode_area: "M1",
  median_price: 250000,
  mean_price: 260000,
  transaction_count: 83,
  price_change_pct: -5,
  by_property_type: [{ type: "Flat", median: 220000, count: 50 }],
  tenure_split: { freehold: 10, leasehold: 73 },
  price_range: { min: 120000, max: 600000 },
  period: "Jan 2025 to Jan 2026",
  prior_median: 263000,
};

const OFSTED: OfstedData = {
  schools: [
    { urn: 1, school_name: "St Mary's", phase: "Primary", overall_rating: 1, rating_text: "Outstanding", inspection_date: "2024-01-01", distance_km: 0.3 },
  ],
  total_rated: 1,
  rating_breakdown: { Outstanding: 1 },
  inspectorate: "Ofsted",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_AI_PROVIDER = "mock";
  // The mock truncates to this many chars; the assembled report JSON is larger,
  // so lift the limit to avoid truncating the JSON the orchestrator parses.
  process.env.OGA_MOCK_AI_TOKEN_LIMIT = "1000000";
  vi.mocked(sql).mockResolvedValue([] as never);
  vi.mocked(setCachedAreaResult).mockResolvedValue(undefined);
});

describe("generateReport (cache miss)", () => {
  beforeEach(() => {
    vi.mocked(getCachedAreaResult).mockResolvedValue(null);
    vi.mocked(geocodeArea).mockResolvedValue(GEO);
    vi.mocked(getCrimeData).mockResolvedValue(CRIME);
    vi.mocked(getDeprivationData).mockResolvedValue(null);
    vi.mocked(getNearbyAmenities).mockResolvedValue(null);
    vi.mocked(getFloodRisk).mockResolvedValue(null);
    vi.mocked(getPropertyPrices).mockResolvedValue(PROPERTY);
    vi.mocked(getOfstedSchools).mockResolvedValue(OFSTED);
  });

  it("generates, enforces deterministic scores, attaches metadata and persists", async () => {
    const expected = computeScores("research", CRIME, null, null, null, "urban", PROPERTY, OFSTED);

    const { id, report } = await generateReport("Manchester", "research", "user_1");

    expect(id).toMatch(/^rpt_/);
    expect(report.area).toBe("Manchester");                 // echoed by the mock from the prompt
    expect(report.areaiq_score).toBe(expected.overall);     // engine value enforced over the AI's
    expect(report.area_type).toBe("urban");
    expect(report.confidence).toBe(expected.confidence);
    expect(report.engine_version).toBe(METHODOLOGY_VERSION);
    expect(report.sub_scores[0].score).toBe(expected.dimensions[0].score);

    // metadata attachments
    expect(report.property_data?.median_price).toBe(250000);
    expect(report.schools_data?.inspectorate).toBe("Ofsted");
    const sources = (report.data_freshness ?? []).map((f) => f.source);
    expect(sources).toContain("police.uk");
    expect(sources).toContain("HM Land Registry");
    expect(sources).toContain("Ofsted");

    // side effects
    expect(trackEvent).toHaveBeenCalledWith("report.cache_miss", "user_1", { area: "Manchester", intent: "research" });
    expect(sql).toHaveBeenCalledTimes(1); // reports INSERT
    expect(setCachedAreaResult).toHaveBeenCalledOnce();
    expect(fireWebhookEvent).toHaveBeenCalledWith(
      "user_1",
      "report.created",
      expect.objectContaining({ report_id: id, area: "Manchester" })
    );
  });
});

describe("generateReport (cache hit)", () => {
  it("returns the cached report, records a cache_hit and skips generation", async () => {
    const cachedReport = {
      area: "Manchester",
      intent: "research",
      areaiq_score: 71,
      sub_scores: [],
      summary: "cached",
      sections: [],
      recommendations: [],
      generated_at: "2026-01-01T00:00:00.000Z",
    } as AreaReport;
    vi.mocked(getCachedAreaResult).mockResolvedValue({
      report: cachedReport,
      area: "Manchester",
      score: 71,
      created_at: "2026-01-01",
    });

    const { id, report } = await generateReport("Manchester", "research", "user_1");

    expect(id).toMatch(/^rpt_/);
    expect(report).toBe(cachedReport);
    expect(trackEvent).toHaveBeenCalledWith("report.cache_hit", "user_1", { area: "Manchester", intent: "research" });
    expect(sql).toHaveBeenCalledTimes(1); // saved to the user's reports table for the dashboard
    expect(geocodeArea).not.toHaveBeenCalled();
    expect(fireWebhookEvent).not.toHaveBeenCalled();
  });
});
