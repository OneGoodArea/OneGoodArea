import { describe, it, expect, vi } from "vitest";
import { runMigrations } from "@/infrastructure/db/migrate";
import { MIGRATIONS } from "@/infrastructure/db/schema";

/* Tests run WITHOUT a database — runMigrations takes an injected executor, so
   we assert the migrator's behaviour + the registry's safety properties. */

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
          s.includes("DROP NOT NULL") || // ALTER COLUMN ... DROP NOT NULL is a no-op when already nullable
          /ON CONFLICT[\s\S]*DO NOTHING/.test(s) || // backfill INSERTs (target-free OR target-keyed e.g. ON CONFLICT (a,b) DO NOTHING)
          /WHERE [A-Z_.]*ORG_ID IS NULL/.test(s) || // backfill UPDATEs guarded by "not already done" predicate (alias-tolerant: WHERE org_id / WHERE ae.org_id)
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
      "report_cache",
      "report_history",
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
