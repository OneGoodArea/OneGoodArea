/* @onegoodarea/contracts — the signal-first primitive.

   This is the public shape the data layer is built around: the Signal is the
   product, the Score is a feature on top, the report is a surface. Every other
   product (Scores, Monitor, Intelligence) composes these types, so this file is
   the single hardest thing to change once customers depend on it.

   Defined as Zod schemas (runtime-validatable at the API boundary) with the TS
   types inferred from them, so apps/web and apps/api share ONE source of truth
   that can't drift between compile time and run time.

   v1 scope (the thin GET /v1/area slice over live-fetch): raw observed values +
   per-signal confidence + source + period. Deliberately NOT here yet, added
   additively when the persisted signal store lands:
     - normalized_value / percentile  (needs the store + normalization models)
     - higher-grain geo (uprn / address) (procurement-gated, AR-134)
   Keeping v1 honest: we expose what we actually compute, nothing we don't. */

import { z } from "zod";

/* ── Geo ── */

/** Settlement classification, derived from the ONS rural-urban code. Canonical
    home for the type (the report shape re-exports it from here). */
export const AreaTypeSchema = z.enum(["urban", "suburban", "rural"]);
export type AreaType = z.infer<typeof AreaTypeSchema>;

/** The geographic identity of an area, resolved from a postcode or place name.
    The fields beyond lat/lng are the ONS spine handles (lsoa/msoa/lad) that make
    an area addressable and, later, cross-area queryable. */
export const AreaGeoSchema = z.object({
  /** The free-text query that resolved to this area (postcode or place name). */
  query: z.string(),
  /** The canonical postcode if one resolved, else null (place-name queries). */
  postcode: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  /** ONS Lower-layer Super Output Area code (the LSOA/Data-Zone grain). */
  lsoa: z.string().nullable(),
  /** ONS Middle-layer Super Output Area code. */
  msoa: z.string().nullable(),
  /** Local Authority District name. */
  admin_district: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string(),
  area_type: AreaTypeSchema,
});
export type AreaGeo = z.infer<typeof AreaGeoSchema>;

/* ── Signal ── */

/** The seven signal categories exposed today. One per data domain; OpenStreetMap
    feeds both `amenities` and `transport`. Mirrors the public Data Catalog. New
    categories are added additively (e.g. `income`, `demographics`) when sources
    land — never renamed, since the category is part of every signal key. */
export const SIGNAL_CATEGORIES = [
  "crime",
  "deprivation",
  "property",
  "schools",
  "amenities",
  "transport",
  "environment",
] as const;
export const SignalCategorySchema = z.enum(SIGNAL_CATEGORIES);
export type SignalCategory = z.infer<typeof SignalCategorySchema>;

/** Runtime guard for a signal category — use at trust boundaries (the
    /v1/signals/{category} path param). */
export function isSignalCategory(value: unknown): value is SignalCategory {
  return typeof value === "string" && (SIGNAL_CATEGORIES as readonly string[]).includes(value);
}

/** How to read a raw value against "good". Catalog metadata we know today (e.g.
    more crime is worse, a higher IMD decile is less deprived), so it ships in v1
    to make raw signals interpretable without our scoring layer. */
export const SignalDirectionSchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "neutral",
]);
export type SignalDirection = z.infer<typeof SignalDirectionSchema>;

/** One addressable data point for an area: the atomic unit of the Signals
    product. `key` is stable and namespaced by category (e.g. "crime.total_12m")
    so a client can pin to exactly the signals their model consumes. */
export const SignalSchema = z.object({
  /** Stable, category-namespaced identifier, e.g. "property.median_price". */
  key: z.string(),
  category: SignalCategorySchema,
  /** Human-readable label for display surfaces. */
  label: z.string(),
  /** The raw observed value. null = the source has no coverage for this area
      (distinct from a real 0); confidence then reports why. */
  value: z.union([z.number(), z.string(), z.null()]),
  /** Unit of `value`: "count", "GBP", "decile", "rank", "pct", "per_month"… */
  unit: z.string().nullable(),
  /** Position of the raw value within its comparison distribution (0-1,
      ascending by raw value). Present only when served from the store + a
      normalization run; absent on live-fetched signals. Read with `direction`. */
  normalized_value: z.number().nullable().optional(),
  /** Percentile rank (0-100) within the signal's comparison scope
      (national-within-country for deprivation). Present only when store-backed
      + normalized. */
  percentile: z.number().min(0).max(100).nullable().optional(),
  direction: SignalDirectionSchema,
  /** 0..1 data-trust for THIS signal. v1 = availability/sample-based heuristic;
      the calibrated confidence model lands with the store (Phase 7). */
  confidence: z.number().min(0).max(1),
  /** Plain-language reason behind the confidence value (honesty as a feature). */
  confidence_reason: z.string(),
  /** Attribution: the dataset this value came from, e.g. "police.uk". */
  source: z.string(),
  /** The period the value describes, e.g. "Apr 2025 to Mar 2026" or "IMD 2025". */
  observed_period: z.string(),
});
export type Signal = z.infer<typeof SignalSchema>;

/* ── Signal catalogue ── */

/** AR-259: static catalogue of the signal keys currently exposed by
   /v1/signals/:category. One row per addressable signal. Source of
   truth for catalogue surfaces (dashboard /signals, docs reference,
   etc.). Mirrors what apps/api/src/modules/signals/area-profile.ts
   produces per request; when a signal is added there it MUST be
   added here too. */
export interface SignalCatalogueEntry {
  /** Stable category-namespaced identifier, e.g. "property.median_price". */
  key: string;
  category: SignalCategory;
  /** Display label. */
  label: string;
  /** Unit of the raw value: "count", "GBP", "decile", "rank", "pct",
      "per_month", etc. */
  unit: string;
  /** Which direction reads as "better" for this signal. */
  direction: SignalDirection;
  /** Dataset attribution shown on every signal response. */
  source: string;
}

export const SIGNAL_CATALOGUE: SignalCatalogueEntry[] = [
  /* crime, police.uk */
  { key: "crime.total_12m",        category: "crime",        label: "Recorded crimes (12 months)",            unit: "count",     direction: "lower_is_better",  source: "police.uk" },
  { key: "crime.monthly_rate",     category: "crime",        label: "Recorded crimes per month",              unit: "per_month", direction: "lower_is_better",  source: "police.uk" },

  /* deprivation, IMD / WIMD / SIMD */
  { key: "deprivation.imd_decile", category: "deprivation",  label: "Deprivation decile (1 most, 10 least)",  unit: "decile",    direction: "higher_is_better", source: "IMD / WIMD / SIMD" },
  { key: "deprivation.imd_rank",   category: "deprivation",  label: "Deprivation rank (higher is less)",      unit: "rank",      direction: "higher_is_better", source: "IMD / WIMD / SIMD" },

  /* property, HM Land Registry */
  { key: "property.median_price",       category: "property", label: "Median sale price",                unit: "GBP",   direction: "neutral",          source: "HM Land Registry" },
  { key: "property.price_change_pct",   category: "property", label: "Price change (year on year)",      unit: "pct",   direction: "neutral",          source: "HM Land Registry" },
  { key: "property.transaction_count",  category: "property", label: "Sale transactions in period",      unit: "count", direction: "neutral",          source: "HM Land Registry" },

  /* schools, Ofsted / Estyn / Education Scotland */
  { key: "schools.rated_count",                 category: "schools", label: "Inspected schools within range",         unit: "count", direction: "neutral",          source: "Ofsted / Estyn / Education Scotland" },
  { key: "schools.good_or_outstanding_pct",     category: "schools", label: "Schools rated Good or Outstanding",      unit: "pct",   direction: "higher_is_better", source: "Ofsted / Estyn / Education Scotland" },

  /* amenities, OpenStreetMap */
  { key: "amenities.total",             category: "amenities", label: "Amenities nearby (total)",     unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "amenities.restaurants_cafes", category: "amenities", label: "Restaurants and cafes",        unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "amenities.pubs_bars",         category: "amenities", label: "Pubs and bars",                unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "amenities.healthcare",        category: "amenities", label: "Healthcare facilities",        unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "amenities.shops",             category: "amenities", label: "Shops",                        unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "amenities.parks_leisure",     category: "amenities", label: "Parks and leisure",            unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },

  /* transport, OpenStreetMap */
  { key: "transport.stations",  category: "transport", label: "Transport stations nearby", unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },
  { key: "transport.bus_stops", category: "transport", label: "Bus stops nearby",          unit: "count", direction: "higher_is_better", source: "OpenStreetMap" },

  /* environment, Environment Agency */
  { key: "environment.flood_areas_nearby",    category: "environment", label: "Flood-risk areas nearby", unit: "count", direction: "lower_is_better", source: "Environment Agency" },
  { key: "environment.active_flood_warnings", category: "environment", label: "Active flood warnings",   unit: "count", direction: "lower_is_better", source: "Environment Agency" },
];

/* ── Request query params for signal routes ── */

/** Query params for GET /v1/area. One of `area` or `postcode` is required. */
export const AreaRequestSchema = z.object({
  /** UK postcode or place name, e.g. "SW1A 1AA" or "Clapham". */
  area: z.string().min(1).optional(),
  /** Alias for `area` — accepts a UK postcode. */
  postcode: z.string().min(1).optional(),
}).strict().refine(
  (p) => p.area !== undefined || p.postcode !== undefined,
  { message: "Either area or postcode query parameter is required." },
);
export type AreaRequest = z.infer<typeof AreaRequestSchema>;

/* ── Area profile (the GET /v1/area response) ── */

/** All signals for one area: the response of GET /v1/area. The flagship Signals
    payload. `meta.fetch_mode` is honest about provenance: "live" today (fetched
    per request), "store" once the persisted signal store backs it. */
export const AreaProfileSchema = z.object({
  geo: AreaGeoSchema,
  signals: z.array(SignalSchema),
  meta: z.object({
    /** Methodology/engine version that produced this profile. */
    engine_version: z.string(),
    /** ISO timestamp the profile was assembled. */
    generated_at: z.string(),
    /** The source datasets that contributed at least one signal. */
    sources: z.array(z.string()),
    /** Provenance of the values:
        - "live"   = every signal fetched on this request (today's default).
        - "store"  = every contributing signal served from the persisted store.
        - "hybrid" = a mix (some store-backed, some still live) during the
                     transition as sources are migrated into the store. */
    fetch_mode: z.enum(["live", "store", "hybrid"]),
  }),
});
export type AreaProfile = z.infer<typeof AreaProfileSchema>;
