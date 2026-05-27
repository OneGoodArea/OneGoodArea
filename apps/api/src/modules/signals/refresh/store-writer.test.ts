import { describe, it, expect, vi } from "vitest";
import {
  buildUpsertSql,
  bulkUpsert,
  upsertSignalValues,
  writeSnapshots,
  type QueryRunner,
  type SignalValueRow,
} from "./store-writer";

describe("buildUpsertSql (pure)", () => {
  it("builds a single-row insert with no conflict clause", () => {
    const sql = buildUpsertSql({ table: "source_snapshots", columns: ["id", "source", "row_count"] }, 1);
    expect(sql).toBe("INSERT INTO source_snapshots (id, source, row_count) VALUES ($1, $2, $3)");
  });

  it("numbers placeholders continuously across multiple rows", () => {
    const sql = buildUpsertSql({ table: "t", columns: ["a", "b"] }, 3);
    expect(sql).toBe("INSERT INTO t (a, b) VALUES ($1, $2), ($3, $4), ($5, $6)");
  });

  it("appends ON CONFLICT … DO UPDATE when a conflict spec is given", () => {
    const sql = buildUpsertSql({
      table: "signal_values",
      columns: ["signal_key", "geo_code", "raw_value"],
      conflict: { target: ["signal_key", "geo_code"], set: ["raw_value = EXCLUDED.raw_value", "updated_at = NOW()"] },
    }, 1);
    expect(sql).toBe(
      "INSERT INTO signal_values (signal_key, geo_code, raw_value) VALUES ($1, $2, $3) " +
        "ON CONFLICT (signal_key, geo_code) DO UPDATE SET raw_value = EXCLUDED.raw_value, updated_at = NOW()",
    );
  });
});

describe("bulkUpsert", () => {
  it("flattens rows to params in column order (undefined → null) and returns the count", async () => {
    const calls: { text: string; params: unknown[] }[] = [];
    const run: QueryRunner = async (text, params) => {
      calls.push({ text, params });
      return [];
    };

    const written = await bulkUpsert(
      run,
      { table: "t", columns: ["a", "b"] },
      [{ a: 1, b: "x" }, { a: 2 /* b missing */ }],
    );

    expect(written).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([1, "x", 2, null]);
  });

  it("chunks rows so no single statement exceeds the chunk size", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    const rows = Array.from({ length: 1250 }, (_, i) => ({ a: i }));

    const written = await bulkUpsert(run, { table: "t", columns: ["a"] }, rows, 500);

    expect(written).toBe(1250);
    expect(run).toHaveBeenCalledTimes(3); // 500 + 500 + 250
    // last chunk has 250 placeholders
    const lastCall = run.mock.calls[2];
    expect((lastCall[1] as unknown[]).length).toBe(250);
  });
});

describe("domain writers", () => {
  it("upsertSignalValues targets the natural key and refreshes updated_at", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    const row: SignalValueRow = {
      signal_key: "deprivation.imd_decile", geo_type: "lsoa", geo_code: "E01000001",
      raw_value: 5, raw_value_text: null, normalized_value: null, confidence: 0.9,
      confidence_reason: "official", source_snapshot_id: "snap_1", observed_period: "IMD 2025",
      engine_version: "2.0.2",
    };

    await upsertSignalValues([row], run);

    const [text, params] = run.mock.calls[0];
    expect(text).toContain("INSERT INTO signal_values");
    expect(text).toContain("ON CONFLICT (signal_key, geo_type, geo_code)");
    expect(text).toContain("updated_at = NOW()");
    expect(params).toHaveLength(11); // 11 columns
    expect(params[0]).toBe("deprivation.imd_decile");
  });

  it("writeSnapshots is insert-only (no ON CONFLICT)", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    await writeSnapshots([{ id: "snap_1", source: "IMD 2025", release_date: null, licence: null, checksum: null, row_count: 33755, notes: null }], run);
    const [text] = run.mock.calls[0];
    expect(text).toContain("INSERT INTO source_snapshots");
    expect(text).not.toContain("ON CONFLICT");
  });
});
