import { exec } from "./client";
import { MIGRATIONS, type Migration } from "./schema";

/* Standalone, runnable migrator — replaces the legacy per-request
   ensureXTable() bootstrapping. Runs every migration's idempotent DDL once.

   Run it explicitly (CI / deploy / local):  npm run migrate -w @onegoodarea/api

   runMigrations() takes an injectable executor so it's unit-testable WITHOUT a
   live database (the default executor is the real Neon `exec`). */

export interface AppliedMigration {
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

/* CLI entry — runs against the real DATABASE_URL when invoked directly. */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("migrate.ts"));
if (invokedDirectly) {
  runMigrations()
    .then((applied) => {
      console.log(`[migrate] applied ${applied.length} tables:`);
      for (const a of applied) console.log(`  ✓ ${a.name} (${a.statements} statements)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[migrate] failed:", err);
      process.exit(1);
    });
}
