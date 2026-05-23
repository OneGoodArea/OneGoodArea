import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AreaReport } from "@onegoodarea/contracts";

/* The legacy src/lib/report-cache.ts shipped with no test. We mock the db
   client's tagged-template `sql` so the read/write/stats/cleanup logic is
   locked without a live Postgres: miss -> null, hit -> parsed report (object
   AND JSONB-string forms), upsert value binding, cleanup count, stats shape. */

vi.mock("../../infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("../tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sql } from "../../infrastructure/db/client";
import {
  normaliseCacheKey,
  getCachedReport,
  setCachedReport,
  getCacheStats,
  cleanupExpiredCache,
} from "./report-cache";

const mockSql = vi.mocked(sql);

function sampleReport(area = "London"): AreaReport {
  return {
    area,
    intent: "moving",
    areaiq_score: 72,
    sub_scores: [],
    summary: "Sample.",
    sections: [],
    recommendations: [],
    generated_at: "2026-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  mockSql.mockReset();
  // Default: no opportunistic cleanup fires (Math.random >= 0.02).
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normaliseCacheKey", () => {
  it("lowercases, strips separators, and appends the intent", () => {
    expect(normaliseCacheKey("M1 1AE", "Moving")).toBe("m11ae:moving");
    expect(normaliseCacheKey("St. Albans", "INVESTING")).toBe("stalbans:investing");
    expect(normaliseCacheKey("Stoke-on-Trent", "business")).toBe("stokeontrent:business");
  });
});

describe("getCachedReport", () => {
  it("returns null on a cache miss", async () => {
    mockSql.mockResolvedValue([] as never);
    const result = await getCachedReport("London", "moving");
    expect(result).toBeNull();
    expect(mockSql).toHaveBeenCalledTimes(1); // SELECT only, no hit_count update
  });

  it("returns the parsed report on a hit (report stored as object)", async () => {
    const report = sampleReport("London");
    mockSql.mockResolvedValue([
      { report, area: "London", score: 72, created_at: "2026-01-01" },
    ] as never);

    const result = await getCachedReport("London", "moving");
    expect(result).not.toBeNull();
    expect(result!.report.area).toBe("London");
    expect(result!.score).toBe(72);
    expect(result!.created_at).toBe("2026-01-01");
    expect(mockSql).toHaveBeenCalledTimes(2); // SELECT + fire-and-forget hit_count UPDATE
  });

  it("parses the report when JSONB comes back as a string", async () => {
    const report = sampleReport("Leeds");
    mockSql.mockResolvedValue([
      { report: JSON.stringify(report), area: "Leeds", score: 60, created_at: "2026-01-02" },
    ] as never);

    const result = await getCachedReport("Leeds", "moving");
    expect(result!.report.area).toBe("Leeds");
    expect(result!.report.areaiq_score).toBe(72);
  });
});

describe("setCachedReport", () => {
  it("binds key, serialized report, area and score into the upsert", async () => {
    mockSql.mockResolvedValue([] as never);
    const report = sampleReport("Bristol");

    await setCachedReport("Bristol", "moving", report, 81);

    expect(mockSql).toHaveBeenCalledTimes(1);
    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[1]).toBe("bristol:moving");        // cache_key
    expect(call[2]).toBe(JSON.stringify(report));  // report JSON
    expect(call[3]).toBe("Bristol");               // area
    expect(call[4]).toBe(81);                       // score
  });
});

describe("cleanupExpiredCache", () => {
  it("returns the number of deleted rows", async () => {
    mockSql.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }] as never);
    expect(await cleanupExpiredCache()).toBe(3);
  });

  it("returns 0 when nothing expired", async () => {
    mockSql.mockResolvedValue([] as never);
    expect(await cleanupExpiredCache()).toBe(0);
  });
});

describe("getCacheStats", () => {
  it("aggregates count, total hits, and the top-cached list", async () => {
    mockSql
      .mockResolvedValueOnce([{ count: 5 }] as never)
      .mockResolvedValueOnce([{ total: 42 }] as never)
      .mockResolvedValueOnce([
        { area: "London", hits: 9 },
        { area: "Leeds", hits: 3 },
      ] as never);

    const stats = await getCacheStats();
    expect(stats.totalEntries).toBe(5);
    expect(stats.totalHits).toBe(42);
    expect(stats.topCached).toEqual([
      { area: "London", hits: 9 },
      { area: "Leeds", hits: 3 },
    ]);
  });
});
