import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

/* Backend DB client. Ported from the legacy src/lib/db.ts (behaviour-identical)
   plus a raw `exec()` for the standalone migrator.

   Lives in apps/api only — the frontend (apps/web) must never import this
   (separation metric: 0 DB imports in apps/web).

   Local dev: when running against the Marcos neon-compat-proxy container,
   set NEON_FETCH_ENDPOINT=http://neon-proxy:55433/sql in the api service
   env. This overrides the @neondatabase/serverless driver's default of
   talking to Neon's hosted HTTPS endpoint (console.neon.tech), which is
   unreachable from inside the local Docker network. The proxy speaks the
   same POST /sql {query, params} protocol Neon does and translates to
   the local Postgres container via `pg`. Production leaves the env var
   unset — the driver uses its built-in Neon endpoint as designed. */

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
  }
  /* Local-dev override: route the driver's HTTPS fetch through Marcos's
     neon-compat-proxy instead of Neon Cloud. No-op in production. */
  const fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  if (fetchEndpoint) {
    neonConfig.fetchEndpoint = fetchEndpoint;
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
