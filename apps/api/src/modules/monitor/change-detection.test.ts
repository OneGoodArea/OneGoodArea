import { describe, it, expect, vi } from "vitest";

vi.mock("./portfolio", () => ({ getPortfolio: vi.fn() }));

import {
  diffSeries,
  buildChanges,
  readTimeseriesForLsoas,
  resolveAreasToLsoa,
  detectPortfolioChanges,
  type Reader,
  type TimeseriesRow,
} from "./change-detection";
import { getPortfolio } from "./portfolio";

const mockGetPortfolio = vi.mocked(getPortfolio);

describe("diffSeries", () => {
  const opts = { baseline: "first" as const, thresholdPct: 5 };

  it("returns null with fewer than two periods", () => {
    expect(diffSeries({ signalKey: "property.median_price", label: "Median", area: "M1 1AE", geoCode: "E01000001", points: [{ period: "2025-01", value: 100 }] }, opts)).toBeNull();
  });

  it("computes delta, pct and direction (baseline=first = oldest in range)", () => {
    const c = diffSeries({
      signalKey: "property.median_price", label: "Median sale price", area: "M1 1AE", geoCode: "E01000001",
      points: [{ period: "2025-01", value: 200000 }, { period: "2025-06", value: 230000 }, { period: "2025-12", value: 250000 }],
    }, opts)!;
    expect(c.period_from).toBe("2025-01");
    expect(c.period_to).toBe("2025-12");
    expect(c.value_from).toBe(200000);
    expect(c.value_to).toBe(250000);
    expect(c.delta).toBe(50000);
    expect(c.pct_change).toBe(25); // 50k / 200k
    expect(c.direction).toBe("up");
    expect(c.material).toBe(true);
  });

  it("baseline=previous compares the two most recent periods", () => {
    const c = diffSeries({
      signalKey: "property.median_price", label: "M", area: "A", geoCode: "E01000001",
      points: [{ period: "2025-01", value: 100 }, { period: "2025-11", value: 200 }, { period: "2025-12", value: 210 }],
    }, { baseline: "previous", thresholdPct: 5 })!;
    expect(c.period_from).toBe("2025-11");
    expect(c.value_from).toBe(200);
    expect(c.value_to).toBe(210);
    expect(c.pct_change).toBe(5);
  });

  it("sorts unordered points before diffing", () => {
    const c = diffSeries({
      signalKey: "s", label: null, area: "A", geoCode: "G",
      points: [{ period: "2025-12", value: 300 }, { period: "2025-01", value: 100 }],
    }, opts)!;
    expect(c.period_from).toBe("2025-01");
    expect(c.period_to).toBe("2025-12");
  });

  it("flags a fall as direction=down", () => {
    const c = diffSeries({ signalKey: "s", label: null, area: "A", geoCode: "G", points: [{ period: "2025-01", value: 300000 }, { period: "2025-12", value: 240000 }] }, opts)!;
    expect(c.direction).toBe("down");
    expect(c.pct_change).toBe(-20);
    expect(c.material).toBe(true);
  });

  it("is not material below the threshold", () => {
    const c = diffSeries({ signalKey: "s", label: null, area: "A", geoCode: "G", points: [{ period: "2025-01", value: 100000 }, { period: "2025-12", value: 102000 }] }, opts)!;
    expect(c.pct_change).toBe(2);
    expect(c.material).toBe(false);
  });

  it("pct_change is null when the baseline value is 0", () => {
    const c = diffSeries({ signalKey: "s", label: null, area: "A", geoCode: "G", points: [{ period: "2025-01", value: 0 }, { period: "2025-12", value: 5 }] }, opts)!;
    expect(c.pct_change).toBeNull();
    expect(c.material).toBe(false);
    expect(c.direction).toBe("up");
  });
});

describe("buildChanges", () => {
  const rows: TimeseriesRow[] = [
    { signal_key: "property.median_price", label: "Median sale price", geo_code: "E01000001", observed_period: "2025-01", raw_value: 200000 },
    { signal_key: "property.median_price", label: "Median sale price", geo_code: "E01000001", observed_period: "2025-12", raw_value: 260000 },
    { signal_key: "property.transaction_count", label: "Transactions", geo_code: "E01000001", observed_period: "2025-01", raw_value: 10 },
    { signal_key: "property.transaction_count", label: "Transactions", geo_code: "E01000001", observed_period: "2025-12", raw_value: 10 }, // flat
    { signal_key: "deprivation.imd_decile", label: "Decile", geo_code: "E01000001", observed_period: "IMD 2025", raw_value: 5 }, // single period
  ];

  it("returns only material, area-centric changes", () => {
    const out = buildChanges([{ area: "M1 1AE", geoCode: "E01000001" }], rows, { baseline: "first", thresholdPct: 5 });
    expect(out).toHaveLength(1); // price moved 30%; txn flat (0%); deprivation single-period
    expect(out[0]!.signal_key).toBe("property.median_price");
    expect(out[0]!.area).toBe("M1 1AE");
    expect(out[0]!.pct_change).toBe(30);
  });

  it("emits one change per area when two areas share an LSOA", () => {
    const out = buildChanges(
      [{ area: "M1 1AE", geoCode: "E01000001" }, { area: "M1 1AF", geoCode: "E01000001" }],
      rows, { baseline: "first", thresholdPct: 5 },
    );
    expect(out.map((c) => c.area).sort()).toEqual(["M1 1AE", "M1 1AF"]);
  });

  it("skips areas with no stored series", () => {
    expect(buildChanges([{ area: "ZZ", geoCode: "E09999999" }], rows, { baseline: "first", thresholdPct: 5 })).toEqual([]);
  });
});

describe("readTimeseriesForLsoas", () => {
  it("returns [] without querying for no LSOAs", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readTimeseriesForLsoas([], run)).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it("binds the LSOA array and coerces raw_value to number|null", async () => {
    const run = vi.fn<Reader>(async () => [
      { signal_key: "property.median_price", label: "Median", geo_code: "E01000001", observed_period: "2025-12", raw_value: "260000" },
      { signal_key: "property.median_price", label: "Median", geo_code: "E01000001", observed_period: "2025-11", raw_value: null },
    ]);
    const out = await readTimeseriesForLsoas(["E01000001"], run);
    expect(run.mock.calls[0]![1]).toEqual([["E01000001"]]);
    expect(out[0]!.raw_value).toBe(260000);
    expect(out[1]!.raw_value).toBeNull();
  });
});

describe("resolveAreasToLsoa", () => {
  it("resolves via the injected geocoder, dropping the unresolvable", async () => {
    const geocode = async (a: string) => (a === "M1 1AE" ? { lsoa: "E01005207" } : null);
    const out = await resolveAreasToLsoa([{ area: "M1 1AE" }, { area: "nowhere" }], geocode);
    expect(out).toEqual([{ area: "M1 1AE", geoCode: "E01005207" }]);
  });

  it("survives a geocoder that throws", async () => {
    const geocode = async () => { throw new Error("boom"); };
    expect(await resolveAreasToLsoa([{ area: "x" }], geocode)).toEqual([]);
  });
});

describe("detectPortfolioChanges", () => {
  it("returns null when the portfolio is not owned", async () => {
    mockGetPortfolio.mockResolvedValue(null);
    expect(await detectPortfolioChanges("u1", "pf_x")).toBeNull();
  });

  it("resolves, diffs, fires signal.changed, and reports", async () => {
    mockGetPortfolio.mockResolvedValue({
      id: "pf_1", name: "Book", created_at: "", area_count: 1,
      areas: [{ id: "a1", area: "M1 1AE", label: null }],
    });
    const run: Reader = async () => [
      { signal_key: "property.median_price", label: "Median sale price", geo_code: "E01005207", observed_period: "2025-01", raw_value: 200000 },
      { signal_key: "property.median_price", label: "Median sale price", geo_code: "E01005207", observed_period: "2025-12", raw_value: 260000 },
    ];
    const fire = vi.fn<(userId: string, change: unknown) => Promise<void>>();

    const report = await detectPortfolioChanges("u1", "pf_1", {
      baseline: "first",
      run,
      geocode: async () => ({ lsoa: "E01005207" }),
      fire,
    });

    expect(report!.areas_checked).toBe(1);
    expect(report!.material_count).toBe(1);
    expect(report!.changes[0]!.pct_change).toBe(30);
    expect(report!.baseline).toBe("first");
    expect(fire).toHaveBeenCalledTimes(1);
    expect(fire.mock.calls[0]![0]).toBe("u1");
  });

  it("does not fire when emit is false", async () => {
    mockGetPortfolio.mockResolvedValue({
      id: "pf_2", name: "B", created_at: "", area_count: 1,
      areas: [{ id: "a1", area: "M1 1AE", label: null }],
    });
    const run: Reader = async () => [
      { signal_key: "property.median_price", label: "M", geo_code: "E01005207", observed_period: "2025-01", raw_value: 100000 },
      { signal_key: "property.median_price", label: "M", geo_code: "E01005207", observed_period: "2025-12", raw_value: 150000 },
    ];
    const fire = vi.fn<(userId: string, change: unknown) => Promise<void>>();
    const report = await detectPortfolioChanges("u1", "pf_2", { baseline: "first", emit: false, run, geocode: async () => ({ lsoa: "E01005207" }), fire });
    expect(report!.material_count).toBe(1);
    expect(fire).not.toHaveBeenCalled();
  });
});
