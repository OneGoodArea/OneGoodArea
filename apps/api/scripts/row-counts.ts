/**
 * Row counts for the signal-refresh pipeline (AR-792).
 *
 * Reports row counts for the tables affected by a refresh run, so the before /
 * after / delta is visible in the persisted run log. Uses the same
 * @neondatabase/serverless driver + local neon-compat-proxy override as
 * apps/api/src/infrastructure/db/client.ts, so it runs identically inside the
 * container (DATABASE_URL + NEON_FETCH_ENDPOINT) and in prod (DATABASE_URL only).
 *
 * Usage:
 *   npm run row-counts            # print a markdown table to stdout
 *   npm run row-counts -- print   #   ("print" is the default)
 *   npm run row-counts -- snapshot > data/logs/rowcounts.before.json
 *   npm run row-counts -- snapshot > data/logs/rowcounts.after.json
 *   npm run row-counts -- diff data/logs/rowcounts.before.json data/logs/rowcounts.after.json
 */
import { neon, neonConfig, types } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const TABLES: ReadonlyArray<string> = [
  "source_snapshots",
  "geo_entities",
  "geo_lookup",
  "signal_values",
  "signals",
  "signal_percentiles",
  "signal_timeseries",
  "peer_assignments",
  "signal_bundles",
  "ofsted_schools",
] as const;

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
  }
  const fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  if (fetchEndpoint) {
    neonConfig.fetchEndpoint = fetchEndpoint;
  }
  types.setTypeParser(1184, (val: string) => new Date(val));
  return neon(url);
}

type Counts = Record<string, number>;

async function fetchCounts(client: ReturnType<typeof getClient>): Promise<Counts> {
  const out: Counts = {};
  for (const table of TABLES) {
    const res = await client.query(
      `SELECT COALESCE(count(*), 0)::int AS n FROM ${table}`,
    );
    out[table] = Number((res[0] as { n: number }).n);
  }
  return out;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, " ");
}

function printTable(counts: Counts): void {
  const labelWidth = Math.max(...TABLES.map((t) => t.length));
  const numWidth = Math.max("count".length, ...Object.values(counts).map((n) => String(n).length));
  const sep = `-${"-".repeat(labelWidth)}-+-${"-".repeat(numWidth)}-`;
  console.log(`Table${" ".repeat(Math.max(0, labelWidth - "Table".length))}| count`);
  console.log(sep);
  for (const table of TABLES) {
    const n = table in counts ? counts[table] : 0;
    console.log(`${table.padEnd(labelWidth)} | ${String(n).padStart(numWidth)}`);
  }
}

function printSnapshot(counts: Counts): void {
  process.stdout.write(JSON.stringify(counts, null, 2) + "\n");
}

function printDiff(before: Counts, after: Counts): void {
  const changed: Array<[string, number, number, number]> = [];
  for (const table of TABLES) {
    const b = table in before ? before[table] : 0;
    const a = table in after ? after[table] : 0;
    if (b !== a) changed.push([table, b, a, a - b]);
  }
  const labelWidth = Math.max(...TABLES.map((t) => t.length), "table".length);
  const numWidth = Math.max(
    "before".length,
    "after".length,
    "delta".length,
    ...changed.flatMap(([, b, a, d]) =>
      [b, a, Math.abs(d)].map((n) => String(n).length),
    ),
  );
  const cols = (v: number | string) => String(v).padStart(numWidth);
  console.log(`${"table".padEnd(labelWidth)} | ${cols("before")} | ${cols("after")} | ${cols("delta")}`);
  console.log("-".repeat(labelWidth + numWidth * 3 + 9));
  if (changed.length === 0) {
    console.log("no change");
    return;
  }
  for (const [table, b, a, d] of changed) {
    console.log(
      `${table.padEnd(labelWidth)} | ${cols(b)} | ${cols(a)} | ${diffColor(d, cols(d))}`,
    );
  }
}

function diffColor(d: number, s: string): string {
  if (d > 0) return `\x1b[32m${s}\x1b[0m`;
  if (d < 0) return `\x1b[31m${s}\x1b[0m`;
  return s;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "print";

  if (mode === "print") {
    const client = getClient();
    const counts = await fetchCounts(client);
    printTable(counts);
    return;
  }

  if (mode === "snapshot") {
    const client = getClient();
    const counts = await fetchCounts(client);
    printSnapshot(counts);
    return;
  }

  if (mode === "diff") {
    const [beforePath, afterPath] = args.slice(1);
    if (!beforePath || !afterPath) {
      throw new Error("usage: row-counts diff <before.json> <after.json>");
    }
    const before = JSON.parse(
      readFileSync(beforePath, "utf-8"),
    ) as Counts;
    const after = JSON.parse(
      readFileSync(afterPath, "utf-8"),
    ) as Counts;
    printDiff(before, after);
    return;
  }

  console.error(`unknown mode: ${mode}`);
  console.error("usage: row-counts [print|snapshot|diff <before> <after>]");
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
