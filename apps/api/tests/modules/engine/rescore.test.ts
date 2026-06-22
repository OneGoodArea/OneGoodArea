import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/signals/data-sources/postcodes", () => ({ geocodeArea: vi.fn() }));
vi.mock("@/modules/signals/data-sources/police", () => ({ getCrimeData: vi.fn() }));
vi.mock("@/modules/signals/data-sources/deprivation", () => ({ getDeprivationData: vi.fn() }));
vi.mock("@/modules/signals/data-sources/openstreetmap", () => ({ getNearbyAmenities: vi.fn() }));
vi.mock("@/modules/signals/data-sources/flood", () => ({ getFloodRisk: vi.fn() }));
vi.mock("@/modules/signals/data-sources/land-registry", () => ({ getPropertyPrices: vi.fn() }));
vi.mock("@/modules/signals/data-sources/ofsted", () => ({ getOfstedSchools: vi.fn() }));
vi.mock("@/modules/engine/scoring-engine", () => ({ computeScores: vi.fn() }));
vi.mock("@/modules/tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { runRescoreCron } from "@/modules/engine/rescore";
import { sql } from "@/infrastructure/db/client";
import { geocodeArea } from "@/modules/signals/data-sources/postcodes";
import { computeScores } from "@/modules/engine/scoring-engine";

const mockSql = vi.mocked(sql);
const mockGeocode = vi.mocked(geocodeArea);
const mockCompute = vi.mocked(computeScores);

function sqlCalls(substr: string) {
  return mockSql.mock.calls.filter((c) => (c[0] as unknown as string[]).join("?").includes(substr));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGeocode.mockResolvedValue({
    latitude: 53.4, longitude: -2.2, lsoa: "E01", lsoa11: "E01", query: "M1 1AE",
    area_type: "urban", country: "England",
  } as never);
  mockCompute.mockReturnValue({ overall: 72, confidence: 0.8, area_type: "urban", dimensions: {} } as never);
  mockSql.mockResolvedValue([] as never);
});

describe("runRescoreCron", () => {
  it("dry run: scores all 4 intents per postcode without writing to the DB", async () => {
    const summary = await runRescoreCron({ dryRun: true, postcodes: ["M1 1AE"] });
    expect(summary.postcodes_attempted).toBe(1);
    expect(summary.rows_written).toBe(4); // 4 intents
    expect(summary.failed).toEqual([]);
    expect(sqlCalls("INSERT INTO report_history")).toHaveLength(0);
    expect(summary.run_id).toMatch(/^run_/);
  });

  it("real run: inserts one report_history row per intent", async () => {
    const summary = await runRescoreCron({ dryRun: false, postcodes: ["M1 1AE"] });
    expect(summary.rows_written).toBe(4);
    expect(sqlCalls("INSERT INTO report_history")).toHaveLength(4);
  });

  it("records geocode failures and writes nothing for them", async () => {
    mockGeocode.mockResolvedValue(null as never);
    const summary = await runRescoreCron({ dryRun: false, postcodes: ["BAD"] });
    expect(summary.rows_written).toBe(0);
    expect(summary.failed).toEqual([{ postcode: "BAD", reason: "geocode failed" }]);
    expect(sqlCalls("INSERT INTO report_history")).toHaveLength(0);
  });

  it("respects the limit", async () => {
    const summary = await runRescoreCron({ dryRun: true, postcodes: ["A", "B", "C"], limit: 2 });
    expect(summary.postcodes_attempted).toBe(2);
    expect(summary.rows_written).toBe(8); // 2 postcodes x 4 intents
  });

  it("captures a per-postcode scoring error without aborting the run", async () => {
    mockCompute.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const summary = await runRescoreCron({ dryRun: true, postcodes: ["M1 1AE", "M2 2AE"] });
    expect(summary.failed).toHaveLength(1);
    expect(summary.failed[0].reason).toBe("boom");
    // The second postcode still scored.
    expect(summary.rows_written).toBe(4);
  });
});
