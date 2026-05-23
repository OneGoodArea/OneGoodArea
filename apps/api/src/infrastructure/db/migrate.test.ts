import { describe, it, expect, vi } from "vitest";
import { runMigrations } from "./migrate";
import { MIGRATIONS } from "./schema";

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
          s.includes("DROP NOT NULL"); // ALTER COLUMN ... DROP NOT NULL is a no-op when already nullable
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
      "subscription_addons",
      "ofsted_schools",
      "rate_limit_entries",
    ]) {
      expect(names).toContain(table);
    }
  });

  it("has no duplicate table names", () => {
    const names = MIGRATIONS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
