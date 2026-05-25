import { describe, it, expect, vi } from "vitest";
import { readDeprivationFromStore, readDeprivationNormalization, type Reader } from "./store-reader";

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
