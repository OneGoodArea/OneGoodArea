/* modules/signals/store-reader — serve signals FROM the persisted store.

   The read half of the fetch-on-read → serve-from-store shift. For now it reads
   deprivation (the first source refreshed into the store) and reconstructs the
   SAME DeprivationData struct the live fetcher returns, so buildAreaProfile is
   unchanged and a store-served signal is byte-identical to a live-served one.

   Boundary-version note: deprivation is keyed by the source's own LSOA codes
   (England LSOA21CD = the same code geo.lsoa carries, so England matches; Wales
   WIMD-2019 + Scotland SIMD-2020 use 2011 codes, which won't match the 2021
   geo.lsoa, so those naturally fall back to live until the ONS geo spine
   normalizes boundaries). See ADR 0004. */

import { query as defaultQuery } from "../../infrastructure/db/client";
import type { DeprivationData } from "./inputs";

/** Parameterized read runner ($1, $2, …). Injected in tests. */
export type Reader = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const runDefault: Reader = (text, params) => defaultQuery(text, params);

/** Read deprivation for an LSOA from the store, or null if not present (caller
    falls back to a live fetch). Requires BOTH rank and decile to be stored;
    otherwise treats it as a miss so we never serve a partial struct. */
export async function readDeprivationFromStore(
  geoCode: string,
  run: Reader = runDefault,
): Promise<DeprivationData | null> {
  if (!geoCode) return null;

  const rows = await run(
    `SELECT signal_key, raw_value
       FROM signal_values
      WHERE geo_type = 'lsoa' AND geo_code = $1
        AND signal_key IN ('deprivation.imd_rank', 'deprivation.imd_decile')`,
    [geoCode],
  );

  let rank: number | null = null;
  let decile: number | null = null;
  for (const r of rows) {
    const v = r.raw_value;
    if (v === null || v === undefined) continue;
    if (r.signal_key === "deprivation.imd_rank") rank = Number(v);
    else if (r.signal_key === "deprivation.imd_decile") decile = Number(v);
  }
  if (rank === null || Number.isNaN(rank) || decile === null || Number.isNaN(decile)) {
    return null;
  }

  // lsoa_code must be the real code (its prefix drives the source label in
  // buildAreaProfile); name/LA aren't used by the signal mapping.
  return { lsoa_code: geoCode, lsoa_name: "", local_authority: "", imd_rank: rank, imd_decile: decile };
}

/** Per-signal normalization (normalized_value 0-1 + national percentile 0-100)
    for the deprivation signals at an LSOA, keyed by signal_key. Used to enrich
    the served Signals when deprivation is store-backed. Empty when absent. */
export async function readDeprivationNormalization(
  geoCode: string,
  run: Reader = runDefault,
): Promise<Record<string, { normalized_value: number | null; percentile: number | null }>> {
  if (!geoCode) return {};

  const rows = await run(
    `SELECT sv.signal_key, sv.normalized_value, sp.percentile
       FROM signal_values sv
       LEFT JOIN signal_percentiles sp
         ON sp.signal_key = sv.signal_key AND sp.geo_type = sv.geo_type
        AND sp.geo_code = sv.geo_code AND sp.scope = 'national'
      WHERE sv.geo_type = 'lsoa' AND sv.geo_code = $1
        AND sv.signal_key IN ('deprivation.imd_rank', 'deprivation.imd_decile')`,
    [geoCode],
  );

  const out: Record<string, { normalized_value: number | null; percentile: number | null }> = {};
  for (const r of rows) {
    const key = r.signal_key as string;
    out[key] = {
      normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
      percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    };
  }
  return out;
}
