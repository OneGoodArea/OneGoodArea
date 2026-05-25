import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSeed(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("runtime seed datasets", () => {
  it("uses stable baseline user identifiers", () => {
    const sql = readSeed("tests/seeds/profiles/baseline/100-baseline-users.sql");
    expect(sql).toContain("user_seed_alice");
    expect(sql).toContain("user_seed_bob");
    expect(sql).toContain("seed.alice@onegoodarea.local");
    expect(sql).toContain("seed.bob@onegoodarea.local");
  });

  it("records baseline seed run metadata", () => {
    const sql = readSeed("tests/seeds/profiles/baseline/110-baseline-report-cache.sql");
    expect(sql).toContain("INSERT INTO runtime_seed_runs");
    expect(sql).toContain("('v1', 'baseline'");
  });
});

