/* modules/signals — the data layer's primitive.

   buildAreaProfile is a PURE function: it takes an already-geocoded area plus the
   six fetched source structs and maps them into the public Signal[] catalog
   (see @onegoodarea/contracts). No network, no scoring, no AI — that is exactly
   the point of the inversion: signals are the product, the score is a feature
   layered on top, the report is a surface.

   The signal catalog is STABLE: every area returns the same set of signal keys.
   Where a source has no coverage for an area, the signal is still present with
   `value: null` and a confidence of 0 explaining why (the HazardHub honesty
   pattern), rather than being silently omitted. A predictable schema is what an
   integrator builds a model against.

   v1 confidence is AVAILABILITY + SAMPLE based and is documented as such on the
   wire: it answers "did we get data, and was the sample adequate", not yet "is
   the value calibrated against outcomes" (the calibrated confidence model lands
   with the persisted signal store, MASTER §6 Phase 7).

   Ingestion (the source structs in ./inputs and the fetchers in ./data-sources)
   lives in this module: signals OWNS the data layer. The reports surface imports
   these FROM signals (the correct dependency direction). */

import type {
  Signal,
  SignalDirection,
  AreaGeo,
  AreaProfile,
} from "@onegoodarea/contracts";
import type {
  CrimeSummary,
  DeprivationData,
  AmenitiesData,
  FloodRiskData,
  PropertyPriceData,
  OfstedData,
} from "./inputs";
import type { GeocodedArea } from "./data-sources/postcodes";
import { METHODOLOGY_VERSION } from "../reports/methodology";

/** Full UK postcode shape — used to decide whether the resolved query is itself
    a postcode (so AreaGeo.postcode is honest rather than echoing a place name). */
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** The six source structs assembled for one area. Any field may be null when the
    source had no coverage (or the upstream fetch failed and returned null). */
export interface AreaSources {
  crime: CrimeSummary | null;
  deprivation: DeprivationData | null;
  amenities: AmenitiesData | null;
  flood: FloodRiskData | null;
  property: PropertyPriceData | null;
  ofsted: OfstedData | null;
}

/* ── confidence (v1: availability + sample based) ── */

interface Conf {
  confidence: number;
  confidence_reason: string;
}

const notAvailable = (source: string): Conf => ({
  confidence: 0,
  confidence_reason: `No ${source} coverage for this area.`,
});

/* AR-268: police.uk responded but recorded zero crimes for the queried
   window. NOT the same as "no coverage" — every England/Wales LSOA is
   covered. Low-traffic residential areas legitimately produce this. */
const zeroCrimesRecorded: Conf = {
  confidence: 0.6,
  confidence_reason: "police.uk recorded zero crimes in the last 3 months for this area.",
};

/* AR-268: police.uk request failed (timeout / 5xx / network). Distinct
   from a definitive zero so we don't mislabel a transient outage as
   "no coverage". */
const fetchFailed = (source: string): Conf => ({
  confidence: 0,
  confidence_reason: `${source} request failed for this area; try again shortly.`,
});

const available = (source: string, note?: string): Conf => ({
  confidence: 0.9,
  confidence_reason: note ?? `${source} returned data for this area.`,
});

/** OpenStreetMap is crowd-sourced and queried live; slightly below official
    sources because coverage density varies by area. */
const osmAvailable: Conf = {
  confidence: 0.85,
  confidence_reason: "OpenStreetMap live query; coverage is crowd-sourced and varies by area.",
};

/** Confidence that scales with the transaction sample behind a price figure
    (mirrors the engine's variance-aware property confidence, AR-137). */
function sampleConfidence(source: string, n: number): Conf {
  if (n >= 30) return { confidence: 0.9, confidence_reason: `${source}: ${n} transactions, robust sample.` };
  if (n >= 10) return { confidence: 0.6, confidence_reason: `${source}: ${n} transactions, moderate sample. Treat as indicative.` };
  return { confidence: 0.4, confidence_reason: `${source}: only ${n} transactions, small sample. Low reliability.` };
}

/** Crime confidence scales with how many months police.uk returned. */
function crimeConfidence(months: number): Conf {
  if (months >= 6) return { confidence: 0.9, confidence_reason: `police.uk: ${months} months of data.` };
  if (months >= 3) return { confidence: 0.6, confidence_reason: `police.uk: only ${months} months of data.` };
  return { confidence: 0.4, confidence_reason: `police.uk: sparse data (${months} months).` };
}

/* ── small builders ── */

/** Construct one Signal. Keeps the catalog below readable by collapsing the ten
    fields to the ones that actually vary per signal. */
function sig(
  key: string,
  category: Signal["category"],
  label: string,
  value: number | string | null,
  unit: string | null,
  direction: SignalDirection,
  source: string,
  observed_period: string,
  conf: Conf,
): Signal {
  return {
    key,
    category,
    label,
    value,
    unit,
    direction,
    source,
    observed_period,
    confidence: conf.confidence,
    confidence_reason: conf.confidence_reason,
  };
}

/** Human-readable period covered by the police.uk crime window. */
function crimePeriod(crime: CrimeSummary | null): string {
  if (!crime || crime.monthly_trend.length === 0) return "Last 12 months";
  const months = crime.monthly_trend.map((m) => m.month).sort();
  const fmt = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };
  const oldest = months[0];
  const newest = months[months.length - 1];
  return oldest === newest ? fmt(newest) : `${fmt(oldest)} to ${fmt(newest)}`;
}

/** The official deprivation index name for the area's country. */
function deprivationSource(d: DeprivationData): string {
  const code = d.lsoa_code || "";
  if (code.startsWith("W")) return "WIMD 2019";
  if (code.startsWith("S")) return "SIMD 2020";
  return "IMD 2025";
}

/* ── the mapper ── */

export function buildAreaProfile(
  geo: GeocodedArea,
  sources: AreaSources,
  fetchMode: AreaProfile["meta"]["fetch_mode"] = "live",
): AreaProfile {
  const { crime, deprivation, amenities, flood, property, ofsted } = sources;
  const signals: Signal[] = [];

  /* crime — police.uk */
  {
    const period = crimePeriod(crime);
    /* AR-268: three-way fork instead of crime-or-not. null = fetch failed,
       total_crimes === 0 = API said zero, otherwise the usual sample-size
       confidence ladder. */
    const conf =
      crime === null
        ? fetchFailed("police.uk")
        : crime.total_crimes === 0
          ? zeroCrimesRecorded
          : crimeConfidence(crime.months_covered);
    const monthlyRate =
      crime && crime.months_covered > 0 ? Math.round(crime.total_crimes / crime.months_covered) : null;
    signals.push(
      sig("crime.total_12m", "crime", "Recorded crimes (12 months)", crime?.total_crimes ?? null, "count", "lower_is_better", "police.uk", period, conf),
      sig("crime.monthly_rate", "crime", "Recorded crimes per month", monthlyRate, "per_month", "lower_is_better", "police.uk", period, conf),
    );
  }

  /* deprivation — IMD / WIMD / SIMD */
  {
    const source = deprivation ? deprivationSource(deprivation) : "IMD 2025";
    const conf = deprivation
      ? available(source, `${source}: official LSOA-level index.`)
      : notAvailable("the deprivation index");
    signals.push(
      sig("deprivation.imd_decile", "deprivation", "Deprivation decile (1 most deprived, 10 least)", deprivation?.imd_decile ?? null, "decile", "higher_is_better", source, "Official release", conf),
      sig("deprivation.imd_rank", "deprivation", "Deprivation rank (higher is less deprived)", deprivation?.imd_rank ?? null, "rank", "higher_is_better", source, "Official release", conf),
    );
  }

  /* property — HM Land Registry */
  {
    const source = "HM Land Registry";
    const period = property?.period ?? "Latest available";
    const conf = property ? sampleConfidence(source, property.transaction_count) : notAvailable(source);
    signals.push(
      sig("property.median_price", "property", "Median sale price", property?.median_price ?? null, "GBP", "neutral", source, period, conf),
      sig("property.price_change_pct", "property", "Price change (year on year)", property?.price_change_pct ?? null, "pct", "neutral", source, period, conf),
      sig("property.transaction_count", "property", "Sale transactions in period", property?.transaction_count ?? null, "count", "neutral", source, period, conf),
    );
  }

  /* schools — Ofsted (England) / Estyn / Education Scotland */
  {
    const source = ofsted?.inspectorate || "Ofsted";
    const hasRated = !!ofsted && ofsted.total_rated > 0;
    const goodOrOutstanding = hasRated
      ? Math.round(
          (Object.entries(ofsted!.rating_breakdown)
            .filter(([rating]) => /outstanding|good/i.test(rating))
            .reduce((sum, [, count]) => sum + count, 0) /
            ofsted!.total_rated) *
            100,
        )
      : null;
    const conf = hasRated
      ? available(source, `${source}: ${ofsted!.total_rated} rated schools within range.`)
      : { confidence: 0, confidence_reason: `No ${source} rated schools found within range of this area.` };
    signals.push(
      sig("schools.rated_count", "schools", "Inspected schools within range", ofsted?.total_rated ?? null, "count", "neutral", source, "Latest inspections", conf),
      sig("schools.good_or_outstanding_pct", "schools", "Schools rated Good or Outstanding", goodOrOutstanding, "pct", "higher_is_better", source, "Latest inspections", conf),
    );
  }

  /* amenities — OpenStreetMap */
  {
    const source = "OpenStreetMap";
    const conf = amenities ? osmAvailable : notAvailable(source);
    const amenity = (key: string, label: string, value: number | null) =>
      sig(key, "amenities", label, value, "count", "higher_is_better", source, "Live query", conf);
    signals.push(
      amenity("amenities.total", "Amenities nearby (total)", amenities?.total ?? null),
      amenity("amenities.restaurants_cafes", "Restaurants and cafes", amenities?.restaurants_cafes ?? null),
      amenity("amenities.pubs_bars", "Pubs and bars", amenities?.pubs_bars ?? null),
      amenity("amenities.healthcare", "Healthcare facilities", amenities?.healthcare ?? null),
      amenity("amenities.shops", "Shops", amenities?.shops ?? null),
      amenity("amenities.parks_leisure", "Parks and leisure", amenities?.parks_leisure ?? null),
    );
  }

  /* transport — OpenStreetMap (transport counts live in the amenities struct) */
  {
    const source = "OpenStreetMap";
    const conf = amenities ? osmAvailable : notAvailable(source);
    signals.push(
      sig("transport.stations", "transport", "Transport stations nearby", amenities?.transport_stations ?? null, "count", "higher_is_better", source, "Live query", conf),
      sig("transport.bus_stops", "transport", "Bus stops nearby", amenities?.bus_stops ?? null, "count", "higher_is_better", source, "Live query", conf),
    );
  }

  /* environment — Environment Agency (flood) */
  {
    const source = "Environment Agency";
    const conf = flood ? available(source, `${source}: live flood-risk query.`) : notAvailable(source);
    signals.push(
      sig("environment.flood_areas_nearby", "environment", "Flood-risk areas nearby", flood?.flood_areas_nearby ?? null, "count", "lower_is_better", source, "Live query", conf),
      sig("environment.active_flood_warnings", "environment", "Active flood warnings", flood?.active_warnings.length ?? null, "count", "lower_is_better", source, "Live query", conf),
    );
  }

  /* sources that contributed at least one non-null signal, for the meta block */
  const sources_used = Array.from(
    new Set(signals.filter((s) => s.value !== null).map((s) => s.source)),
  );

  const area: AreaGeo = {
    query: geo.query,
    postcode: POSTCODE_RE.test(geo.query.trim()) ? geo.query.trim() : null,
    latitude: geo.latitude,
    longitude: geo.longitude,
    lsoa: geo.lsoa || null,
    msoa: geo.msoa || null,
    admin_district: geo.admin_district || null,
    region: geo.region || null,
    country: geo.country,
    area_type: geo.area_type,
  };

  return {
    geo: area,
    signals,
    meta: {
      engine_version: METHODOLOGY_VERSION,
      generated_at: new Date().toISOString(),
      sources: sources_used,
      fetch_mode: fetchMode,
    },
  };
}
