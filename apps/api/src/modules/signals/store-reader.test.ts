import { describe, it, expect, vi } from "vitest";
import {
  readDeprivationFromStore,
  readDeprivationNormalization,
  readPropertyFromStore,
  readPropertyNormalization,
  type Reader,
} from "./store-reader";

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
