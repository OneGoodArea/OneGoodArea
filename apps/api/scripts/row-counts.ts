/**
 * Row counts for the signal-refresh pipeline (AR-792).
 *
 * Reports row counts for the tables affected by a refresh run, so the before /
 * after / delta is visible in the persisted run log. Uses the same
 * @neondatabase/serverless driver + local neon-compat-proxy override as
 * apps/api/src/infrastructure/db/client.ts, so it runs identically inside the
 * container (DATABASE_URL + NEON_FETCH_ENDPOINT) and in prod (DATABASE_URL only).
 *
 * AR-792 follow-up: also reports a per-signal-type breakdown
 * (signals + signal_values grouped by signals.category), so new signal types
 * such as amenities appear in the before/after/delta.
 *
 * Usage:
 *   npm run row-counts            # print the totals table + category breakdown to stdout
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

type Breakdown = {
  signals: Record<string, number>;
  signal_values: Record<string, number>;
};

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

async function fetchBreakdown(client: ReturnType<typeof getClient>): Promise<Breakdown> {
  type CatRow = { category: string | null; n: number };
  const byCat = (rows: CatRow[]) =>
    Object.fromEntries(rows.map((r) => [r.category ?? "uncategorized", r.n]));

  // client.query returns the rows array directly (see fetchCounts: res[0]).
  // Plain-string form (not tagged template) so the (text, params) overload
  // resolves cleanly under strict tsc.
  const sig = (await client.query(
    `SELECT COALESCE(category, 'uncategorized') AS category, COUNT(*)::int AS n
     FROM signals GROUP BY 1 ORDER BY 1`,
  )) as CatRow[];
  const vals = (await client.query(
    `SELECT COALESCE(s.category, 'uncategorized') AS category, COUNT(*)::int AS n
     FROM signal_values sv
     LEFT JOIN signals s ON s.key = sv.signal_key
     GROUP BY 1 ORDER BY 1`,
  )) as CatRow[];

  return { signals: byCat(sig), signal_values: byCat(vals) };
}

function padEnd(s: string, width: number): string {
  return s.padEnd(width, " ");
}

const BREAKDOWN_TABLES: ReadonlyArray<"signals" | "signal_values"> = [
  "signals",
  "signal_values",
];

function printBreakdown(bd: Breakdown): void {
  const cats = Array.from(
    new Set([...Object.keys(bd.signals), ...Object.keys(bd.signal_values)]),
  ).sort();
  const catW = Math.max(
    "category".length,
    ...cats.map((c) => c.length),
  );
  const numWidth = Math.max(
    "count".length,
    ...BREAKDOWN_TABLES.flatMap((t) =>
      cats.map((c) => String(bd[t][c] ?? 0).length),
    ),
  );

  console.log("by signal type (category):");
  for (const table of BREAKDOWN_TABLES) {
    console.log(`${padEnd(table, catW)} | count`);
    console.log("-".repeat(catW + numWidth + 3));
    for (const cat of cats) {
      const n = bd[table][cat] ?? 0;
      console.log(`${padEnd(cat, catW)} | ${String(n).padStart(numWidth)}`);
    }
  }
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

function printSnapshot(counts: Counts, breakdown?: Breakdown): void {
  const out: Record<string, unknown> = { ...counts };
  if (breakdown) out.__breakdown__ = breakdown;
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
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
    const breakdown = await fetchBreakdown(client);
    printBreakdown(breakdown);
    return;
  }

  if (mode === "snapshot") {
    const client = getClient();
    const counts = await fetchCounts(client);
    const breakdown = await fetchBreakdown(client);
    printSnapshot(counts, breakdown);
    return;
  }

  if (mode === "diff") {
    const [beforePath, afterPath] = args.slice(1);
    if (!beforePath || !afterPath) {
      throw new Error("usage: row-counts diff <before.json> <after.json>");
    }
    const before = JSON.parse(
      readFileSync(beforePath, "utf-8"),
    ) as Counts & { __breakdown__?: Breakdown };
    const after = JSON.parse(
      readFileSync(afterPath, "utf-8"),
    ) as Counts & { __breakdown__?: Breakdown };
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
