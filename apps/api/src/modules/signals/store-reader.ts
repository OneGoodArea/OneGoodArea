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
