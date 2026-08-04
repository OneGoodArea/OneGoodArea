import type { Intent } from "@onegoodarea/contracts";
import type {
  CrimeSummary,
  DeprivationData,
  AmenitiesData,
  FloodRiskData,
  PropertyPriceData,
  OfstedData,
  AreaType,
} from "../../signals/inputs";
import { crimeConfidence } from "../../signals/crime-confidence";

/* ── Types ── */

export interface ComputedDimension {
  label: string;
  score: number;
  weight: number;
  reasoning: string;
  confidence: number;          // 0.0–1.0, derived from data quality signals
  confidence_reason: string;   // human-readable why
}

export interface ComputedScores {
  overall: number;
  dimensions: ComputedDimension[];
  area_type: AreaType;
  confidence: number;          // weighted average of dimension confidences
}

/* ── Confidence constants ──
   Each scoring function attaches one of these to its return based on the
   quality of the inputs it had available. Overall confidence is a
   weighted average across dimensions, matching the score weighting.

   Convention:
   - HIGH    (1.0): fresh, complete, primary-source data
   - MEDIUM  (0.7): some sparseness, older dataset (e.g. WIMD 2019), or
                    partial fallback that still uses real signal
   - LOW     (0.4): minimal data or full proxy fallback
                    (e.g. IMD decile substituting for property prices)
   - NONE    (0.2): no data — function returned the default score of 50
*/
const CONF_HIGH = 1.0;
const CONF_MEDIUM = 0.7;
const CONF_LOW = 0.4;
const CONF_NONE = 0.2;

/* AR-137: variance-aware property confidence rubric (v2.0.1).
   The Land Registry-backed dimensions used to gate confidence purely on
   transaction count (>=20 → HIGH). That was optically generous when a small
   sample carried a wide YoY swing: e.g. York YO1 returned HIGH on 83 txns
   with a -21% YoY change. Honest confidence has to factor volatility too.

   Rubric:
   - HIGH:   >= 50 transactions AND <= 15% absolute YoY change (robust + stable)
   - MEDIUM: >= 20 transactions (either smaller sample, or volatile)
   - LOW:    < 20 transactions

   Used by scoreCostOfLiving, scorePriceGrowth, scoreCommercialCosts,
   scoreRentalYield. The last two are proxy dimensions and clamp the result
   to CONF_MEDIUM regardless.
*/
export function propertyConfidence(
  txns: number,
  yoyChangePct: number | null,
): { value: number; reason: string } {
  const yoyAbs = yoyChangePct === null ? 0 : Math.abs(yoyChangePct);
  const isHighSample = txns >= 50;
  const isVolatile = yoyAbs > 15;

  if (isHighSample && !isVolatile) {
    return {
      value: CONF_HIGH,
      reason: `Robust sample (${txns} HM Land Registry transactions) with stable prices (±${yoyAbs.toFixed(1)}% YoY)`,
    };
  }
  if (txns >= 20) {
    return {
      value: CONF_MEDIUM,
      reason: isVolatile
        ? `${txns} transactions, but ±${yoyAbs.toFixed(1)}% YoY volatility caps confidence at moderate`
        : `Moderate sample (${txns} transactions)`,
    };
  }
  return {
    value: CONF_LOW,
    reason: `Sparse sample (${txns} transactions): insufficient for high confidence.`,
  };
}

/* Internal return type for individual scoring functions. */
interface ScoreResult {
  score: number;
  reasoning: string;
  confidence: number;
  confidence_reason: string;
}

/* ── Area-Type Benchmarks ── */
// These define "good" values for each area type.
// Rural areas need fewer amenities/transport to score well.

interface Benchmarks {
  transport: { stationMultiplier: number; busMultiplier: number; maxBusScore: number };
  schools: { multiplier: number; base: number };
  amenities: { schools: number; food: number; health: number; shops: number; parks: number };
}

const BENCHMARKS: Record<AreaType, Benchmarks> = {
  urban: {
    transport: { stationMultiplier: 16, busMultiplier: 3.3, maxBusScore: 40 },
    schools: { multiplier: 28, base: 8 },
    amenities: { schools: 8, food: 20, health: 6, shops: 5, parks: 4 },
  },
  suburban: {
    transport: { stationMultiplier: 20, busMultiplier: 4, maxBusScore: 45 },
    schools: { multiplier: 32, base: 10 },
    amenities: { schools: 6, food: 14, health: 4, shops: 4, parks: 3 },
  },
  rural: {
    transport: { stationMultiplier: 30, busMultiplier: 6, maxBusScore: 55 },
    schools: { multiplier: 45, base: 15 },
    amenities: { schools: 3, food: 6, health: 2, shops: 2, parks: 2 },
  },
};

/* ── Helpers ── */

function clamp(val: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, val)));
}

/* ── Core Scoring Functions ── */

function scoreSafety(crime: CrimeSummary | null): ScoreResult {
  if (!crime) {
    return { score: 50, reasoning: "Crime data unavailable for this location", confidence: CONF_NONE, confidence_reason: "No police.uk data returned for these coordinates" };
  }
  if (crime.total_crimes === 0) {
    /* AR-393: zero-crime confidence now comes from the shared
       crime-confidence module so /v1/score and /v1/area report the same
       number. The score branch (50) is unchanged because this dimension
       can't tell a "quiet area" from "police.uk has gaps here" with
       only the API response. */
    const { confidence, confidence_reason } = crimeConfidence(crime);
    return { score: 50, reasoning: "Zero crimes recorded in the trailing window", confidence, confidence_reason };
  }

  const monthlyRate = crime.total_crimes / Math.max(crime.months_covered, 1);

  // Sigmoid curve: 10/mo → 86, 30/mo → 67, 60/mo → 50, 100/mo → 38, 200/mo → 23
  let baseScore = 100 * (1 - monthlyRate / (monthlyRate + 60));

  // Violent crime adjustment (case-insensitive lookup)
  const violentPatterns = ["violen", "robbery"];
  const categoryKeys = Object.keys(crime.by_category);
  const violentCount = violentPatterns.reduce((sum, pattern) => {
    const match = categoryKeys.find(k => k.toLowerCase().includes(pattern));
    return sum + (match ? crime.by_category[match] : 0);
  }, 0);
  const violentPct = (violentCount / crime.total_crimes) * 100;

  if (violentPct > 30) baseScore -= 10;
  else if (violentPct > 20) baseScore -= 5;
  else if (violentPct < 10) baseScore += 5;

  // Trend adjustment
  if (crime.monthly_trend.length >= 2) {
    const first = crime.monthly_trend[0].count;
    const last = crime.monthly_trend[crime.monthly_trend.length - 1].count;
    if (first > 0) {
      const change = (last - first) / first;
      if (change > 0.2) baseScore -= 5;
      else if (change < -0.2) baseScore += 5;
    }
  }

  const score = clamp(baseScore, 5, 95);

  // Reasoning
  const topCategory = Object.entries(crime.by_category).sort((a, b) => b[1] - a[1])[0];
  const parts: string[] = [
    `${crime.total_crimes} crimes over ${crime.months_covered} months (${Math.round(monthlyRate)}/month)`,
  ];
  if (topCategory) {
    parts.push(`most common: ${topCategory[0]} (${((topCategory[1] / crime.total_crimes) * 100).toFixed(0)}%)`);
  }
  parts.push(`violent crime: ${violentPct.toFixed(0)}% of total`);

  if (crime.monthly_trend.length >= 2) {
    const first = crime.monthly_trend[0].count;
    const last = crime.monthly_trend[crime.monthly_trend.length - 1].count;
    const trend = last > first * 1.1 ? "rising" : last < first * 0.9 ? "falling" : "stable";
    parts.push(`trend: ${trend}`);
  }

  // AR-393: confidence comes from the shared crime-confidence module so
  // /v1/score and /v1/area never disagree on the same data point.
  const { confidence, confidence_reason } = crimeConfidence(crime);

  return { score, reasoning: parts.join(". "), confidence, confidence_reason };
}

function scoreTransport(amenities: AmenitiesData | null, bench: Benchmarks): ScoreResult {
  if (!amenities) {
    return { score: 50, reasoning: "Transport data unavailable", confidence: CONF_NONE, confidence_reason: "No OpenStreetMap data returned for these coordinates" };
  }

  const stations = amenities.transport_stations;
  const busStops = amenities.bus_stops;

  const sm = bench.transport.stationMultiplier;
  const stationScore = Math.min(stations, 5) * sm - Math.max(0, stations - 1) * (sm / 4);
  const adjustedStation = Math.max(0, stationScore);

  const busScore = Math.min(busStops * bench.transport.busMultiplier, bench.transport.maxBusScore);

  const score = clamp(adjustedStation + busScore, 5, 95);

  const stationNames = amenities.highlights.filter(h => h.toLowerCase().includes("station"));
  const parts: string[] = [
    `${stations} rail/tube station${stations !== 1 ? "s" : ""} within 2km`,
    `${busStops} bus stop${busStops !== 1 ? "s" : ""} within 500m`,
  ];
  if (stationNames.length > 0) {
    parts.push(`nearby: ${stationNames.slice(0, 3).join(", ")}`);
  }

  // Confidence: OSM transport coverage varies. Confidence rises with named stations and bus density.
  const transportSignals = stations + Math.min(busStops, 30);
  let confidence: number;
  let confidence_reason: string;
  if (transportSignals >= 15 && stationNames.length > 0) {
    confidence = CONF_HIGH;
    confidence_reason = `${stations} stations and ${busStops} bus stops with named OSM entries`;
  } else if (transportSignals >= 5) {
    confidence = CONF_MEDIUM;
    confidence_reason = `${stations} stations and ${busStops} bus stops — moderate OSM coverage`;
  } else {
    confidence = CONF_LOW;
    confidence_reason = `Sparse transport amenities in the catchment — OSM coverage may be incomplete`;
  }

  return { score, reasoning: parts.join(". "), confidence, confidence_reason };
}

// Quality weights: Good = 1.0 (neutral, same as count-only). Outstanding gives bonus, poor schools penalise.
const OFSTED_QUALITY_WEIGHTS: Record<string, number> = {
  "Outstanding": 1.2,
  "Good": 1.0,
  "Requires Improvement": 0.5,
  "Inadequate": 0.2,
  "Not rated": 0.7,
};

function scoreSchools(amenities: AmenitiesData | null, bench: Benchmarks, ofsted: OfstedData | null): ScoreResult {
  if (!amenities && !ofsted) {
    return { score: 50, reasoning: "Education data unavailable", confidence: CONF_NONE, confidence_reason: "No OpenStreetMap or Ofsted data available for this location" };
  }

  const osmCount = amenities?.schools ?? 0;

  // Quality-weighted scoring when Ofsted data is available
  if (ofsted && ofsted.total_rated > 0) {
    let weightedCount = 0;
    for (const school of ofsted.schools) {
      weightedCount += OFSTED_QUALITY_WEIGHTS[school.rating_text] ?? 0.7;
    }

    const score = clamp(Math.sqrt(weightedCount) * bench.schools.multiplier + bench.schools.base, 5, 95);

    const breakdownParts = Object.entries(ofsted.rating_breakdown)
      .map(([rating, count]) => `${count} ${rating}`)
      .join(", ");

    const otherFacilities = Math.max(0, osmCount - ofsted.total_rated);
    const otherPart = otherFacilities > 0 ? `. ${otherFacilities} additional educational facilities nearby` : "";

    const reasoning = `${ofsted.total_rated} ${ofsted.inspectorate}-rated school${ofsted.total_rated !== 1 ? "s" : ""} within 1.5km (${breakdownParts})${otherPart}`;
    // Confidence: HIGH when Ofsted-rated schools are present; degrade slightly when only 1-2 are available.
    const confidence = ofsted.total_rated >= 3 ? CONF_HIGH : CONF_MEDIUM;
    const confidence_reason = ofsted.total_rated >= 3
      ? `${ofsted.total_rated} ${ofsted.inspectorate}-rated schools within radius (quality-weighted)`
      : `Only ${ofsted.total_rated} ${ofsted.inspectorate}-rated school${ofsted.total_rated !== 1 ? "s" : ""} in the catchment — small sample`;
    return { score, reasoning, confidence, confidence_reason };
  }

  // Fallback: count-only (no Ofsted data — Scotland, Wales, or table not seeded)
  const score = clamp(Math.sqrt(osmCount) * bench.schools.multiplier + bench.schools.base, 5, 95);
  const reasoning = `${osmCount} school${osmCount !== 1 ? "s" : ""} and educational facilities within 1.5km`;
  // Without Ofsted, we can score quantity but not quality — degrades to MEDIUM.
  const confidence = osmCount >= 3 ? CONF_MEDIUM : CONF_LOW;
  const confidence_reason = `Count-based score from OpenStreetMap — no Ofsted quality data available (Wales, Scotland, or unseeded). Estyn/Education Scotland integration on roadmap`;
  return { score, reasoning, confidence, confidence_reason };
}

function scoreAmenities(amenities: AmenitiesData | null, bench: Benchmarks, ofsted: OfstedData | null): ScoreResult {
  if (!amenities) {
    return { score: 50, reasoning: "Amenities data unavailable", confidence: CONF_NONE, confidence_reason: "No OpenStreetMap data returned for these coordinates" };
  }

  const b = bench.amenities;

  // Use quality-weighted school count if Ofsted data available
  let effectiveSchools = amenities.schools;
  if (ofsted && ofsted.total_rated > 0) {
    effectiveSchools = 0;
    for (const school of ofsted.schools) {
      effectiveSchools += OFSTED_QUALITY_WEIGHTS[school.rating_text] ?? 0.7;
    }
    // Add non-Ofsted educational facilities (nurseries, colleges, universities from OSM)
    effectiveSchools += Math.max(0, amenities.schools - ofsted.total_rated);
  }

  const schoolsNorm = Math.min(effectiveSchools / b.schools, 1);
  const foodNorm = Math.min((amenities.restaurants_cafes + amenities.pubs_bars) / b.food, 1);
  const healthNorm = Math.min(amenities.healthcare / b.health, 1);
  const shopNorm = Math.min(amenities.shops / b.shops, 1);
  const parkNorm = Math.min(amenities.parks_leisure / b.parks, 1);

  const composite = schoolsNorm * 0.2 + foodNorm * 0.25 + healthNorm * 0.2 + shopNorm * 0.15 + parkNorm * 0.2;
  const score = clamp(composite * 90 + 5, 5, 95);

  const reasoning = `${amenities.total} amenities nearby: ${amenities.schools} schools, ${amenities.restaurants_cafes + amenities.pubs_bars} food/drink, ${amenities.healthcare} healthcare, ${amenities.shops} shops, ${amenities.parks_leisure} parks/leisure`;
  // Confidence: amenity richness is itself the signal-quality indicator.
  let confidence: number;
  let confidence_reason: string;
  if (amenities.total >= 30) {
    confidence = CONF_HIGH;
    confidence_reason = `${amenities.total} amenities provide a rich, multi-category signal`;
  } else if (amenities.total >= 10) {
    confidence = CONF_MEDIUM;
    confidence_reason = `${amenities.total} amenities — moderate OSM coverage in this catchment`;
  } else {
    confidence = CONF_LOW;
    confidence_reason = `Only ${amenities.total} amenities found — sparse OSM coverage, possibly an underrepresented area`;
  }
  return { score, reasoning, confidence, confidence_reason };
}

function getDeprivationContext(lsoaCode: string): { total: number; unit: string; index: string } {
  if (lsoaCode.startsWith("W")) return { total: 1909, unit: "Welsh LSOAs", index: "WIMD 2019" };
  if (lsoaCode.startsWith("S")) return { total: 6976, unit: "Scottish Data Zones", index: "SIMD 2020" };
  return { total: 33755, unit: "LSOAs", index: "IMD 2025" };
}

function scoreDemographics(deprivation: DeprivationData | null): ScoreResult {
  if (!deprivation) {
    return { score: 50, reasoning: "Deprivation data unavailable (non-England or data gap)", confidence: CONF_NONE, confidence_reason: "No deprivation data resolved for the LSOA" };
  }

  const score = clamp(deprivation.imd_decile * 9 + 5, 10, 95);
  const { total, unit, index } = getDeprivationContext(deprivation.lsoa_code);
  const percentile = ((deprivation.imd_rank / total) * 100).toFixed(0);
  const level = deprivation.imd_decile <= 3 ? "high deprivation"
    : deprivation.imd_decile <= 7 ? "moderate deprivation"
    : "low deprivation";

  const reasoning = `${index} decile ${deprivation.imd_decile}/10 (${level}). Ranked ${deprivation.imd_rank.toLocaleString()} of ${total.toLocaleString()} ${unit} (${percentile}th percentile). LSOA: ${deprivation.lsoa_name}`;
  // Confidence: IMD 2025 (England) is current, WIMD 2019 (Wales) and SIMD 2020 (Scotland) are older.
  const code = deprivation.lsoa_code;
  const confidence = code.startsWith("W") || code.startsWith("S") ? CONF_MEDIUM : CONF_HIGH;
  const confidence_reason = code.startsWith("W")
    ? "Based on WIMD 2019 — most recent Welsh release; updated cadence ~5 years"
    : code.startsWith("S")
      ? "Based on SIMD 2020 — most recent Scottish release; updated cadence ~5 years"
      : "Based on IMD 2025 — current English release";
  return { score, reasoning, confidence, confidence_reason };
}

function scoreEnvironment(flood: FloodRiskData | null, amenities: AmenitiesData | null): ScoreResult {
  const parks = amenities?.parks_leisure ?? 0;

  if (!flood) {
    const parkScore = Math.min(parks * 10, 40) + 40;
    return {
      score: clamp(parkScore, 30, 80),
      reasoning: `Flood data unavailable. ${parks} parks/green spaces nearby`,
      confidence: amenities ? CONF_LOW : CONF_NONE,
      confidence_reason: amenities
        ? "No Environment Agency flood data — score based on amenity-only park count"
        : "Neither flood nor amenity data available",
    };
  }

  const floodPenalty = flood.flood_areas_nearby * 6;
  const warningPenalty = flood.active_warnings.length * 15;
  const parkBonus = Math.min(parks * 2.5, 10);
  const score = clamp(95 - floodPenalty - warningPenalty + parkBonus, 5, 95);

  const parts: string[] = [];
  parts.push(flood.flood_areas_nearby === 0
    ? "No flood risk zones within 3km"
    : `${flood.flood_areas_nearby} flood risk zone${flood.flood_areas_nearby !== 1 ? "s" : ""} within 3km`);
  if (flood.rivers_at_risk.length > 0) {
    parts.push(`near: ${flood.rivers_at_risk.slice(0, 3).join(", ")}`);
  }
  parts.push(flood.active_warnings.length > 0
    ? `${flood.active_warnings.length} active flood warning${flood.active_warnings.length !== 1 ? "s" : ""}`
    : "no active warnings");
  parts.push(`${parks} parks/green spaces nearby`);

  // Confidence: HIGH when both flood + amenities present; MEDIUM when flood only.
  const confidence = amenities ? CONF_HIGH : CONF_MEDIUM;
  const confidence_reason = amenities
    ? "Environment Agency flood + OpenStreetMap green-space data both available"
    : "Environment Agency flood data only — no green-space context";
  return { score, reasoning: parts.join(". "), confidence, confidence_reason };
}

function scoreCostOfLiving(deprivation: DeprivationData | null, propertyPrices: PropertyPriceData | null): ScoreResult {
  // Use real property prices when available
  if (propertyPrices && propertyPrices.median_price > 0) {
    // National median ~£285k (ONS 2025). Score = how affordable relative to national median.
    const nationalMedian = 285000;
    const ratio = propertyPrices.median_price / nationalMedian;
    // ratio 0.5 = very affordable (score ~85), ratio 1.0 = average (score ~55), ratio 2.0 = expensive (score ~20)
    const score = clamp(Math.round(95 - ratio * 40), 10, 90);
    const level = score >= 65 ? "below national average, more affordable"
      : score >= 40 ? "around national average"
      : "above national average, higher living costs";

    const reasoning = `Median sold price £${propertyPrices.median_price.toLocaleString()} (${propertyPrices.postcode_area} district, ${propertyPrices.transaction_count} transactions). ${level}`;
    // AR-137: variance-aware confidence. A wide YoY swing on a small sample
    // caps confidence at MEDIUM even when transaction_count >= 20.
    const pc = propertyConfidence(propertyPrices.transaction_count, propertyPrices.price_change_pct);
    return {
      score,
      reasoning,
      confidence: pc.value,
      confidence_reason: `${pc.reason}, ${propertyPrices.postcode_area} outcode`,
    };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Cost data unavailable", confidence: CONF_NONE, confidence_reason: "Neither HM Land Registry nor deprivation data available" };
  }

  const score = clamp((11 - deprivation.imd_decile) * 8 + 10, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "affluent area, higher living costs expected"
    : deprivation.imd_decile >= 5 ? "moderate cost of living"
    : "more affordable area, lower housing and living costs";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${deprivation.imd_decile}/10 as cost proxy: ${level}`;
  return {
    score,
    reasoning,
    confidence: CONF_LOW,
    confidence_reason: "No HM Land Registry data available — deprivation index used as cost proxy. Treat as indicative, not a price signal",
  };
}

/* ── Business-Specific Scoring ── */

function scoreSpendingPower(deprivation: DeprivationData | null): ScoreResult {
  if (!deprivation) {
    return { score: 50, reasoning: "Spending power data unavailable", confidence: CONF_NONE, confidence_reason: "No deprivation data resolved for the LSOA" };
  }

  const score = clamp(deprivation.imd_decile * 9 + 8, 15, 95);
  const level = deprivation.imd_decile >= 8 ? "high spending power"
    : deprivation.imd_decile >= 5 ? "moderate spending power"
    : "lower spending power";

  const { total, index } = getDeprivationContext(deprivation.lsoa_code);
  const country = deprivation.lsoa_code.startsWith("W") ? "Wales" : deprivation.lsoa_code.startsWith("S") ? "Scotland" : "England";
  const reasoning = `${index} decile ${deprivation.imd_decile}/10 indicates ${level}. Less deprived than ${((deprivation.imd_rank / total) * 100).toFixed(0)}% of ${country}`;
  // IMD income decile is a strong proxy for spending power but it is a proxy, not direct income data.
  const code = deprivation.lsoa_code;
  const confidence = code.startsWith("W") || code.startsWith("S") ? CONF_MEDIUM : CONF_HIGH;
  const confidence_reason = code.startsWith("W")
    ? "WIMD 2019 used as spending-power proxy — older release, directional"
    : code.startsWith("S")
      ? "SIMD 2020 used as spending-power proxy — older release, directional"
      : "IMD 2025 income decile used as direct spending-power proxy";
  return { score, reasoning, confidence, confidence_reason };
}

function scoreCommercialCosts(deprivation: DeprivationData | null, propertyPrices: PropertyPriceData | null): ScoreResult {
  // Use real property prices as commercial cost proxy
  if (propertyPrices && propertyPrices.median_price > 0) {
    const nationalMedian = 285000;
    const ratio = propertyPrices.median_price / nationalMedian;
    // Higher property values = higher commercial rents = lower score
    const score = clamp(Math.round(85 - ratio * 35), 10, 90);
    const level = score >= 60 ? "lower-cost area, better margins potential"
      : score >= 35 ? "moderate commercial costs"
      : "premium area, higher operating costs expected";

    const reasoning = `Property values £${propertyPrices.median_price.toLocaleString()} median (${propertyPrices.postcode_area}). ${level}`;
    // AR-137: proxy signal even with good data (residential ≠ commercial rent),
    // so cap at MEDIUM regardless. Variance-aware rubric still degrades sparse
    // samples to LOW.
    const pc = propertyConfidence(propertyPrices.transaction_count, propertyPrices.price_change_pct);
    const confidence = Math.min(pc.value, CONF_MEDIUM);
    const confidence_reason = `Inferred from residential property values. Not actual commercial rent data — proxy signal. ${pc.reason}`;
    return { score, reasoning, confidence, confidence_reason };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Commercial cost data unavailable", confidence: CONF_NONE, confidence_reason: "Neither HM Land Registry nor deprivation data available" };
  }

  const score = clamp((11 - deprivation.imd_decile) * 9 + 5, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "premium area, higher commercial rents expected"
    : deprivation.imd_decile >= 5 ? "moderate commercial costs"
    : "lower-cost commercial area, potentially better value";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${deprivation.imd_decile}/10: ${level}. Commercial rents correlate with area affluence`;
  return {
    score,
    reasoning,
    confidence: CONF_LOW,
    confidence_reason: "No property data available — deprivation index used as second-order proxy. Treat as directional",
  };
}

/* ── Investing-Specific Scoring ── */

function scorePriceGrowth(deprivation: DeprivationData | null, amenities: AmenitiesData | null, propertyPrices: PropertyPriceData | null): ScoreResult {
  // Use real YoY price change when available
  if (propertyPrices && propertyPrices.price_change_pct !== null) {
    const change = propertyPrices.price_change_pct;
    // Map real YoY change to score: -10% -> 20, 0% -> 50, +5% -> 70, +10% -> 85
    const baseScore = 50 + change * 4;
    const transportBoost = amenities ? Math.min(amenities.transport_stations * 3, 10) : 0;
    const score = clamp(Math.round(baseScore + transportBoost), 10, 90);

    const direction = change >= 0 ? "up" : "down";
    const outlook = change >= 5 ? "strong growth trajectory"
      : change >= 0 ? "stable with modest growth"
      : "declining, potential buying opportunity or risk";

    const reasoning = `Prices ${direction} ${Math.abs(change)}% YoY (£${propertyPrices.prior_median?.toLocaleString()} to £${propertyPrices.median_price.toLocaleString()}). ${outlook}. ${amenities ? `${amenities.transport_stations} transport links` : ""}`;
    // AR-137: variance-aware confidence. Price Growth is most sensitive to
    // volatility — a 21% YoY swing on 83 txns is not "HIGH" confidence even
    // though sample exceeds 20.
    const pc = propertyConfidence(propertyPrices.transaction_count, change);
    const confidence = pc.value;
    const confidence_reason = `Real YoY price change from HM Land Registry. ${pc.reason}`;
    return { score, reasoning, confidence, confidence_reason };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for price growth assessment", confidence: CONF_NONE, confidence_reason: "No property data and no deprivation data available" };
  }

  const decile = deprivation.imd_decile;
  let growthScore: number;
  if (decile >= 4 && decile <= 7) {
    growthScore = 70 + (7 - Math.abs(decile - 5.5)) * 5;
  } else if (decile >= 8) {
    growthScore = 50 - (decile - 8) * 10;
  } else {
    growthScore = 40 + decile * 5;
  }

  const transportBoost = amenities ? Math.min(amenities.transport_stations * 5, 15) : 0;
  const score = clamp(growthScore + transportBoost, 10, 90);

  const outlook = decile >= 4 && decile <= 7 ? "mid-range area with strong growth potential"
    : decile >= 8 ? "premium area, limited upside ceiling"
    : "emerging area, higher risk but significant growth potential";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${decile}/10: ${outlook}. ${amenities ? `${amenities.transport_stations} transport links support appreciation` : "Transport data unavailable"}`;
  return {
    score,
    reasoning,
    confidence: CONF_LOW,
    confidence_reason: "No HM Land Registry YoY data — deprivation decile used as growth proxy. Treat as directional only",
  };
}

function scoreRentalYield(deprivation: DeprivationData | null, amenities: AmenitiesData | null, propertyPrices: PropertyPriceData | null): ScoreResult {
  // Use real prices when available: lower median price = higher potential yield
  if (propertyPrices && propertyPrices.median_price > 0) {
    const nationalMedian = 285000;
    const ratio = propertyPrices.median_price / nationalMedian;
    // Cheaper areas relative to national median = higher yield potential
    // ratio 0.5 -> score ~80, ratio 1.0 -> score ~55, ratio 2.0 -> score ~25
    const baseScore = 90 - ratio * 35;
    const demandFactor = amenities ? Math.min((amenities.transport_stations * 3 + amenities.total * 0.3), 15) : 0;
    const score = clamp(Math.round(baseScore + demandFactor), 10, 90);

    const level = score >= 65 ? "lower purchase prices support stronger gross yields"
      : score >= 40 ? "moderate prices, balanced yield potential"
      : "higher purchase prices compress gross yields";

    const reasoning = `Median price £${propertyPrices.median_price.toLocaleString()} (${(ratio * 100).toFixed(0)}% of national median). ${level}. ${amenities ? `${amenities.total} amenities support demand` : ""}`;
    // AR-137: yield is inferred from price + amenity demand (no actual rent
    // observations), so cap at MEDIUM. Variance check still degrades small
    // samples to LOW.
    const pc = propertyConfidence(propertyPrices.transaction_count, propertyPrices.price_change_pct);
    const confidence = Math.min(pc.value, CONF_MEDIUM);
    const confidence_reason = `Yield inferred from purchase price and amenity demand — not actual rent observations, directional only. ${pc.reason}`;
    return { score, reasoning, confidence, confidence_reason };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for yield assessment", confidence: CONF_NONE, confidence_reason: "No property and no deprivation data available" };
  }

  const decile = deprivation.imd_decile;
  const baseYield = (11 - decile) * 7 + 15;
  const demandFactor = amenities ? Math.min((amenities.transport_stations * 3 + amenities.total * 0.3), 15) : 0;
  const score = clamp(baseYield + demandFactor, 10, 90);

  const level = decile <= 4 ? "lower property values support higher gross yields"
    : decile <= 7 ? "moderate property values, balanced yield potential"
    : "higher property values, yields typically compressed";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${decile}/10: ${level}. ${amenities ? `${amenities.total} nearby amenities support tenant demand` : ""}`;
  return {
    score,
    reasoning,
    confidence: CONF_LOW,
    confidence_reason: "No HM Land Registry data — deprivation decile used as yield proxy. Treat as indicative only",
  };
}

function scoreInvestmentProperty(
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  propertyPrices: PropertyPriceData | null,
): ScoreResult {
  const growth = scorePriceGrowth(deprivation, amenities, propertyPrices);
  const rental = scoreRentalYield(deprivation, amenities, propertyPrices);

  const score = clamp(Math.round((growth.score + rental.score) / 2), 10, 90);
  const confidence = Math.round(((growth.confidence + rental.confidence) / 2) * 100) / 100;

  const reasoning = `Investment property composite: ${growth.reasoning} Rental yield: ${rental.reasoning}`;
  const confidence_reason = `Averaged confidence across price growth and rental yield: ${growth.confidence_reason} ${rental.confidence_reason}`;

  return { score, reasoning, confidence, confidence_reason };
}

/* ── Intent Compositions ──
   Every preset exposes the SAME seven signal categories (crime,
   deprivation, property, schools, amenities, transport, environment).
   Labels are the category names so dimensionKey() yields the category
   slugs. Intent is expressed only through the weights and the property
   scorer, which stays intent-aware. */

type DimensionSpec = { label: string; weight: number; compute: () => ScoreResult };

interface IntentInputs {
  crime: CrimeSummary | null;
  deprivation: DeprivationData | null;
  amenities: AmenitiesData | null;
  flood: FloodRiskData | null;
  bench: Benchmarks;
  propertyPrices: PropertyPriceData | null;
  ofsted: OfstedData | null;
}

function intentSpecs(intent: Intent, i: IntentInputs): DimensionSpec[] {
  switch (intent) {
    case "moving":
      return [
        { label: "Crime", weight: 20, compute: () => scoreSafety(i.crime) },
        { label: "Deprivation", weight: 10, compute: () => scoreDemographics(i.deprivation) },
        { label: "Property", weight: 20, compute: () => scoreCostOfLiving(i.deprivation, i.propertyPrices) },
        { label: "Schools", weight: 20, compute: () => scoreSchools(i.amenities, i.bench, i.ofsted) },
        { label: "Amenities", weight: 10, compute: () => scoreAmenities(i.amenities, i.bench, i.ofsted) },
        { label: "Transport", weight: 15, compute: () => scoreTransport(i.amenities, i.bench) },
        { label: "Environment", weight: 5, compute: () => scoreEnvironment(i.flood, i.amenities) },
      ];
    case "business":
      return [
        { label: "Crime", weight: 5, compute: () => scoreSafety(i.crime) },
        { label: "Deprivation", weight: 15, compute: () => scoreSpendingPower(i.deprivation) },
        { label: "Property", weight: 15, compute: () => scoreCommercialCosts(i.deprivation, i.propertyPrices) },
        { label: "Schools", weight: 5, compute: () => scoreSchools(i.amenities, i.bench, i.ofsted) },
        { label: "Amenities", weight: 25, compute: () => scoreAmenities(i.amenities, i.bench, i.ofsted) },
        { label: "Transport", weight: 20, compute: () => scoreTransport(i.amenities, i.bench) },
        { label: "Environment", weight: 15, compute: () => scoreEnvironment(i.flood, i.amenities) },
      ];
    case "investing":
      return [
        { label: "Crime", weight: 10, compute: () => scoreSafety(i.crime) },
        { label: "Deprivation", weight: 10, compute: () => scoreDemographics(i.deprivation) },
        { label: "Property", weight: 30, compute: () => scoreInvestmentProperty(i.deprivation, i.amenities, i.propertyPrices) },
        { label: "Schools", weight: 5, compute: () => scoreSchools(i.amenities, i.bench, i.ofsted) },
        { label: "Amenities", weight: 15, compute: () => scoreAmenities(i.amenities, i.bench, i.ofsted) },
        { label: "Transport", weight: 15, compute: () => scoreTransport(i.amenities, i.bench) },
        { label: "Environment", weight: 15, compute: () => scoreEnvironment(i.flood, i.amenities) },
      ];
    case "research":
      return [
        { label: "Crime", weight: 15, compute: () => scoreSafety(i.crime) },
        { label: "Deprivation", weight: 15, compute: () => scoreDemographics(i.deprivation) },
        { label: "Property", weight: 14, compute: () => scoreCostOfLiving(i.deprivation, i.propertyPrices) },
        { label: "Schools", weight: 14, compute: () => scoreSchools(i.amenities, i.bench, i.ofsted) },
        { label: "Amenities", weight: 14, compute: () => scoreAmenities(i.amenities, i.bench, i.ofsted) },
        { label: "Transport", weight: 14, compute: () => scoreTransport(i.amenities, i.bench) },
        { label: "Environment", weight: 14, compute: () => scoreEnvironment(i.flood, i.amenities) },
      ];
  }
}

/* Aggregate dimension confidences using the same weight scheme as the
   overall score. Returns a value between 0 (no signal) and 1 (rich data). */
function aggregateConfidence(dimensions: ComputedDimension[]): number {
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = dimensions.reduce((s, d) => s + d.confidence * d.weight, 0);
  // Round to 2 decimal places for stable JSON output.
  return Math.round((weighted / totalWeight) * 100) / 100;
}

/* ── Main Export ── */

export function computeScores(
  intent: Intent,
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  areaType: AreaType = "suburban",
  propertyPrices: PropertyPriceData | null = null,
  ofsted: OfstedData | null = null,
): ComputedScores {
  const bench = BENCHMARKS[areaType];
  const inputs: IntentInputs = { crime, deprivation, amenities, flood, bench, propertyPrices, ofsted };

  const dimensions: ComputedDimension[] = intentSpecs(intent, inputs).map(({ label, weight, compute }) => ({
    ...compute(),
    label,
    weight,
  }));

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  const confidence = aggregateConfidence(dimensions);
  return { overall, dimensions, area_type: areaType, confidence };
}
