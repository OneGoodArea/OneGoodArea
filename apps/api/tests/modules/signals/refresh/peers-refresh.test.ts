import { describe, it, expect, vi } from "vitest";
import {
  buildRefreshPeerAssignmentsSql, buildListTargetsSql, runRefreshPeerAssignments,
  PEERS_REFRESH_DEFAULT_K, PEERS_REFRESH_DEFAULT_MIN_DIMS, PEERS_REFRESH_DEFAULT_CHUNK,
} from "@/modules/signals/refresh/peers-refresh";
import type { QueryRunner } from "@/modules/signals/refresh/store-writer";

describe("buildRefreshPeerAssignmentsSql (pure, AR-189 / ADR 0024)", () => {
  const sql = buildRefreshPeerAssignmentsSql();

  it("INSERTs into peer_assignments with idempotent ON CONFLICT DO UPDATE", () => {
    expect(sql).toMatch(/INSERT INTO peer_assignments/);
    expect(sql).toMatch(/ON CONFLICT \(geo_type, geo_code, peer_geo_code\) DO UPDATE/);
    expect(sql).toMatch(/SET peer_rank = EXCLUDED\.peer_rank/);
  });
  it("takes the target list as a parameter array (UNNEST $1::text[]) for chunked execution", () => {
    expect(sql).toMatch(/FROM UNNEST\(\$1::text\[\]\) AS t\(target_code\)/);
  });
  it("uses a CROSS JOIN LATERAL per target so the inner k-NN runs once per target", () => {
    expect(sql).toMatch(/CROSS JOIN LATERAL/);
  });
  it("computes dim-mean-squared distance to each candidate (SAME metric as /v1/peers)", () => {
    expect(sql).toMatch(/SQRT\(AVG\(POWER\(sv\.normalized_value - tsv\.normalized_value, 2\)\)\)::float8 AS distance/);
    expect(sql).toMatch(/COUNT\(\*\)::int AS n_dims_used/);
  });
  it("ranks candidates by distance ASC + geo_code tiebreaker; keeps top-K", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(\s*ORDER BY SQRT\(AVG\(POWER\(sv\.normalized_value - tsv\.normalized_value, 2\)\)\) ASC,\s*sv\.geo_code ASC\s*\) AS peer_rank/);
    expect(sql).toMatch(/c\.peer_rank <= 20/); // default k
  });
  it("HAVING gates candidates on min_dims overlap (default 3)", () => {
    expect(sql).toMatch(/HAVING COUNT\(\*\) >= 3/);
  });
  it("excludes the target itself from candidates", () => {
    expect(sql).toMatch(/sv\.geo_code <> t\.target_code/);
  });
  it("respects non-default k + minDims", () => {
    const tight = buildRefreshPeerAssignmentsSql({ k: 5, minDims: 8 });
    expect(tight).toMatch(/c\.peer_rank <= 5/);
    expect(tight).toMatch(/HAVING COUNT\(\*\) >= 8/);
  });
  it("interpolates engine version + escapes single quotes", () => {
    const tricky = buildRefreshPeerAssignmentsSql({ engineVersion: "9.9.9-test" });
    expect(tricky).toContain("'9.9.9-test'");
  });
  it("exports the documented default constants", () => {
    expect(PEERS_REFRESH_DEFAULT_K).toBe(20);
    expect(PEERS_REFRESH_DEFAULT_MIN_DIMS).toBe(3);
    expect(PEERS_REFRESH_DEFAULT_CHUNK).toBe(1);
  });
});

describe("buildListTargetsSql", () => {
  it("returns DISTINCT geo_codes for LSOAs with at least one normalized signal", () => {
    const { text, params } = buildListTargetsSql();
    expect(text).toMatch(/SELECT DISTINCT geo_code FROM signal_values/);
    expect(text).toMatch(/geo_type = 'lsoa'/);
    expect(text).toMatch(/normalized_value IS NOT NULL/);
    expect(params).toEqual([]);
  });
  it("applies optional country prefix filter on the target set", () => {
    const { text, params } = buildListTargetsSql({ countryPrefix: "S" });
    expect(text).toMatch(/geo_code LIKE \$1/);
    expect(params).toEqual(["S%"]);
  });
});

describe("runRefreshPeerAssignments orchestration (parallel worker pool)", () => {
  it("lists targets, dispatches per-chunk inserts via concurrent workers, returns the summary", async () => {
    const calls: { kind: string; targets?: string[] }[] = [];
    const allTargets = ["E01000001", "E01000002", "E01000003", "E01000004", "E01000005"];
    const run = vi.fn<QueryRunner>(async (text, params) => {
      if (text.startsWith("SELECT DISTINCT geo_code")) { calls.push({ kind: "list-targets" }); return allTargets.map((g) => ({ geo_code: g })); }
      if (text.startsWith("INSERT INTO peer_assignments")) { calls.push({ kind: "insert", targets: params[0] as string[] }); return []; }
      if (text.includes("COUNT(*)::int AS n FROM peer_assignments")) return [{ n: 100 }];
      if (text.includes("COUNT(DISTINCT geo_code)::int AS n FROM peer_assignments")) return [{ n: 5 }];
      return [];
    });

    const progress: { chunkIndex: number; targetsProcessed: number }[] = [];
    const summary = await runRefreshPeerAssignments({ chunkSize: 2, concurrency: 2 }, run, (p) => progress.push(p));

    // 5 targets / chunk size 2 = 3 chunks (2 + 2 + 1); 2 workers process in parallel.
    expect(summary.chunks).toBe(3);
    expect(summary.targetsProcessed).toBe(5);
    expect(summary.targetsCovered).toBe(5);
    expect(summary.rowsAfter).toBe(100);
    expect(calls[0].kind).toBe("list-targets");
    expect(calls.filter((c) => c.kind === "insert")).toHaveLength(3);
    // Parallel dispatch — exact ordering depends on scheduler, but every
    // target must show up in some chunk exactly once.
    const allDispatched = calls.filter((c) => c.kind === "insert").flatMap((c) => c.targets!).sort();
    expect(allDispatched).toEqual(allTargets);
    expect(progress).toHaveLength(3);
    expect(progress[progress.length - 1].targetsProcessed).toBe(5);
  });
  it("defaults to chunkSize=1 + concurrency=8 when omitted", async () => {
    const calls: { kind: string }[] = [];
    const run = vi.fn<QueryRunner>(async (text) => {
      if (text.startsWith("SELECT DISTINCT geo_code")) { calls.push({ kind: "list-targets" }); return [{ geo_code: "E01000001" }]; }
      if (text.startsWith("INSERT INTO peer_assignments")) { calls.push({ kind: "insert" }); return []; }
      if (text.includes("COUNT")) return [{ n: 1 }];
      return [];
    });
    const summary = await runRefreshPeerAssignments({}, run);
    // One target -> one chunk -> one insert.
    expect(calls.filter((c) => c.kind === "insert")).toHaveLength(1);
    expect(summary.chunks).toBe(1);
    expect(summary.targetsProcessed).toBe(1);
  });
});
