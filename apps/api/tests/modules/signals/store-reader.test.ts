import { describe, it, expect, vi } from "vitest";
import {
  readDeprivationFromStore,
  readDeprivationNormalization,
  readPropertyFromStore,
  readPropertyNormalization,
  readCrimeFromStore,
  readCrimeNormalization,
  computeYoY,
  type Reader,
} from "@/modules/signals/store-reader";

describe("readDeprivationFromStore", () => {
  it("reconstructs DeprivationData when both rank and decile are stored", async () => {
    const run: Reader = async () => [
      { signal_key: "deprivation.imd_rank", raw_value: 5000 },
      { signal_key: "deprivation.imd_decile", raw_value: 5 },
    ];
    const d = await readDeprivationFromStore("E01000001", run);
    expect(d).toEqual({ lsoa_code: "E01000001", lsoa_name: "", local_authority: "", imd_rank: 5000, imd_decile: 5 });
  });

  it("returns null (→ live fallback) when only one of rank/decile is present", async () => {
    const run: Reader = async () => [{ signal_key: "deprivation.imd_decile", raw_value: 5 }];
    expect(await readDeprivationFromStore("E01000001", run)).toBeNull();
  });

  it("returns null on no rows (e.g. a Wales/Scotland code not yet matched)", async () => {
    const run: Reader = async () => [];
    expect(await readDeprivationFromStore("W01000001", run)).toBeNull();
  });

  it("returns null for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readDeprivationFromStore("", run)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("binds the geo code as a parameter", async () => {
    const run = vi.fn<Reader>(async () => []);
    await readDeprivationFromStore("E01000009", run);
    expect(run.mock.calls[0][1]).toEqual(["E01000009"]);
  });
});

describe("readDeprivationNormalization", () => {
  it("maps normalized_value + percentile by signal key", async () => {
    const run: Reader = async () => [
      { signal_key: "deprivation.imd_rank", normalized_value: 0.786, percentile: "78.58" },
      { signal_key: "deprivation.imd_decile", normalized_value: 0.5, percentile: null },
    ];
    const m = await readDeprivationNormalization("E01000001", run);
    expect(m["deprivation.imd_rank"]).toEqual({ normalized_value: 0.786, percentile: 78.58 });
    expect(m["deprivation.imd_decile"]).toEqual({ normalized_value: 0.5, percentile: null });
  });

  it("returns {} for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readDeprivationNormalization("", run)).toEqual({});
    expect(run).not.toHaveBeenCalled();
  });
});

describe("readPropertyFromStore", () => {
  it("reconstructs a PropertyPriceData the mapper + engine can read", async () => {
    const run: Reader = async () => [
      { signal_key: "property.median_price", raw_value: 285000, observed_period: "2025-01 to 2025-12" },
      { signal_key: "property.transaction_count", raw_value: 42, observed_period: "2025-01 to 2025-12" },
    ];
    const p = await readPropertyFromStore("E01000001", run);
    expect(p).toMatchObject({
      postcode_area: "E01000001",
      median_price: 285000,
      transaction_count: 42,
      price_change_pct: null,
      prior_median: null,
      period: "2025-01 to 2025-12",
    });
    // unused fields are safe-filled, not undefined
    expect(p!.by_property_type).toEqual([]);
    expect(p!.price_range).toEqual({ min: 285000, max: 285000 });
  });

  it("returns null (→ live fallback) when there is no usable median", async () => {
    const run: Reader = async () => [{ signal_key: "property.transaction_count", raw_value: 3, observed_period: "2025-06" }];
    expect(await readPropertyFromStore("E01000001", run)).toBeNull();
  });

  it("returns null when the median is non-positive", async () => {
    const run: Reader = async () => [{ signal_key: "property.median_price", raw_value: 0, observed_period: "2025-06" }];
    expect(await readPropertyFromStore("E01000001", run)).toBeNull();
  });

  it("returns null on no rows (e.g. a Scotland LSOA — Land Registry is E&W only)", async () => {
    const run: Reader = async () => [];
    expect(await readPropertyFromStore("S01000001", run)).toBeNull();
  });

  it("defaults transaction_count to 0 if the count row is absent", async () => {
    const run: Reader = async () => [{ signal_key: "property.median_price", raw_value: 200000, observed_period: "2025-06" }];
    expect((await readPropertyFromStore("E01000001", run))!.transaction_count).toBe(0);
  });

  it("returns null for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readPropertyFromStore("", run)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("serves YoY when two years of monthly history are present", async () => {
    const run: Reader = async (text) => {
      if (text.includes("signal_timeseries")) {
        return [
          // 2024: weighted mean = (200000*10) / 10 = 200000
          { signal_key: "property.median_price", observed_period: "2024-06", raw_value: 200000 },
          { signal_key: "property.transaction_count", observed_period: "2024-06", raw_value: 10 },
          // 2025: weighted mean = (240000*10) / 10 = 240000  -> +20% YoY
          { signal_key: "property.median_price", observed_period: "2025-06", raw_value: 240000 },
          { signal_key: "property.transaction_count", observed_period: "2025-06", raw_value: 10 },
        ];
      }
      return [
        { signal_key: "property.median_price", raw_value: 245000, observed_period: "2025-01 to 2025-12" },
        { signal_key: "property.transaction_count", raw_value: 30, observed_period: "2025-01 to 2025-12" },
      ];
    };
    const p = await readPropertyFromStore("E01000001", run);
    expect(p!.median_price).toBe(245000); // headline = the stored annual median
    expect(p!.price_change_pct).toBe(20); // YoY from the time-series
    expect(p!.prior_median).toBe(200000);
  });
});

describe("computeYoY", () => {
  it("returns nulls with fewer than two years", () => {
    expect(computeYoY([
      { signal_key: "property.median_price", observed_period: "2025-06", raw_value: 200000 },
      { signal_key: "property.transaction_count", observed_period: "2025-06", raw_value: 5 },
    ])).toEqual({ price_change_pct: null, prior_median: null });
  });

  it("volume-weights monthly medians within a year", () => {
    const r = computeYoY([
      // 2024: (100*1 + 300*9)/10 = 280
      { signal_key: "property.median_price", observed_period: "2024-01", raw_value: 100 },
      { signal_key: "property.transaction_count", observed_period: "2024-01", raw_value: 1 },
      { signal_key: "property.median_price", observed_period: "2024-02", raw_value: 300 },
      { signal_key: "property.transaction_count", observed_period: "2024-02", raw_value: 9 },
      // 2025: 350 flat
      { signal_key: "property.median_price", observed_period: "2025-01", raw_value: 350 },
      { signal_key: "property.transaction_count", observed_period: "2025-01", raw_value: 10 },
    ]);
    expect(r.prior_median).toBe(280); // 2024 volume-weighted
    expect(r.price_change_pct).toBe(25); // (350-280)/280
  });

  it("ignores months with no transactions (can't weight)", () => {
    const r = computeYoY([
      { signal_key: "property.median_price", observed_period: "2024-06", raw_value: 200000 },
      { signal_key: "property.transaction_count", observed_period: "2024-06", raw_value: 8 },
      { signal_key: "property.median_price", observed_period: "2025-06", raw_value: 250000 },
      { signal_key: "property.transaction_count", observed_period: "2025-06", raw_value: 0 }, // 0 -> skip year 2025
    ]);
    expect(r).toEqual({ price_change_pct: null, prior_median: null }); // only 2024 usable
  });
});

describe("readCrimeFromStore", () => {
  // run distinguishes the signal_values query from the timeseries query
  const makeRun = (total: number | null, violent: number | null, trend: { p: string; v: number }[]): Reader =>
    async (text) => {
      if (text.includes("signal_timeseries")) return trend.map((t) => ({ observed_period: t.p, raw_value: t.v }));
      const out: Record<string, unknown>[] = [];
      if (total !== null) out.push({ signal_key: "crime.total_12m", raw_value: total });
      if (violent !== null) out.push({ signal_key: "crime.violent_12m", raw_value: violent });
      return out;
    };

  it("reconstructs CrimeSummary with a real monthly trend (ascending)", async () => {
    const run = makeRun(240, 40, [
      { p: "2025-12", v: 22 }, { p: "2025-11", v: 19 }, { p: "2025-10", v: 18 }, // returned DESC by the query
    ]);
    const c = (await readCrimeFromStore("E01005207", run))!;
    expect(c.total_crimes).toBe(240);
    expect(c.months_covered).toBe(3);
    expect(c.by_category).toEqual({ "Violence and sexual offences": 40 });
    expect(c.monthly_trend.map((m) => m.month)).toEqual(["2025-10", "2025-11", "2025-12"]); // ascending
    expect(c.top_streets).toEqual([]);
  });

  it("leaves by_category empty when no violent count is stored", async () => {
    const run = makeRun(100, null, [{ p: "2025-12", v: 10 }]);
    expect((await readCrimeFromStore("E01000001", run))!.by_category).toEqual({});
  });

  it("returns null (→ live fallback) when crime.total_12m is absent", async () => {
    const run = makeRun(null, null, []);
    expect(await readCrimeFromStore("E01000001", run)).toBeNull();
  });

  it("returns null for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readCrimeFromStore("", run)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("readCrimeNormalization", () => {
  it("maps normalized_value + percentile for crime.total_12m", async () => {
    const run: Reader = async () => [{ signal_key: "crime.total_12m", normalized_value: 0.42, percentile: "41.50" }];
    const m = await readCrimeNormalization("E01005207", run);
    expect(m["crime.total_12m"]).toEqual({ normalized_value: 0.42, percentile: 41.5 });
  });

  it("returns {} for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readCrimeNormalization("", run)).toEqual({});
    expect(run).not.toHaveBeenCalled();
  });
});

describe("readPropertyNormalization", () => {
  it("maps normalized_value + percentile for median_price", async () => {
    const run: Reader = async () => [
      { signal_key: "property.median_price", normalized_value: 0.99, percentile: "99.24" },
    ];
    const m = await readPropertyNormalization("E01000002", run);
    expect(m["property.median_price"]).toEqual({ normalized_value: 0.99, percentile: 99.24 });
  });

  it("returns {} for an empty geo code without querying", async () => {
    const run = vi.fn<Reader>(async () => []);
    expect(await readPropertyNormalization("", run)).toEqual({});
    expect(run).not.toHaveBeenCalled();
  });
});
