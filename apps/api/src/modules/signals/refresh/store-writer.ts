/* modules/signals/refresh — the reusable signal-store write layer.

   Every source refresh job (deprivation first, the rest later) writes through
   these primitives, so the persistence shape lives in ONE place. The writers
   take an injectable QueryRunner so they are unit-testable without a database;
   the default runner is the real parameterized Neon `query`.

   Writes are chunked multi-row upserts (idempotent): re-running a refresh
   overwrites the current values in place rather than duplicating them, which is
   exactly what "refresh on schedule" needs. See ADR 0003. */

import { query as defaultQuery } from "../../../infrastructure/db/client";

/** Parameterized query runner ($1, $2, …). Injected in tests. */
export type QueryRunner = (text: string, params: unknown[]) => Promise<unknown[]>;

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

export interface UpsertSpec {
  table: string;
  /** Insert column order; row values are flattened in this order. */
  columns: string[];
  /** Omit for insert-only tables. `set` entries are full assignments, e.g.
      "raw_value = EXCLUDED.raw_value" or "updated_at = NOW()". */
  conflict?: { target: string[]; set: string[] };
}

/** PURE: build a parameterized multi-row INSERT (… ON CONFLICT … DO UPDATE) for
    `rowCount` rows. Exported for exact unit testing of the generated SQL. */
export function buildUpsertSql(spec: UpsertSpec, rowCount: number): string {
  const cols = spec.columns.join(", ");
  const tuples: string[] = [];
  let p = 1;
  for (let r = 0; r < rowCount; r++) {
    tuples.push(`(${spec.columns.map(() => `$${p++}`).join(", ")})`);
  }
  let sql = `INSERT INTO ${spec.table} (${cols}) VALUES ${tuples.join(", ")}`;
  if (spec.conflict) {
    sql += ` ON CONFLICT (${spec.conflict.target.join(", ")}) DO UPDATE SET ${spec.conflict.set.join(", ")}`;
  }
  return sql;
}

/** Chunked bulk upsert. Flattens rows to params in `spec.columns` order;
    undefined → null. Returns the number of rows written. */
export async function bulkUpsert(
  run: QueryRunner,
  spec: UpsertSpec,
  rows: ReadonlyArray<Record<string, unknown>>,
  chunkSize = 500,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const text = buildUpsertSql(spec, chunk.length);
    const params = chunk.flatMap((row) => spec.columns.map((c) => row[c] ?? null));
    await run(text, params);
    written += chunk.length;
  }
  return written;
}

/* ── row shapes ── */

/* These are `type` aliases (not interfaces) on purpose: object-literal type
   aliases get an implicit index signature, so they satisfy the
   Record<string, unknown> param of bulkUpsert; interfaces do not. */
export type SnapshotRow = {
  id: string;
  source: string;
  release_date: string | null;
  licence: string | null;
  checksum: string | null;
  row_count: number;
  notes: string | null;
};
export type SignalCatalogRow = {
  key: string;
  category: string;
  label: string;
  unit: string | null;
  direction: string;
  source: string;
  methodology_version: string | null;
};
export type GeoEntityRow = {
  geo_type: string;
  geo_code: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  boundary_version: string | null;
};
export type SignalValueRow = {
  signal_key: string;
  geo_type: string;
  geo_code: string;
  raw_value: number | null;
  raw_value_text: string | null;
  normalized_value: number | null;
  confidence: number | null;
  confidence_reason: string | null;
  source_snapshot_id: string | null;
  observed_period: string | null;
  engine_version: string | null;
};

/* ── domain writers (each is one UpsertSpec) ── */

export function writeSnapshots(rows: SnapshotRow[], run: QueryRunner = runDefault): Promise<number> {
  // Insert-only (provenance is append-only; id is the PK).
  return bulkUpsert(run, {
    table: "source_snapshots",
    columns: ["id", "source", "release_date", "licence", "checksum", "row_count", "notes"],
  }, rows);
}

export function upsertSignalCatalog(rows: SignalCatalogRow[], run: QueryRunner = runDefault): Promise<number> {
  return bulkUpsert(run, {
    table: "signals",
    columns: ["key", "category", "label", "unit", "direction", "source", "methodology_version"],
    conflict: {
      target: ["key"],
      set: [
        "category = EXCLUDED.category",
        "label = EXCLUDED.label",
        "unit = EXCLUDED.unit",
        "direction = EXCLUDED.direction",
        "source = EXCLUDED.source",
        "methodology_version = EXCLUDED.methodology_version",
      ],
    },
  }, rows);
}

export function upsertGeoEntities(rows: GeoEntityRow[], run: QueryRunner = runDefault): Promise<number> {
  return bulkUpsert(run, {
    table: "geo_entities",
    columns: ["geo_type", "geo_code", "name", "latitude", "longitude", "country", "boundary_version"],
    conflict: {
      target: ["geo_type", "geo_code"],
      set: [
        "name = EXCLUDED.name",
        "latitude = EXCLUDED.latitude",
        "longitude = EXCLUDED.longitude",
        "country = EXCLUDED.country",
        "boundary_version = EXCLUDED.boundary_version",
      ],
    },
  }, rows);
}

export function upsertSignalValues(rows: SignalValueRow[], run: QueryRunner = runDefault): Promise<number> {
  return bulkUpsert(run, {
    table: "signal_values",
    columns: [
      "signal_key", "geo_type", "geo_code", "raw_value", "raw_value_text",
      "normalized_value", "confidence", "confidence_reason", "source_snapshot_id",
      "observed_period", "engine_version",
    ],
    conflict: {
      target: ["signal_key", "geo_type", "geo_code"],
      set: [
        "raw_value = EXCLUDED.raw_value",
        "raw_value_text = EXCLUDED.raw_value_text",
        "normalized_value = EXCLUDED.normalized_value",
        "confidence = EXCLUDED.confidence",
        "confidence_reason = EXCLUDED.confidence_reason",
        "source_snapshot_id = EXCLUDED.source_snapshot_id",
        "observed_period = EXCLUDED.observed_period",
        "engine_version = EXCLUDED.engine_version",
        "updated_at = NOW()",
      ],
    },
  }, rows);
}
