import { exec } from "./client";
import { MIGRATIONS, SEEDS, type Migration, type Seed } from "./schema";

/* Standalone, runnable migrator — replaces the legacy per-request
   ensureXTable() bootstrapping. Runs every migration's idempotent DDL once,
   then every env-gated seed (the autonomous-install bootstrap data).

   Run it explicitly (CI / deploy / local):  npm run migrate -w @onegoodarea/api

   runMigrations()/runSeeds() take an injectable executor so they're
   unit-testable WITHOUT a live database (the default executor is the real
   Neon `exec`). */

export interface AppliedMigration {
  name: string;
  statements: number;
}

export interface AppliedSeed {
  name: string;
  statements: number;
}

export async function runMigrations(
  run: (statement: string) => Promise<unknown> = exec,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<AppliedMigration[]> {
  const applied: AppliedMigration[] = [];
  for (const migration of migrations) {
    for (const statement of migration.statements) {
      await run(statement);
    }
    applied.push({ name: migration.name, statements: migration.statements.length });
  }
  return applied;
}

/** Run every env-gated seed. Seeds whose gate env var is unset are skipped
    (a no-op), so dev/test environments without secrets stay clean while a
    fresh production install bootstraps its showcase/operator data. */
export async function runSeeds(
  run: (statement: string) => Promise<unknown> = exec,
  seeds: readonly Seed[] = SEEDS,
): Promise<AppliedSeed[]> {
  const applied: AppliedSeed[] = [];
  for (const seed of seeds) {
    if (seed.requiresEnv && !process.env[seed.requiresEnv]) {
      console.log(`[seeds] skip ${seed.name} (${seed.requiresEnv} not set)`);
      continue;
    }
    for (const statement of seed.statements) {
      await run(statement);
    }
    applied.push({ name: seed.name, statements: seed.statements.length });
  }
  return applied;
}

/* CLI entry — runs against the real DATABASE_URL when invoked directly.
   Matches both the local tsx invocation (path ends migrate.ts) AND the
   esbuild-bundled CJS invocation (path ends migrate.cjs) used by the
   Containerfile's pre-server boot step. AR-380. */
const invokedDirectly = Boolean(
  process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.cjs"),
);
if (invokedDirectly) {
  runMigrations()
    .then(async (applied) => {
      console.log(`[migrate] applied ${applied.length} tables:`);
      for (const a of applied) console.log(`  ✓ ${a.name} (${a.statements} statements)`);
      const seeds = await runSeeds();
      console.log(`[seeds] applied ${seeds.length} seeds:`);
      for (const s of seeds) console.log(`  ✓ ${s.name} (${s.statements} statements)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[migrate] failed:", err);
      process.exit(1);
    });
}
