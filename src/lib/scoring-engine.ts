import { Intent } from "@/lib/types";
import { CrimeSummary } from "@/lib/data-sources/police";
import { DeprivationData } from "@/lib/data-sources/deprivation";
import { AmenitiesData } from "@/lib/data-sources/openstreetmap";
import { FloodRiskData } from "@/lib/data-sources/flood";
import { PropertyPriceData } from "@/lib/data-sources/land-registry";
import { OfstedData } from "@/lib/data-sources/ofsted";
import type { AreaType } from "@/lib/data-sources/postcodes";

/* ── Types ── */

export interface ComputedDimension {
  label: string;
  score: number;
  weight: number;
  reasoning: string;
}

export interface ComputedScores {
  overall: number;
  dimensions: ComputedDimension[];
  area_type: AreaType;
}

/* ── Area-Type Benchmarks ── */
// These define "good" values for each area type.
// Rural areas need fewer amenities/transport to score well.

interface Benchmarks {
  transport: { stationMultiplier: number; busMultiplier: number; maxBusScore: number };
  schools: { multiplier: number; base: number };
  amenities: { schools: number; food: number; health: number; shops: number; parks: number };
  footTraffic: { stationWeight: number; busWeight: number; activityWeight: number };
  tenantDemand: { stationWeight: number; amenityWeight: number };
}

const BENCHMARKS: Record<AreaType, Benchmarks> = {
  urban: {
    transport: { stationMultiplier: 16, busMultiplier: 3.3, maxBusScore: 40 },
    schools: { multiplier: 28, base: 8 },
    amenities: { schools: 8, food: 20, health: 6, shops: 5, parks: 4 },
    footTraffic: { stationWeight: 15, busWeight: 2, activityWeight: 1.5 },
    tenantDemand: { stationWeight: 15, amenityWeight: 0.8 },
  },
  suburban: {
    transport: { stationMultiplier: 20, busMultiplier: 4, maxBusScore: 45 },
    schools: { multiplier: 32, base: 10 },
    amenities: { schools: 6, food: 14, health: 4, shops: 4, parks: 3 },
    footTraffic: { stationWeight: 18, busWeight: 2.5, activityWeight: 1.8 },
    tenantDemand: { stationWeight: 18, amenityWeight: 1.0 },
  },
  rural: {
    transport: { stationMultiplier: 30, busMultiplier: 6, maxBusScore: 55 },
    schools: { multiplier: 45, base: 15 },
    amenities: { schools: 3, food: 6, health: 2, shops: 2, parks: 2 },
    footTraffic: { stationWeight: 25, busWeight: 4, activityWeight: 3 },
    tenantDemand: { stationWeight: 25, amenityWeight: 1.5 },
  },
};

/* ── Helpers ── */

function clamp(val: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, val)));
}

/* ── Core Scoring Functions ── */

function scoreSafety(crime: CrimeSummary | null): { score: number; reasoning: string } {
  if (!crime || crime.total_crimes === 0) {
    return { score: 50, reasoning: "Crime data unavailable for this location" };
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

  return { score, reasoning: parts.join(". ") };
}

function scoreTransport(amenities: AmenitiesData | null, bench: Benchmarks): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Transport data unavailable" };
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

  return { score, reasoning: parts.join(". ") };
}

// Quality weights: Good = 1.0 (neutral, same as count-only). Outstanding gives bonus, poor schools penalise.
const OFSTED_QUALITY_WEIGHTS: Record<string, number> = {
  "Outstanding": 1.2,
  "Good": 1.0,
  "Requires Improvement": 0.5,
  "Inadequate": 0.2,
  "Not rated": 0.7,
};

function scoreSchools(amenities: AmenitiesData | null, bench: Benchmarks, ofsted: OfstedData | null): { score: number; reasoning: string } {
  if (!amenities && !ofsted) {
    return { score: 50, reasoning: "Education data unavailable" };
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
    return { score, reasoning };
  }

  // Fallback: count-only (no Ofsted data — Scotland, Wales, or table not seeded)
  const score = clamp(Math.sqrt(osmCount) * bench.schools.multiplier + bench.schools.base, 5, 95);
  const reasoning = `${osmCount} school${osmCount !== 1 ? "s" : ""} and educational facilities within 1.5km`;
  return { score, reasoning };
}

function scoreAmenities(amenities: AmenitiesData | null, bench: Benchmarks, ofsted: OfstedData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Amenities data unavailable" };
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
  return { score, reasoning };
}

function getDeprivationContext(lsoaCode: string): { total: number; unit: string; index: string } {
  if (lsoaCode.startsWith("W")) return { total: 1909, unit: "Welsh LSOAs", index: "WIMD 2019" };
  if (lsoaCode.startsWith("S")) return { total: 6976, unit: "Scottish Data Zones", index: "SIMD 2020" };
  return { total: 33755, unit: "LSOAs", index: "IMD 2025" };
}

function scoreDemographics(deprivation: DeprivationData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Deprivation data unavailable (non-England or data gap)" };
  }

  const score = clamp(deprivation.imd_decile * 9 + 5, 10, 95);
  const { total, unit, index } = getDeprivationContext(deprivation.lsoa_code);
  const percentile = ((deprivation.imd_rank / total) * 100).toFixed(0);
  const level = deprivation.imd_decile <= 3 ? "high deprivation"
    : deprivation.imd_decile <= 7 ? "moderate deprivation"
    : "low deprivation";

  const reasoning = `${index} decile ${deprivation.imd_decile}/10 (${level}). Ranked ${deprivation.imd_rank.toLocaleString()} of ${total.toLocaleString()} ${unit} (${percentile}th percentile). LSOA: ${deprivation.lsoa_name}`;
  return { score, reasoning };
}

function scoreEnvironment(flood: FloodRiskData | null, amenities: AmenitiesData | null): { score: number; reasoning: string } {
  const parks = amenities?.parks_leisure ?? 0;

  if (!flood) {
    const parkScore = Math.min(parks * 10, 40) + 40;
    return { score: clamp(parkScore, 30, 80), reasoning: `Flood data unavailable. ${parks} parks/green spaces nearby` };
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

  return { score, reasoning: parts.join(". ") };
}

function scoreCostOfLiving(deprivation: DeprivationData | null, propertyPrices: PropertyPriceData | null): { score: number; reasoning: string } {
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
    return { score, reasoning };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Cost data unavailable" };
  }

  const score = clamp((11 - deprivation.imd_decile) * 8 + 10, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "affluent area, higher living costs expected"
    : deprivation.imd_decile >= 5 ? "moderate cost of living"
    : "more affordable area, lower housing and living costs";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${deprivation.imd_decile}/10 as cost proxy: ${level}`;
  return { score, reasoning };
}

/* ── Business-Specific Scoring ── */

function scoreFootTraffic(amenities: AmenitiesData | null, bench: Benchmarks): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Foot traffic data unavailable" };
  }

  const ft = bench.footTraffic;
  const transportFactor = Math.min(amenities.transport_stations * ft.stationWeight + amenities.bus_stops * ft.busWeight, 50);
  const activityFactor = Math.min((amenities.restaurants_cafes + amenities.pubs_bars + amenities.shops) * ft.activityWeight, 50);
  const score = clamp(transportFactor + activityFactor, 5, 95);

  const totalActivity = amenities.restaurants_cafes + amenities.pubs_bars + amenities.shops;
  const reasoning = `${amenities.transport_stations} transit stations and ${amenities.bus_stops} bus stops drive footfall. ${totalActivity} retail/food venues indicate ${totalActivity > 20 ? "a busy" : totalActivity > 10 ? "an active" : "a quieter"} commercial area`;
  return { score, reasoning };
}

function scoreCompetition(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Competition data unavailable" };
  }

  const competitors = amenities.restaurants_cafes + amenities.pubs_bars + amenities.shops;
  // More competitors = lower score (harder to compete)
  const score = clamp(90 - competitors * 2, 10, 90);
  const level = competitors <= 10 ? "low competition, room for new entrants"
    : competitors <= 25 ? "moderate competition, established commercial area"
    : "high competition, differentiation essential";

  const reasoning = `${competitors} competing food/retail venues within 1km. ${level}`;
  return { score, reasoning };
}

function scoreSpendingPower(deprivation: DeprivationData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Spending power data unavailable" };
  }

  const score = clamp(deprivation.imd_decile * 9 + 8, 15, 95);
  const level = deprivation.imd_decile >= 8 ? "high spending power"
    : deprivation.imd_decile >= 5 ? "moderate spending power"
    : "lower spending power";

  const { total, index } = getDeprivationContext(deprivation.lsoa_code);
  const country = deprivation.lsoa_code.startsWith("W") ? "Wales" : deprivation.lsoa_code.startsWith("S") ? "Scotland" : "England";
  const reasoning = `${index} decile ${deprivation.imd_decile}/10 indicates ${level}. Less deprived than ${((deprivation.imd_rank / total) * 100).toFixed(0)}% of ${country}`;
  return { score, reasoning };
}

function scoreCommercialCosts(deprivation: DeprivationData | null, propertyPrices: PropertyPriceData | null): { score: number; reasoning: string } {
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
    return { score, reasoning };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Commercial cost data unavailable" };
  }

  const score = clamp((11 - deprivation.imd_decile) * 9 + 5, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "premium area, higher commercial rents expected"
    : deprivation.imd_decile >= 5 ? "moderate commercial costs"
    : "lower-cost commercial area, potentially better value";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${deprivation.imd_decile}/10: ${level}. Commercial rents correlate with area affluence`;
  return { score, reasoning };
}

/* ── Investing-Specific Scoring ── */

function scorePriceGrowth(deprivation: DeprivationData | null, amenities: AmenitiesData | null, propertyPrices: PropertyPriceData | null): { score: number; reasoning: string } {
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
    return { score, reasoning };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for price growth assessment" };
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
  return { score, reasoning };
}

function scoreRentalYield(deprivation: DeprivationData | null, amenities: AmenitiesData | null, propertyPrices: PropertyPriceData | null): { score: number; reasoning: string } {
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
    return { score, reasoning };
  }

  // Fallback to IMD proxy
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for yield assessment" };
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
  return { score, reasoning };
}

function scoreRegeneration(deprivation: DeprivationData | null, amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for regeneration assessment" };
  }

  const decile = deprivation.imd_decile;
  let regenScore: number;
  if (decile <= 4) {
    regenScore = 60 + (4 - decile) * 5;
  } else if (decile <= 7) {
    regenScore = 50;
  } else {
    regenScore = 30;
  }

  const transportBoost = amenities ? Math.min(amenities.transport_stations * 6, 20) : 0;
  const score = clamp(regenScore + transportBoost, 10, 90);

  const outlook = decile <= 4 ? "higher deprivation signals regeneration potential"
    : decile <= 7 ? "moderate area, incremental improvement likely"
    : "already developed, limited regeneration upside";

  const { index } = getDeprivationContext(deprivation.lsoa_code);
  const reasoning = `${index} decile ${decile}/10: ${outlook}. ${amenities ? `${amenities.transport_stations} transport links support development case` : ""}`;
  return { score, reasoning };
}

function scoreTenantDemand(amenities: AmenitiesData | null, bench: Benchmarks): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Insufficient data for demand assessment" };
  }

  const td = bench.tenantDemand;
  const transportScore = Math.min(amenities.transport_stations * td.stationWeight, 40);
  const amenityScore = Math.min(amenities.total * td.amenityWeight, 30);
  const busScore = Math.min(amenities.bus_stops * 2, 15);
  const foodScore = Math.min((amenities.restaurants_cafes + amenities.pubs_bars) * 1.5, 15);
  const score = clamp(transportScore + amenityScore + busScore + foodScore, 10, 95);

  const reasoning = `${amenities.transport_stations} stations and ${amenities.bus_stops} bus stops create commuter demand. ${amenities.total} local amenities support liveability`;
  return { score, reasoning };
}

function scoreRiskFactors(crime: CrimeSummary | null, flood: FloodRiskData | null): { score: number; reasoning: string } {
  const safety = scoreSafety(crime);
  const env = scoreEnvironment(flood, null);

  // Risk score = average of safety and environment (high = low risk)
  const score = clamp((safety.score + env.score) / 2, 10, 90);

  const parts: string[] = [];
  if (crime) {
    const monthlyRate = crime.total_crimes / Math.max(crime.months_covered, 1);
    parts.push(`${Math.round(monthlyRate)} crimes/month nearby`);
  }
  if (flood) {
    parts.push(`${flood.flood_areas_nearby} flood risk zone${flood.flood_areas_nearby !== 1 ? "s" : ""} within 3km`);
    if (flood.active_warnings.length > 0) {
      parts.push(`${flood.active_warnings.length} active flood warning${flood.active_warnings.length !== 1 ? "s" : ""}`);
    }
  }
  if (parts.length === 0) parts.push("Limited risk data available");

  return { score, reasoning: parts.join(". ") };
}

/* ── Intent Compositions ── */

function computeMovingScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  bench: Benchmarks,
  areaType: AreaType,
  propertyPrices: PropertyPriceData | null,
  ofsted: OfstedData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreSafety(crime), label: "Safety & Crime", weight: 25 },
    { ...scoreSchools(amenities, bench, ofsted), label: "Schools & Education", weight: 20 },
    { ...scoreTransport(amenities, bench), label: "Transport & Commute", weight: 20 },
    { ...scoreAmenities(amenities, bench, ofsted), label: "Daily Amenities", weight: 15 },
    { ...scoreCostOfLiving(deprivation, propertyPrices), label: "Cost of Living", weight: 20 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions, area_type: areaType };
}

function computeBusinessScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  bench: Benchmarks,
  areaType: AreaType,
  propertyPrices: PropertyPriceData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreFootTraffic(amenities, bench), label: "Foot Traffic & Demand", weight: 30 },
    { ...scoreCompetition(amenities), label: "Competition Density", weight: 20 },
    { ...scoreTransport(amenities, bench), label: "Transport & Access", weight: 15 },
    { ...scoreSpendingPower(deprivation), label: "Local Spending Power", weight: 20 },
    { ...scoreCommercialCosts(deprivation, propertyPrices), label: "Commercial Costs", weight: 15 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions, area_type: areaType };
}

function computeInvestingScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  bench: Benchmarks,
  areaType: AreaType,
  propertyPrices: PropertyPriceData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scorePriceGrowth(deprivation, amenities, propertyPrices), label: "Price Growth", weight: 25 },
    { ...scoreRentalYield(deprivation, amenities, propertyPrices), label: "Rental Yield", weight: 25 },
    { ...scoreRegeneration(deprivation, amenities), label: "Regeneration & Infrastructure", weight: 20 },
    { ...scoreTenantDemand(amenities, bench), label: "Tenant Demand", weight: 15 },
    { ...scoreRiskFactors(crime, flood), label: "Risk Factors", weight: 15 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions, area_type: areaType };
}

function computeResearchScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  bench: Benchmarks,
  areaType: AreaType,
  ofsted: OfstedData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreSafety(crime), label: "Safety & Crime", weight: 20 },
    { ...scoreTransport(amenities, bench), label: "Transport Links", weight: 20 },
    { ...scoreAmenities(amenities, bench, ofsted), label: "Amenities & Services", weight: 20 },
    { ...scoreDemographics(deprivation), label: "Demographics & Economy", weight: 20 },
    { ...scoreEnvironment(flood, amenities), label: "Environment & Quality", weight: 20 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions, area_type: areaType };
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

  switch (intent) {
    case "moving":
      return computeMovingScores(crime, deprivation, amenities, flood, bench, areaType, propertyPrices, ofsted);
    case "business":
      return computeBusinessScores(crime, deprivation, amenities, bench, areaType, propertyPrices);
    case "investing":
      return computeInvestingScores(crime, deprivation, amenities, flood, bench, areaType, propertyPrices);
    case "research":
      return computeResearchScores(crime, deprivation, amenities, flood, bench, areaType, ofsted);
  }
}
