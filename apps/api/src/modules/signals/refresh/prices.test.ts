import { describe, it, expect } from "vitest";
import {
  parsePpRow,
  medianOf,
  priceConfidence,
  addToBuckets,
  aggregateTransactions,
  bucketsToRows,
  loadPostcodeLsoaMap,
  landRegistryYearUrl,
  runPricesRefresh,
  PRICES_SIGNALS,
  type PriceBuckets,
  type PpTransaction,
} from "./prices";

/* A PP CSV row (no header). Columns: 0 GUID, 1 price, 2 date, 3 postcode,
   4 type, 5 old/new, 6 duration, 7 PAON, 8 SAON, 9 street, 10 locality,
   11 town, 12 district, 13 county, 14 PPD category, 15 record status. */
function ppRow(over: Partial<Record<number, string>> = {}): string[] {
  const f = [
    "{GUID}", "350000", "2024-03-14 00:00", "M1 1AE", "T", "N", "F",
    "12", "", "DEANSGATE", "", "MANCHESTER", "MANCHESTER", "GREATER MANCHESTER", "A", "A",
  ];
  for (const [k, v] of Object.entries(over)) if (v !== undefined) f[Number(k)] = v;
  return f;
}

describe("parsePpRow", () => {
  it("parses a standard residential sale", () => {
    expect(parsePpRow(ppRow())).toEqual({ postcode: "M1 1AE", price: 350000, ym: "2024-03" });
  });
  it("normalizes the postcode to the spine key shape", () => {
    expect(parsePpRow(ppRow({ 3: "m11ae" }))?.postcode).toBe("M1 1AE");
  });
  it("skips deleted records", () => {
    expect(parsePpRow(ppRow({ 15: "D" }))).toBeNull();
  });
  it("skips non-standard (category B) sales", () => {
    expect(parsePpRow(ppRow({ 14: "B" }))).toBeNull();
  });
  it("skips 'other' (non-residential) property type", () => {
    expect(parsePpRow(ppRow({ 4: "O" }))).toBeNull();
  });
  it("skips rows with no postcode", () => {
    expect(parsePpRow(ppRow({ 3: "" }))).toBeNull();
  });
  it("skips non-positive / non-numeric prices", () => {
    expect(parsePpRow(ppRow({ 1: "0" }))).toBeNull();
    expect(parsePpRow(ppRow({ 1: "n/a" }))).toBeNull();
  });
  it("rejects a malformed date", () => {
    expect(parsePpRow(ppRow({ 2: "garbage" }))).toBeNull();
  });
  it("returns null for a short row", () => {
    expect(parsePpRow(["a", "1"])).toBeNull();
  });
});

describe("medianOf", () => {
  it("returns 0 for empty", () => expect(medianOf([])).toBe(0));
  it("odd length -> middle", () => expect(medianOf([300, 100, 200])).toBe(200));
  it("even length -> rounded mean of the two middles", () => {
    expect(medianOf([100, 200, 300, 401])).toBe(250); // (200+300)/2
  });
  it("does not mutate its input", () => {
    const xs = [3, 1, 2];
    medianOf(xs);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe("priceConfidence", () => {
  it("scales with sample size", () => {
    expect(priceConfidence(1)).toBe(0.4);
    expect(priceConfidence(3)).toBe(0.6);
    expect(priceConfidence(7)).toBe(0.75);
    expect(priceConfidence(25)).toBe(0.9);
  });
});

describe("addToBuckets / aggregateTransactions", () => {
  it("buckets prices by (lsoa, month)", () => {
    const b: PriceBuckets = new Map();
    addToBuckets(b, "E01000001", "2024-03", 100);
    addToBuckets(b, "E01000001", "2024-03", 200);
    addToBuckets(b, "E01000001", "2024-04", 300);
    expect(b.get("E01000001")!.get("2024-03")).toEqual([100, 200]);
    expect(b.get("E01000001")!.get("2024-04")).toEqual([300]);
  });

  it("maps postcodes to LSOAs and counts the unmapped", () => {
    const txns: PpTransaction[] = [
      { postcode: "M1 1AE", price: 100, ym: "2024-03" },
      { postcode: "M1 1AE", price: 300, ym: "2024-03" },
      { postcode: "ZZ9 9ZZ", price: 999, ym: "2024-03" },
    ];
    const map = new Map([["M1 1AE", "E01000001"]]);
    const { buckets, unmapped } = aggregateTransactions(txns, map);
    expect(unmapped).toBe(1);
    expect(buckets.get("E01000001")!.get("2024-03")).toEqual([100, 300]);
  });
});

describe("bucketsToRows", () => {
  it("emits every month as history and a window-median + total count as current", () => {
    const { buckets } = aggregateTransactions(
      [
        { postcode: "M1 1AE", price: 100, ym: "2024-01" },
        { postcode: "M1 1AE", price: 300, ym: "2024-01" },
        { postcode: "M1 1AE", price: 500, ym: "2024-02" },
      ],
      new Map([["M1 1AE", "E01000001"]]),
    );
    const { signalValues, timeseriesRows, latestPeriod } = bucketsToRows(buckets, "snap_1");

    expect(latestPeriod).toBe("2024-02");
    // history: 2 signals x 2 months = 4 rows
    expect(timeseriesRows).toHaveLength(4);
    // current: 2 signals, one window aggregate each
    expect(signalValues).toHaveLength(2);

    const curMedian = signalValues.find((r) => r.signal_key === "property.median_price")!;
    expect(curMedian.observed_period).toBe("2024-01 to 2024-02"); // window label
    expect(curMedian.raw_value).toBe(300); // median of ALL sales [100,300,500]
    const curCount = signalValues.find((r) => r.signal_key === "property.transaction_count")!;
    expect(curCount.raw_value).toBe(3); // total across the window

    const janMedian = timeseriesRows.find((r) => r.observed_period === "2024-01" && r.signal_key === "property.median_price")!;
    expect(janMedian.raw_value).toBe(200); // monthly median of [100,300]
    expect(janMedian.geo_code).toBe("E01000001");
  });

  it("labels the window as a single month when there is only one", () => {
    const { buckets } = aggregateTransactions(
      [{ postcode: "M1 1AE", price: 250, ym: "2025-06" }],
      new Map([["M1 1AE", "E01000001"]]),
    );
    const { signalValues } = bucketsToRows(buckets, "snap_2");
    expect(signalValues.find((r) => r.signal_key === "property.median_price")!.observed_period).toBe("2025-06");
  });
});

describe("landRegistryYearUrl", () => {
  it("builds the yearly file URL", () => {
    expect(landRegistryYearUrl(2024)).toContain("pp-2024.csv");
  });
});

describe("loadPostcodeLsoaMap", () => {
  it("keyset-pages until a short page and only keeps E/W postcodes from the query", async () => {
    const pages = [
      [{ postcode: "AA1 1AA", lsoa_code: "E01000001" }, { postcode: "AA1 1AB", lsoa_code: "E01000002" }],
      [{ postcode: "AA1 1AC", lsoa_code: "W01000001" }],
    ];
    const run = async (_t: string, params: unknown[]) => {
      // page by the `after` cursor ($1)
      const after = params[0] as string;
      if (after === "") return pages[0];
      if (after === "AA1 1AB") return pages[1];
      return [];
    };
    const map = await loadPostcodeLsoaMap(run, 2);
    expect(map.size).toBe(3);
    expect(map.get("AA1 1AC")).toBe("W01000001");
  });
});

describe("runPricesRefresh (injected lines + map + run)", () => {
  it("streams, aggregates, and writes catalog/snapshot/timeseries/values", async () => {
    const writes: Record<string, number> = {};
    const run = async (text: string, params: unknown[]) => {
      const m = text.match(/INSERT INTO (\w+)/);
      if (m) writes[m[1]!] = (writes[m[1]!] ?? 0) + (params.length ? 1 : 1);
      return [];
    };

    const lines = async function* () {
      yield ppRow({ 1: "200000", 2: "2024-01-10 00:00", 3: "M1 1AE" }).join(",");
      yield ppRow({ 1: "400000", 2: "2024-01-20 00:00", 3: "M1 1AE" }).join(",");
      yield ppRow({ 1: "650000", 2: "2024-02-05 00:00", 3: "M1 1AE" }).join(",");
      yield ppRow({ 14: "B" }).join(","); // skipped (category B)
    };

    const summary = await runPricesRefresh({
      run,
      lines,
      postcodeToLsoa: new Map([["M1 1AE", "E01000001"]]),
      makeId: () => "snap_test",
    });

    expect(summary.parsed).toBe(3); // the B row is skipped
    expect(summary.unmapped).toBe(0);
    expect(summary.lsoas).toBe(1);
    expect(summary.periods).toBe(2);
    expect(summary.latestPeriod).toBe("2024-02");
    expect(summary.signalValues).toBe(2);     // 2 signals, latest month
    expect(summary.timeseriesRows).toBe(4);   // 2 signals x 2 months
    expect(writes.signals).toBeGreaterThan(0);
    expect(writes.source_snapshots).toBeGreaterThan(0);
    expect(writes.signal_timeseries).toBeGreaterThan(0);
    expect(writes.signal_values).toBeGreaterThan(0);
  });

  it("throws if the postcode->LSOA map is empty (spine not loaded)", async () => {
    await expect(
      runPricesRefresh({ run: async () => [], postcodeToLsoa: new Map(), lines: async function* () {} }),
    ).rejects.toThrow(/geo spine/i);
  });
});

describe("PRICES_SIGNALS catalog", () => {
  it("matches the area-profile property keys", () => {
    const keys = PRICES_SIGNALS.map((s) => s.key);
    expect(keys).toContain("property.median_price");
    expect(keys).toContain("property.transaction_count");
  });
});
