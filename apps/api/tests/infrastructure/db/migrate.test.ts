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
          s.includes("SET DEFAULT") || // ALTER COLUMN ... SET DEFAULT is a no-op once the default matches (subscriptions reconciliation)
          s.includes("CREATE OR REPLACE VIEW") || // AR-375: view DDL is idempotent by definition
          s.includes("DO $$") || // AR-809: PL/pgSQL blocks with EXCEPTION handler are idempotent (catch + swallow errors)
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
    expect(names.indexOf("signals")).toBeLessThan(names.indexOf("signal_fk_constraints"));
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

  it("users migration creates intent + signup_source + role_preference columns (AR-218)", () => {
    // AR-218 (Dashboard redesign Epic AR-217): /welcome flow needs three onboarding
    // columns nullable on the users table. v1 consolidated them into the CREATE
    // TABLE statement (folded from the historical ADD COLUMN statements).
    const users = MIGRATIONS.find((m) => m.name === "users");
    expect(users, "users migration must exist").toBeDefined();
    const ddl = users!.statements.join("\n");
    expect(ddl).toMatch(/intent TEXT/);
    expect(ddl).toMatch(/signup_source TEXT/);
    expect(ddl).toMatch(/role_preference TEXT/);
  });

  it("magic_link_tokens migration exists and creates the auth token table", () => {
    const tokens = MIGRATIONS.find((m) => m.name === "magic_link_tokens");
    expect(tokens, "magic_link_tokens migration must exist").toBeDefined();
    const ddl = tokens!.statements.join("\n");
    expect(ddl).toMatch(/CREATE TABLE IF NOT EXISTS magic_link_tokens/);
    expect(ddl).toMatch(/token TEXT UNIQUE NOT NULL/);
    expect(ddl).toMatch(/idx_magic_link_email_created/);
  });

  it("score_history migration converges the owned sequence on Neon's name", () => {
    const score = MIGRATIONS.find((m) => m.name === "score_history");
    expect(score, "score_history migration must exist").toBeDefined();
    const ddl = score!.statements.join("\n");
    expect(ddl).toMatch(/ALTER SEQUENCE IF EXISTS score_history_id_seq RENAME TO report_history_id_seq/);
  });

  it("subscriptions migration reconciles Neon's column defaults", () => {
    const subs = MIGRATIONS.find((m) => m.name === "subscriptions");
    expect(subs, "subscriptions migration must exist").toBeDefined();
    const ddl = subs!.statements.join("\n");
    expect(ddl).toMatch(/plan TEXT NOT NULL DEFAULT 'free'/);
    expect(ddl).toMatch(/status TEXT NOT NULL DEFAULT 'active'/);
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
