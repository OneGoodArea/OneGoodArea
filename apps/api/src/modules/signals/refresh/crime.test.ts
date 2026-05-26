import { describe, it, expect } from "vitest";
import {
  buildCrimeHeaderIndex,
  parseCrimeRow,
  addCrime,
  crimeBucketsToRows,
  runCrimeRefresh,
  CRIME_SIGNALS,
  type CrimeBuckets,
} from "./crime";

const HEADER = "Crime ID,Month,Reported by,Falls within,Longitude,Latitude,Location,LSOA code,LSOA name,Crime type,Last outcome category,Context";
const idx = buildCrimeHeaderIndex(HEADER.split(","));

function row(month: string, lsoa: string, type = "Anti-social behaviour"): string[] {
  return ["", month, "GMP", "GMP", "-2.2", "53.4", "On or near X", lsoa, "Name", type, "", ""];
}

describe("buildCrimeHeaderIndex", () => {
  it("locates Month + LSOA code case-insensitively", () => {
    expect(idx.month).toBe(1);
    expect(idx.lsoa).toBe(7);
  });
});

describe("parseCrimeRow", () => {
  it("parses month + LSOA", () => {
    expect(parseCrimeRow(row("2025-11", "E01005207"), idx)).toEqual({ lsoa: "E01005207", month: "2025-11" });
  });
  it("skips rows with no LSOA (e.g. BTP)", () => {
    expect(parseCrimeRow(row("2025-11", ""), idx)).toBeNull();
  });
  it("skips a malformed month", () => {
    expect(parseCrimeRow(row("nope", "E01005207"), idx)).toBeNull();
  });
});

describe("addCrime", () => {
  it("counts crimes per (lsoa, month)", () => {
    const b: CrimeBuckets = new Map();
    addCrime(b, "E01005207", "2025-11");
    addCrime(b, "E01005207", "2025-11");
    addCrime(b, "E01005207", "2025-12");
    expect(b.get("E01005207")!.get("2025-11")).toBe(2);
    expect(b.get("E01005207")!.get("2025-12")).toBe(1);
  });
});

describe("crimeBucketsToRows", () => {
  it("emits monthly counts as history + trailing total/rate as current", () => {
    const b: CrimeBuckets = new Map();
    // 13 distinct months (one crime each) so the trailing-12 window drops the oldest
    const months13 = [
      "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07",
      "2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01",
    ];
    for (const m of months13) addCrime(b, "E01000001", m);
    const { signalValues, timeseriesRows, months } = crimeBucketsToRows(b, "snap_1");
    expect(months).toBe(13);
    // 13 monthly history rows (one signal: monthly_count)
    expect(timeseriesRows.filter((r) => r.signal_key === "crime.monthly_count")).toHaveLength(13);
    // current: total_12m (12 of the 13 months) + monthly_rate
    const total = signalValues.find((r) => r.signal_key === "crime.total_12m")!;
    expect(total.raw_value).toBe(12); // trailing 12 of 13 single-crime months
    const rate = signalValues.find((r) => r.signal_key === "crime.monthly_rate")!;
    expect(rate.raw_value).toBe(1); // 12 / 12
  });

  it("labels a single-month window as that month", () => {
    const b: CrimeBuckets = new Map();
    addCrime(b, "E01000001", "2025-12");
    const { signalValues } = crimeBucketsToRows(b, "snap_2");
    expect(signalValues.find((r) => r.signal_key === "crime.total_12m")!.observed_period).toBe("2025-12");
  });
});

describe("runCrimeRefresh (injected files + lines + run)", () => {
  it("streams police CSVs, aggregates, and writes catalog/snapshot/timeseries/values", async () => {
    const writes: Record<string, number> = {};
    const run = async (text: string) => {
      const m = text.match(/INSERT INTO (\w+)/);
      if (m) writes[m[1]!] = (writes[m[1]!] ?? 0) + 1;
      return [];
    };
    const linesOf = async function* () {
      yield HEADER;
      yield row("2025-11", "E01005207").join(",");
      yield row("2025-12", "E01005207").join(",");
      yield row("2025-12", "E01000002").join(",");
      yield row("2025-12", "").join(","); // dropped (no LSOA)
    };

    const summary = await runCrimeRefresh({
      run, files: async () => ["a-street.csv"], linesOf, makeId: () => "snap_t",
    });

    expect(summary.parsed).toBe(3);   // the no-LSOA row dropped
    expect(summary.lsoas).toBe(2);
    expect(summary.months).toBe(2);
    expect(summary.signalValues).toBe(4); // 2 signals x 2 LSOAs
    expect(writes.signals).toBeGreaterThan(0);
    expect(writes.signal_timeseries).toBeGreaterThan(0);
    expect(writes.signal_values).toBeGreaterThan(0);
  });

  it("throws when the header lacks LSOA/Month", async () => {
    const linesOf = async function* () { yield "Crime ID,Foo,Bar"; yield "x,y,z"; };
    await expect(runCrimeRefresh({ run: async () => [], files: async () => ["bad.csv"], linesOf }))
      .rejects.toThrow(/LSOA code/i);
  });
});

describe("CRIME_SIGNALS catalog", () => {
  it("matches the area-profile crime keys + the monthly series key", () => {
    const keys = CRIME_SIGNALS.map((s) => s.key);
    expect(keys).toContain("crime.total_12m");
    expect(keys).toContain("crime.monthly_rate");
    expect(keys).toContain("crime.monthly_count");
  });
});
