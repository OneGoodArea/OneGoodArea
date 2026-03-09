import { Intent } from "@/lib/types";
import { CrimeSummary } from "@/lib/data-sources/police";
import { DeprivationData } from "@/lib/data-sources/deprivation";
import { AmenitiesData } from "@/lib/data-sources/openstreetmap";
import { FloodRiskData } from "@/lib/data-sources/flood";

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
}

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
  const violentPatterns = ["violence", "robbery"];
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

function scoreTransport(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Transport data unavailable" };
  }

  const stations = amenities.transport_stations;
  const busStops = amenities.bus_stops;

  // Stations: diminishing returns — 1→16, 2→30, 3→42, 4→52, 5→60
  const stationScore = Math.min(stations, 5) * 16 - Math.max(0, stations - 1) * 4;
  const adjustedStation = Math.max(0, stationScore);

  // Bus stops: 0→0, 5→17, 10→33, 15→40
  const busScore = Math.min(busStops * 3.3, 40);

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

function scoreSchools(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Education data unavailable" };
  }

  const schools = amenities.schools;
  // Diminishing returns: 0→8, 1→38, 2→50, 3→60, 4→68, 6→78, 8→88
  const score = clamp(Math.sqrt(schools) * 28 + 8, 5, 95);

  const reasoning = `${schools} school${schools !== 1 ? "s" : ""} and educational facilities within 1.5km`;
  return { score, reasoning };
}

function scoreAmenities(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Amenities data unavailable" };
  }

  const schoolsNorm = Math.min(amenities.schools / 8, 1);
  const foodNorm = Math.min((amenities.restaurants_cafes + amenities.pubs_bars) / 20, 1);
  const healthNorm = Math.min(amenities.healthcare / 6, 1);
  const shopNorm = Math.min(amenities.shops / 5, 1);
  const parkNorm = Math.min(amenities.parks_leisure / 4, 1);

  const composite = schoolsNorm * 0.2 + foodNorm * 0.25 + healthNorm * 0.2 + shopNorm * 0.15 + parkNorm * 0.2;
  const score = clamp(composite * 90 + 5, 5, 95);

  const reasoning = `${amenities.total} amenities nearby: ${amenities.schools} schools, ${amenities.restaurants_cafes + amenities.pubs_bars} food/drink, ${amenities.healthcare} healthcare, ${amenities.shops} shops, ${amenities.parks_leisure} parks/leisure`;
  return { score, reasoning };
}

function scoreDemographics(deprivation: DeprivationData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Deprivation data unavailable (non-England or data gap)" };
  }

  const score = clamp(deprivation.imd_decile * 9 + 5, 10, 95);
  const percentile = ((deprivation.imd_rank / 32844) * 100).toFixed(0);
  const level = deprivation.imd_decile <= 3 ? "high deprivation"
    : deprivation.imd_decile <= 7 ? "moderate deprivation"
    : "low deprivation";

  const reasoning = `IMD decile ${deprivation.imd_decile}/10 (${level}). Ranked ${deprivation.imd_rank.toLocaleString()} of 32,844 LSOAs (${percentile}th percentile). LSOA: ${deprivation.lsoa_name}`;
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

function scoreCostOfLiving(deprivation: DeprivationData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Cost data unavailable" };
  }

  // Less deprived = more expensive = lower affordability score
  const score = clamp((11 - deprivation.imd_decile) * 8 + 10, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "affluent area, higher living costs expected"
    : deprivation.imd_decile >= 5 ? "moderate cost of living"
    : "more affordable area, lower housing and living costs";

  const reasoning = `IMD decile ${deprivation.imd_decile}/10 as cost proxy: ${level}`;
  return { score, reasoning };
}

/* ── Business-Specific Scoring ── */

function scoreFootTraffic(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Foot traffic data unavailable" };
  }

  const transportFactor = Math.min(amenities.transport_stations * 15 + amenities.bus_stops * 2, 50);
  const activityFactor = Math.min((amenities.restaurants_cafes + amenities.pubs_bars + amenities.shops) * 1.5, 50);
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

  const reasoning = `IMD decile ${deprivation.imd_decile}/10 indicates ${level}. Less deprived than ${((deprivation.imd_rank / 32844) * 100).toFixed(0)}% of England`;
  return { score, reasoning };
}

function scoreCommercialCosts(deprivation: DeprivationData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Commercial cost data unavailable" };
  }

  // Less deprived = higher rents = lower affordability
  const score = clamp((11 - deprivation.imd_decile) * 9 + 5, 10, 90);
  const level = deprivation.imd_decile >= 8 ? "premium area, higher commercial rents expected"
    : deprivation.imd_decile >= 5 ? "moderate commercial costs"
    : "lower-cost commercial area, potentially better value";

  const reasoning = `IMD decile ${deprivation.imd_decile}/10: ${level}. Commercial rents correlate with area affluence`;
  return { score, reasoning };
}

/* ── Investing-Specific Scoring ── */

function scorePriceGrowth(deprivation: DeprivationData | null, amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for price growth assessment" };
  }

  const decile = deprivation.imd_decile;
  // Mid-range areas (decile 4-7) have strongest growth potential
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

  const reasoning = `IMD decile ${decile}/10: ${outlook}. ${amenities ? `${amenities.transport_stations} transport links support appreciation` : "Transport data unavailable"}`;
  return { score, reasoning };
}

function scoreRentalYield(deprivation: DeprivationData | null, amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!deprivation) {
    return { score: 50, reasoning: "Insufficient data for yield assessment" };
  }

  const decile = deprivation.imd_decile;
  // Lower-cost areas with good demand tend to have higher yields
  const baseYield = (11 - decile) * 7 + 15;
  const demandFactor = amenities ? Math.min((amenities.transport_stations * 3 + amenities.total * 0.3), 15) : 0;
  const score = clamp(baseYield + demandFactor, 10, 90);

  const level = decile <= 4 ? "lower property values support higher gross yields"
    : decile <= 7 ? "moderate property values, balanced yield potential"
    : "higher property values, yields typically compressed";

  const reasoning = `IMD decile ${decile}/10: ${level}. ${amenities ? `${amenities.total} nearby amenities support tenant demand` : ""}`;
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

  const reasoning = `IMD decile ${decile}/10: ${outlook}. ${amenities ? `${amenities.transport_stations} transport links support development case` : ""}`;
  return { score, reasoning };
}

function scoreTenantDemand(amenities: AmenitiesData | null): { score: number; reasoning: string } {
  if (!amenities) {
    return { score: 50, reasoning: "Insufficient data for demand assessment" };
  }

  const transportScore = Math.min(amenities.transport_stations * 15, 40);
  const amenityScore = Math.min(amenities.total * 0.8, 30);
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
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreSafety(crime), label: "Safety & Crime", weight: 25 },
    { ...scoreSchools(amenities), label: "Schools & Education", weight: 20 },
    { ...scoreTransport(amenities), label: "Transport & Commute", weight: 20 },
    { ...scoreAmenities(amenities), label: "Daily Amenities", weight: 15 },
    { ...scoreCostOfLiving(deprivation), label: "Cost of Living", weight: 20 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions };
}

function computeBusinessScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreFootTraffic(amenities), label: "Foot Traffic & Demand", weight: 30 },
    { ...scoreCompetition(amenities), label: "Competition Density", weight: 20 },
    { ...scoreTransport(amenities), label: "Transport & Access", weight: 15 },
    { ...scoreSpendingPower(deprivation), label: "Local Spending Power", weight: 20 },
    { ...scoreCommercialCosts(deprivation), label: "Commercial Costs", weight: 15 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions };
}

function computeInvestingScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scorePriceGrowth(deprivation, amenities), label: "Price Growth", weight: 25 },
    { ...scoreRentalYield(deprivation, amenities), label: "Rental Yield", weight: 25 },
    { ...scoreRegeneration(deprivation, amenities), label: "Regeneration & Infrastructure", weight: 20 },
    { ...scoreTenantDemand(amenities), label: "Tenant Demand", weight: 15 },
    { ...scoreRiskFactors(crime, flood), label: "Risk Factors", weight: 15 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions };
}

function computeResearchScores(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
): ComputedScores {
  const dimensions: ComputedDimension[] = [
    { ...scoreSafety(crime), label: "Safety & Crime", weight: 20 },
    { ...scoreTransport(amenities), label: "Transport Links", weight: 20 },
    { ...scoreAmenities(amenities), label: "Amenities & Services", weight: 20 },
    { ...scoreDemographics(deprivation), label: "Demographics & Economy", weight: 20 },
    { ...scoreEnvironment(flood, amenities), label: "Environment & Quality", weight: 20 },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  return { overall, dimensions };
}

/* ── Main Export ── */

export function computeScores(
  intent: Intent,
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
): ComputedScores {
  switch (intent) {
    case "moving":
      return computeMovingScores(crime, deprivation, amenities, flood);
    case "business":
      return computeBusinessScores(crime, deprivation, amenities);
    case "investing":
      return computeInvestingScores(crime, deprivation, amenities, flood);
    case "research":
      return computeResearchScores(crime, deprivation, amenities, flood);
  }
}
