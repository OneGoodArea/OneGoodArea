import { describe, it, expect, vi } from "vitest";
import {
  toStoreRows,
  fetchArcGisAll,
  runDeprivationRefresh,
  COUNTRY_CONFIGS,
  DEPRIVATION_SIGNALS,
  type FetchFn,
} from "./deprivation";
import type { QueryRunner } from "./store-writer";

const ENGLAND = COUNTRY_CONFIGS.find((c) => c.country === "England")!;

function page(features: Record<string, unknown>[], exceededTransferLimit = false) {
  return { ok: true, status: 200, json: async () => ({ features: features.map((a) => ({ attributes: a })), exceededTransferLimit }) };
}

describe("toStoreRows (pure)", () => {
  const records = [
    { LSOA21CD: "E01000001", LSOA21NM: "City 1", IMDRank: 5000, IMDDecil: 5 },
    { LSOA21CD: "E01000002", LSOA21NM: "City 2", IMDRank: 100, IMDDecil: 1 },
    { LSOA21CD: "", IMDRank: 1, IMDDecil: 1 }, // no code -> skipped entirely
    { LSOA21CD: "E01000003", IMDRank: null, IMDDecil: 7 }, // rank missing -> only decile
  ];
  const { geoEntities, signalValues } = toStoreRows(records, ENGLAND, "snap_1");

  it("emits one geo entity per valid record", () => {
    expect(geoEntities).toHaveLength(3);
    expect(geoEntities[0]).toMatchObject({ geo_type: "lsoa", geo_code: "E01000001", country: "England", boundary_version: "2021" });
  });

  it("emits rank + decile values where numeric, skipping nulls", () => {
    const ranks = signalValues.filter((v) => v.signal_key === "deprivation.imd_rank");
    const deciles = signalValues.filter((v) => v.signal_key === "deprivation.imd_decile");
    expect(ranks).toHaveLength(2); // E01000003 rank is null
    expect(deciles).toHaveLength(3);
  });

  it("stamps period, snapshot id, confidence and engine version on each value", () => {
    const v = signalValues.find((s) => s.signal_key === "deprivation.imd_decile" && s.geo_code === "E01000001")!;
    expect(v.raw_value).toBe(5);
    expect(v.observed_period).toBe("IMD 2025");
    expect(v.source_snapshot_id).toBe("snap_1");
    expect(v.confidence).toBe(0.9);
    expect(v.engine_version).toBeTruthy();
  });

  it("uses signal keys that match the live area-profile catalog", () => {
    const keys = DEPRIVATION_SIGNALS.map((s) => s.key).sort();
    expect(keys).toEqual(["deprivation.imd_decile", "deprivation.imd_rank"]);
  });
});

describe("fetchArcGisAll", () => {
  it("pages until a short page is returned, offsetting by the count received", async () => {
    const seen: number[] = [];
    const fetchFn: FetchFn = async (url) => {
      const offset = Number(new URL(url).searchParams.get("resultOffset"));
      seen.push(offset);
      if (offset === 0) return page([{ LSOA21CD: "A" }, { LSOA21CD: "B" }]); // full page (==pageSize)
      return page([{ LSOA21CD: "C" }]); // short page -> stop
    };

    const records = await fetchArcGisAll(ENGLAND, fetchFn, 2);

    expect(records.map((r) => r.LSOA21CD)).toEqual(["A", "B", "C"]);
    expect(seen).toEqual([0, 2]); // two calls, offset advanced by 2
  });

  it("throws on a non-ok response", async () => {
    const fetchFn: FetchFn = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchArcGisAll(ENGLAND, fetchFn)).rejects.toThrow(/503/);
  });
});

describe("runDeprivationRefresh (injected network + db)", () => {
  it("seeds the catalog and writes a snapshot + geo + values per country", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    let n = 0;
    const makeId = () => `snap_${++n}`;

    const fetchFn: FetchFn = async (url) => {
      if (Number(new URL(url).searchParams.get("resultOffset")) > 0) return page([]);
      if (url.includes("EbKcOS6")) return page([{ LSOA21CD: "E01000001", LSOA21NM: "Eng", IMDRank: 1, IMDDecil: 1 }]);
      if (url.includes("3DS2hB")) return page([{ lsoa_code: "W01000001", lsoa_name0: "Wal", rank: 2, decile: 2 }]);
      return page([{ DataZone: "S01000001", DZName: "Sco", Rankv2: 3, Decilev2: 3 }]);
    };

    const summary = await runDeprivationRefresh({ fetchFn, run, makeId });

    expect(summary.catalog).toBe(2); // two deprivation signals
    expect(summary.countries.map((c) => c.country)).toEqual(["England", "Wales", "Scotland"]);
    expect(summary.countries.every((c) => c.geoEntities === 1 && c.signalValues === 2)).toBe(true);
    expect(summary.totalSignalValues).toBe(6); // 3 countries x (rank + decile)

    // catalog (1) + per country snapshot+geo+values (3 x 3) = 10 writes
    expect(run).toHaveBeenCalledTimes(10);
  });
});
