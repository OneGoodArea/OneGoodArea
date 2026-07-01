# ADR 0004 — Serving from the store (read-through + hybrid provenance)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Context refs:** ADR 0002 (schema), ADR 0003 (refresh jobs); Jira AR-171.

## Context

The store can now be populated (ADR 0003, deprivation first). The read half of
the fetch-on-read → serve-from-store shift needs to: serve store-backed signals,
be non-breaking, be honest about provenance during a transition where only some
sources are in the store, and be reversible instantly.

## Decision

1. **Read-through with live fallback.** `store-reader.readDeprivationFromStore`
   reconstructs the **same `DeprivationData` struct** the live fetcher returns, so
   `buildAreaProfile` is unchanged and a store-served signal is byte-identical to
   a live one. On a store hit, `getAreaProfile` **skips the live deprivation
   fetch**; on a miss it falls back to the live fetch.

2. **A separate flag** `OGA_SIGNALS_STORE_READ` (independent of the endpoint flag
   `OGA_SIGNALS_API`). Off by default = exactly today's all-live behaviour. The
   read path can be enabled on its own, only after a refresh has populated the
   store, and killed instantly.

3. **`fetch_mode` gains `"hybrid"`** (additive enum change). During the transition
   a profile is part store-backed (deprivation) and part live (the other five),
   which is honestly `"hybrid"`. It becomes `"store"` only once every contributing
   source is served from the store; `"live"` when none are.

4. **England-first, by code space.** Deprivation is keyed by the source's own LSOA
   code. England's IMD 2025 uses LSOA21CD, which is the same code `geo.lsoa`
   carries, so England matches the store. Wales (WIMD 2019) and Scotland (SIMD
   2020) use 2011 codes that won't match the 2021 `geo.lsoa`, so they naturally
   fall back to live until the ONS geo spine normalizes boundaries. No
   special-casing: a non-match is just a store miss.

5. **Completeness guard.** The store read requires BOTH rank and decile; a partial
   record is treated as a miss, so we never serve a half-populated struct.

## Consequences

**Positive**
- Proves the full write→read→serve loop on a real source, non-breaking (flag off
  reproduces today exactly), with output parity guaranteed by struct
  reconstruction (the golden path of the live fetch is reused verbatim).
- Honest provenance on the wire (`hybrid`) instead of pretending fully-live or
  fully-store.

**Negative / accepted**
- Wales/Scotland are not store-served yet (boundary mismatch) — resolved when the
  ONS spine lands and `geo_lookup` normalizes codes.
- v1 confidence on a store-served deprivation signal is still computed by
  `buildAreaProfile` (identical 0.9 for deprivation), not read from the stored
  `confidence` column. Per-signal stored/calibrated confidence rides with the
  normalization work (Phase 7).
- Reconstructing the struct drops `lsoa_name`/`local_authority` (unused by the
  signal mapping; the `lsoa_code` prefix still drives the correct source label).

## Alternatives considered

- **Per-signal provenance** (a `from_store`/`source_snapshot` field on every
  `Signal`). The most honest/auditable end state and aligned with the lineage
  moat, but a bigger contract change; deferred until lineage/audit features are
  built. Profile-level `hybrid` is enough to prove the loop now.
- **Replace signals after building the live profile.** Messier than reconstructing
  the source struct and letting the one mapper run.
- **Binary `fetch_mode` only** (call it "live" until fully store-backed). Rejected:
  dishonest while deprivation is genuinely served from the store.
