import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/* Backend DB client. Ported from the legacy src/lib/db.ts (behaviour-identical)
   plus a raw `exec()` for the standalone migrator.

   Lives in apps/api only — the frontend (apps/web) must never import this
   (separation metric: 0 DB imports in apps/web). */

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
  }
  client = neon(url);
  return client;
}

/** Tagged-template query — same surface as the legacy `sql` the modules use. */
export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => getClient()(strings, ...values)) as NeonQueryFunction<false, false>;

/** Execute a single raw, static (no-parameter) SQL statement. Used by migrate.ts. */
export async function exec(statement: string): Promise<void> {
  await getClient().query(statement);
}

/** Parameterized query escape hatch (placeholders $1, $2, …). Used by the bulk
    signal-store writers, which build chunked multi-row INSERTs that the
    tagged-template form can't express. Returns the result rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await getClient().query(text, params)) as T[];
}
