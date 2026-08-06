import { describe, it, expect, vi, afterEach } from "vitest";
import { runMigrations, runSeeds } from "@/infrastructure/db/migrate";
import { MIGRATIONS, SEEDS } from "@/infrastructure/db/schema";

/* Tests run WITHOUT a database — runMigrations/runSeeds take an injected
   executor, so we assert the migrator's behaviour + the registry's safety
   properties. */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("db migrate", () => {
  it("runs every migration statement, in order, via the injected executor", async () => {
    const calls: string[] = [];
    const run = vi.fn(async (statement: string) => {
      calls.push(statement);
    });

    const applied = await runMigrations(run);

    const totalStatements = MIGRATIONS.reduce((n, m) => n + m.statements.length, 0);
    expect(run).toHaveBeenCalledTimes(totalStatements);
    expect(calls.length).toBe(totalStatements);
    expect(applied.map((a) => a.name)).toEqual(MIGRATIONS.map((m) => m.name));
  });

  it("every DDL statement is idempotent (safe to re-run)", () => {
    for (const migration of MIGRATIONS) {
      for (const statement of migration.statements) {
        const s = statement.toUpperCase();
        const idempotent =
          s.includes("IF NOT EXISTS") || // CREATE TABLE / CREATE INDEX / ADD COLUMN
          s.includes("IF EXISTS") || // AR-331: DROP TABLE IF EXISTS / ALTER TABLE IF EXISTS / ALTER INDEX IF EXISTS
          s.includes("DROP NOT NULL") || // ALTER COLUMN ... DROP NOT NULL is a no-op when already nullable
          s.includes("CREATE OR REPLACE VIEW") || // AR-375: view DDL is idempotent by definition
          /ON CONFLICT[\s\S]*DO NOTHING/.test(s) || // backfill INSERTs (target-free OR target-keyed e.g. ON CONFLICT (a,b) DO NOTHING)
          /(WHERE|AND) [A-Z_.]+ IS NULL/.test(s) || // backfill UPDATEs guarded by "not already done" predicate (AR-193/AR-408: alias-tolerant; column-agnostic)
          /AND NOT EXISTS \(SELECT/.test(s); // AR-312: self-healing backfills guarded by NOT EXISTS — no-op once the post-condition holds
        expect(idempotent, `non-idempotent statement: ${statement.slice(0, 70)}`).toBe(true);
      }
    }
  });

  it("includes the core production tables", () => {
    const names = MIGRATIONS.map((m) => m.name);
    for (const table of [
      "users",
      "api_keys",
      "reports",
      "area_cache",
      "score_history",
      "webhook_subscriptions",
      "webhook_deliveries",
      "idempotency_records",
      "subscriptions",
      "subscription_addons",
      "ofsted_schools",
      "rate_limit_entries",
    ]) {
      expect(names).toContain(table);
    }
  });

  it("includes the signal store tables (restructure Phase 1)", () => {
    const names = MIGRATIONS.map((m) => m.name);
    for (const table of [
      "geo_entities",
      "geo_lookup",
      "source_snapshots",
      "signals",
      "signal_values",
      "signal_percentiles",
      "signal_timeseries",
    ]) {
      expect(names).toContain(table);
    }
  });

  it("orders signal_values + signal_timeseries after the geo + catalog tables", () => {
    // Without FK constraints this is convention not enforcement, but keeping the
    // logical order (geo + catalog before the values that reference them) keeps
    // the registry readable and a future FK migration trivial.
    const names = MIGRATIONS.map((m) => m.name);
    expect(names.indexOf("geo_entities")).toBeLessThan(names.indexOf("signal_values"));
    expect(names.indexOf("signals")).toBeLessThan(names.indexOf("signal_values"));
    expect(names.indexOf("signals")).toBeLessThan(names.indexOf("signal_timeseries"));
  });

  it("includes the Monitor tables (restructure Phase 5)", () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect(names).toContain("portfolios");
    expect(names).toContain("portfolio_areas");
  });

  it("has no duplicate table names", () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("users migration includes intent + signup_source + role_preference ADD COLUMN statements (AR-218)", () => {
    // AR-218 (Dashboard redesign Epic AR-217): /welcome flow needs three onboarding
    // columns nullable on the users table. Idempotent ADD COLUMN IF NOT EXISTS so
    // existing rows are unaffected.
    const users = MIGRATIONS.find((m) => m.name === "users");
    expect(users, "users migration must exist").toBeDefined();
    const ddl = users!.statements.join("\n");
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS intent TEXT/i);
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS signup_source TEXT/i);
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS role_preference TEXT/i);
  });
});

describe("db seeds", () => {
  it("runs every gate-satisfied seed statement, in order, via the injected executor", async () => {
    vi.stubEnv("SEED_SHOWCASE_API_KEY", "test-showcase-key");

    const calls: string[] = [];
    const run = vi.fn(async (statement: string) => {
      calls.push(statement);
    });

    const applied = await runSeeds(run);

    const totalStatements = SEEDS.reduce((n, s) => n + s.statements.length, 0);
    expect(run).toHaveBeenCalledTimes(totalStatements);
    expect(calls.length).toBe(totalStatements);
    expect(applied.map((a) => a.name)).toEqual(SEEDS.map((s) => s.name));
  });

  it("skips seeds whose gate env var is unset (no-op for dev/test)", async () => {
    const run = vi.fn(async () => {});

    const applied = await runSeeds(run, [
      {
        name: "gated",
        requiresEnv: "DEFINITELY_NOT_SET_ANYWHERE",
        statements: ["INSERT INTO whatever ... ON CONFLICT DO NOTHING"],
      },
    ]);

    expect(run).not.toHaveBeenCalled();
    expect(applied).toEqual([]);
  });

  it("every seed statement is idempotent (safe to re-run)", () => {
    for (const seed of SEEDS) {
      for (const statement of seed.statements) {
        const s = statement.toUpperCase();
        const idempotent =
          s.includes("IF NOT EXISTS") ||
          s.includes("IF EXISTS") ||
          /ON CONFLICT[\s\S]*DO NOTHING/.test(s) ||
          /(WHERE|AND) [A-Z_.]+ IS NULL/.test(s) ||
          /AND NOT EXISTS \(SELECT/.test(s);
        expect(idempotent, `non-idempotent seed statement: ${statement.slice(0, 70)}`).toBe(true);
      }
    }
  });

  it("has no duplicate seed names", () => {
    const names = SEEDS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("showcase seed is gated on SEED_SHOWCASE_API_KEY", () => {
    const showcase = SEEDS.find((s) => s.name === "showcase");
    expect(showcase, "showcase seed must exist").toBeDefined();
    expect(showcase!.requiresEnv).toBe("SEED_SHOWCASE_API_KEY");
  });
});
