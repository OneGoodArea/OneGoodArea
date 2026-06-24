import { sql } from "../../infrastructure/db/client";
import { geocodeArea, type GeocodedArea } from "../signals/data-sources/postcodes";
import { getCrimeData, formatCrimeDataForPrompt } from "../signals/data-sources/police";
import { getDeprivationData, formatDeprivationForPrompt } from "../signals/data-sources/deprivation";
import { getNearbyAmenities, formatAmenitiesForPrompt } from "../signals/data-sources/openstreetmap";
import { getFloodRisk, formatFloodRiskForPrompt } from "../signals/data-sources/flood";
import { getPropertyPrices, formatPropertyDataForPrompt } from "../signals/data-sources/land-registry";
import { getOfstedSchools, formatOfstedForPrompt } from "../signals/data-sources/ofsted";
import type {
  CrimeSummary,
  DeprivationData,
  AmenitiesData,
  FloodRiskData,
  PropertyPriceData,
  OfstedData,
} from "../signals/inputs";
import { computeScores, type ComputedScores } from "../engine/scoring-engine";
import { METHODOLOGY_VERSION } from "../engine/methodology";
import type { AreaReport, Intent, DataFreshness } from "@onegoodarea/contracts";
import { getCachedAreaResult, setCachedAreaResult } from "../cache/area-cache";
import { trackEvent } from "../tracking/activity";
import { generateId } from "../../infrastructure/utils/id";
import { logger } from "../tracking/structured-logger";
import { getAiProvider } from "../engine/ai";

/* Migrated from legacy src/lib/generate-report.ts. Changes: imports repointed
   to the apps/api modules; the legacy `await ensureReportCacheTable()` is
   dropped (the migrator owns report_cache); getAiProvider() is now synchronous
   (process.env config) so the double-await collapses to one. All scoring,
   prompt construction (the AR-149 B2B prompt verbatim) and report assembly are
   otherwise unchanged. */

function generateReportId(): string {
  return generateId("rpt", 8);
}

function buildDataFreshness(
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  propertyPrices: PropertyPriceData | null,
  ofsted: OfstedData | null,
): DataFreshness[] {
  const freshness: DataFreshness[] = [];

  if (crime && crime.monthly_trend.length > 0) {
    const months = crime.monthly_trend.map(m => m.month).sort();
    const oldest = months[0];
    const newest = months[months.length - 1];
    const fmt = (m: string) => {
      const [y, mo] = m.split("-");
      const d = new Date(parseInt(y), parseInt(mo) - 1);
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    };
    freshness.push({
      source: "police.uk",
      period: oldest === newest ? fmt(newest) : `${fmt(oldest)} to ${fmt(newest)}`,
      status: "recent",
    });
  }

  if (deprivation) {
    const code = deprivation.lsoa_code;
    const label = code.startsWith("W")
      ? "WIMD 2019"
      : code.startsWith("S")
        ? "SIMD 2020"
        : "IMD 2025";
    freshness.push({ source: label, period: "Official release", status: "static" });
  }

  if (amenities) {
    freshness.push({ source: "OpenStreetMap", period: "Live query", status: "live" });
  }

  if (flood) {
    freshness.push({ source: "Environment Agency", period: "Live query", status: "live" });
  }

  if (propertyPrices) {
    freshness.push({ source: "HM Land Registry", period: propertyPrices.period, status: "recent" });
  }

  if (ofsted) {
    freshness.push({ source: "Ofsted", period: "Monthly release", status: "recent" });
  }

  return freshness;
}

function buildPrompt(
  area: string,
  intent: Intent,
  scores: ComputedScores,
  geo: GeocodedArea | null,
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null,
  propertyPrices: PropertyPriceData | null,
  ofsted: OfstedData | null,
): string {
  /* AR-149: B2B-repositioned intent context. Each entry frames the report for
     a specific regulated workflow, not a consumer decision. The underlying
     enum names (moving/business/investing/research) are retained for
     backwards compatibility; the narration is professional analyst voice. */
  const intentContext: Record<Intent, string> = {
    moving:
      "Workflow: residential mortgage origination. Audience: a credit, risk, or origination analyst at a lender or InsureTech evaluating this postcode as collateral context. Focus on indicators that influence default risk, collateral stability, and demand-side market health: deprivation indices, school-catchment quality as a proxy for sustained owner-occupier demand, transport accessibility, crime baselines, and cost-of-living signals. This is enrichment for decision support, not a buy recommendation.",
    business:
      "Workflow: commercial site selection. Audience: a retail, F&B, or CRE site analyst evaluating this postcode for a new location. Focus on foot traffic indicators, competition density, transport and accessibility, local spending-power proxies, and commercial cost baselines. This is shortlisting enrichment, not a recommendation to lease.",
    investing:
      "Workflow: residential property investment screening. Audience: a BTL operator, BTR fund, or investment committee evaluating this postcode for acquisition or portfolio inclusion. Focus on price-growth signals from HM Land Registry, rental-yield baselines, regeneration and infrastructure indicators, tenant-demand proxies, and risk factors. This is screening enrichment for due diligence, not a buy recommendation.",
    research:
      "Workflow: neutral baseline. Audience: an analyst, planner, journalist, or researcher needing a defensible reference read on a UK postcode with equal weight across the five dimensions. This is descriptive intelligence with no thumb on the scale for any specific decision.",
  };

  /* ── Real data block ── */
  let realDataBlock = "";

  if (geo) {
    const areaTypeLabel = geo.area_type === "rural" ? "Rural" : geo.area_type === "urban" ? "Urban" : "Suburban";
    realDataBlock += `\n\nVERIFIED LOCATION DATA (Source: Postcodes.io):
- Coordinates: ${geo.latitude}, ${geo.longitude}
- Local Authority: ${geo.admin_district}
- Region: ${geo.region}
- Ward: ${geo.ward}
- Parliamentary Constituency: ${geo.constituency}
- Country: ${geo.country}
- LSOA: ${geo.lsoa}
- MSOA: ${geo.msoa}
- Area Classification: ${areaTypeLabel}${geo.rural_urban ? ` (${geo.rural_urban})` : ""}`;
  }

  if (crime) realDataBlock += `\n\n${formatCrimeDataForPrompt(crime)}`;
  if (deprivation) realDataBlock += `\n\n${formatDeprivationForPrompt(deprivation)}`;
  if (amenities) realDataBlock += `\n\n${formatAmenitiesForPrompt(amenities)}`;
  if (flood) realDataBlock += `\n\n${formatFloodRiskForPrompt(flood)}`;
  if (propertyPrices) realDataBlock += `\n\n${formatPropertyDataForPrompt(propertyPrices)}`;
  if (ofsted) realDataBlock += `\n\n${formatOfstedForPrompt(ofsted)}`;

  /* ── Pre-computed scores block ── */
  const areaTypeLabel = scores.area_type === "rural" ? "Rural" : scores.area_type === "urban" ? "Urban" : "Suburban";
  const confLabel = (c: number): string => {
    if (c >= 0.85) return "HIGH";
    if (c >= 0.6) return "MEDIUM";
    if (c >= 0.3) return "LOW";
    return "NONE";
  };
  const overallConfLabel = confLabel(scores.confidence);
  const scoresBlock = `
PRE-COMPUTED SCORES (deterministic: do NOT modify these numbers):
Area Type: ${areaTypeLabel} (scores benchmarked against ${areaTypeLabel.toLowerCase()} standards)
Overall OneGoodArea Score: ${scores.overall}/100
Aggregate Confidence: ${overallConfLabel} (${scores.confidence.toFixed(2)})
${scores.dimensions.map(d => `- ${d.label}: ${d.score}/100 (weight: ${d.weight}%, confidence: ${confLabel(d.confidence)} ${d.confidence.toFixed(2)}). ${d.confidence_reason}. ${d.reasoning}`).join("\n")}`;

  /* ── Data sources ── */
  const dataSources = [
    geo ? '"postcodes.io"' : "",
    crime ? '"police.uk"' : "",
    deprivation ? '"IMD 2025"' : "",
    amenities ? '"OpenStreetMap"' : "",
    flood ? '"Environment Agency"' : "",
    propertyPrices ? '"HM Land Registry"' : "",
    ofsted ? '"Ofsted"' : "",
  ].filter(Boolean).join(", ");

  return `You are OneGoodArea's analyst narration layer. The five-dimension scores in this report were computed deterministically from public UK datasets using fixed formulas. Your job is to NARRATE the result for a professional audience using only the data provided in this prompt. You do NOT compute scores. You do NOT recommend consumer actions. You explain what the source data shows.

PLATFORM CONTEXT: UK regulated B2B location intelligence layer. Customers are mortgage lenders, insurance underwriters, InsureTech MGAs, PropTech platforms, retail / CRE site-selection teams, and research analysts. Output reads as an analyst memo or risk-enrichment note, not a consumer area guide.

DATA DISCIPLINE (this is the most important section: read twice):
- Use only figures present in the data blocks below. Never invent numbers, estimates, or comparisons that are not derivable from the provided data.
- When a metric is unavailable, state "data not available" or "not in this dataset" explicitly. Never fabricate a fallback figure.
- Always attribute figures to the source dataset by name (e.g. "police.uk records 43 incidents/month", "HM Land Registry median £315,000 over 83 transactions", "Ofsted: 4 of 6 nearby schools rated Good or Outstanding").
- For dimensions with confidence below HIGH, the narrative MUST surface the limitation explicitly, not paper over it.

VOICE AND REGISTER:
- Analyst memo. Evidence-led. Neutral. No marketing language.
- AVOID consumer registers: "perfect for", "lovely", "great place to live", "settle in", "vibe", "trendy", "family-friendly feel", "buzzing", "pub culture", "this neighbourhood is".
- USE professional register: "the postcode", "the LSOA", "the catchment", "the area", "the local authority area", "the property market", "the transport corridor".
- Reference UK datasets by name when citing figures. Do NOT reference Rightmove, Zoopla, or other consumer property portals; this is a regulated workflow and the data sources are official.
- PUNCTUATION RULE: do NOT use em-dashes (—) in any output text. Use periods, commas, colons, semicolons, or parentheses instead. En-dashes for numeric ranges (e.g. 2019-2024 or 0-100) are acceptable.

WORKFLOW INTENT:
${intentContext[intent]}

AREA: ${area}
${scoresBlock}
${realDataBlock}

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences):

{
  "area": "${area}",
  "intent": "${intent}",
  "areaiq_score": ${scores.overall},
  "sub_scores": [
${scores.dimensions.map(d => `    { "label": "${d.label}", "score": ${d.score}, "weight": ${d.weight}, "summary": "<one evidence-led sentence explaining the ${d.score} score, citing a specific figure from the source data. e.g. 'police.uk records 43 incidents/month, 36% below the urban benchmark; antisocial behaviour dominates the category mix'>", "reasoning": "${d.reasoning.replace(/"/g, '\\"')}" }`).join(",\n")}
  ],
  "summary": "<2-3 sentence analyst summary of this postcode against the stated workflow intent. Reference the overall score, the strongest and weakest dimensions by source-data evidence, and aggregate confidence if it is below MEDIUM.>",
  "sections": [
    {
      "title": "<neutral factual section title, e.g. 'Safety baseline', 'Property market signals', 'Transport accessibility', 'School catchment', 'Deprivation context', 'Environmental risk'>",
      "content": "<2-4 paragraphs of evidence-led analysis citing source datasets by name>",
      "data_points": [
        { "label": "<metric name>", "value": "<value sourced from data above>" }
      ]
    }
  ],
  "recommendations": [
    "<a neutral, evidence-led consideration a reviewer should surface to a decision-maker. Frame as an observation, not consumer advice.>",
    "<another consideration>",
    "<another consideration>"
  ],
  "data_sources": [${dataSources}],
  "generated_at": "${new Date().toISOString()}"
}

Requirements:
- Score values are LOCKED. Use exactly the numbers provided above; never alter them.
- Each sub_score.summary must cite a specific figure from the source data block. Not a paraphrase, not a fabrication.
- 4-6 sections covering the dimensions relevant to the workflow intent.
- Each section has 2-5 data_points populated from the source data blocks above. Do NOT invent data_points to pad a section.
- Reference UK datasets only: police.uk, ONS, Ofsted (England), Estyn (Wales), Education Scotland, HM Land Registry, Environment Agency, OpenStreetMap, postcodes.io, IMD 2025 / WIMD 2019 / SIMD 2020.${crime ? "\n- Safety section must cite police.uk: category counts, monthly rate, and benchmark comparison from the data block." : ""}${deprivation ? "\n- Cite the IMD/WIMD/SIMD decile, rank, and interpretation explicitly." : ""}${amenities ? "\n- Reference OpenStreetMap counts and named amenities only when present in the data block." : ""}${flood ? "\n- Include the Environment Agency flood risk zone and any active flood warnings present in the data." : ""}${propertyPrices ? "\n- Cite HM Land Registry figures: median price, YoY change, transaction count, property-type mix." : ""}${ofsted ? "\n- Reference Ofsted inspection ratings by school name where provided. Note inspectorate (Ofsted/Estyn/Education Scotland) per country." : ""}
- For dimensions with confidence MEDIUM, LOW, or NONE: the summary MUST state the limitation in plain terms (e.g. "inferred from proxy data because no primary source covers this dimension at LSOA level", "limited sample of 18 transactions", "no Ofsted data in Scotland; school catchment proxied via OpenStreetMap counts"). Do NOT write confident prose where confidence is low.
- Aggregate confidence below 0.6: the overall summary MUST include a data-quality caveat (e.g. "data confidence is below the platform's recommended threshold; review the per-dimension bands before relying on this report for a material decision").
- "recommendations" are NEUTRAL, DECISION-RELEVANT OBSERVATIONS, not consumer advice. Phrase as analyst notes a reviewer would surface to a decision-maker. Examples of correct register: "Property market shows -21% YoY swing on a sample of 83 transactions; valuation models pricing collateral here should widen the volatility band accordingly." NOT: "Be careful about buying in this area." NOT: "This is a great place to invest."
- This is decision-support enrichment, not automated decisioning. Do not suggest the report alone should drive an underwriting, pricing, or capital-allocation decision. The platform is one input among several.`;
}

export async function generateReport(
  area: string,
  intent: Intent,
  userId: string
): Promise<{ id: string; report: AreaReport }> {
  /* ── 0. Check cache ── */
  const cached = await getCachedAreaResult(area, intent);
  if (cached) {
    logger.info(`[OneGoodArea] Cache HIT for ${area} (${intent})`);
    trackEvent("report.cache_hit", userId, { area, intent });

    // Save to user's reports table so it appears in their dashboard
    const id = generateReportId();
    await sql`
      INSERT INTO reports (id, area, intent, report, score, user_id)
      VALUES (${id}, ${cached.area}, ${intent}, ${JSON.stringify(cached.report)}, ${cached.score}, ${userId})
    `;

    return { id, report: cached.report };
  }

  logger.info(`[OneGoodArea] Cache MISS for ${area} (${intent}), generating fresh report`);
  trackEvent("report.cache_miss", userId, { area, intent });

  /* ── 1. Geocode ── */
  const geo = await geocodeArea(area);

  /* ── 2. Fetch data in parallel ── */
  const [crime, deprivation, amenities, flood, propertyPrices, ofsted] = geo
    ? await Promise.all([
        getCrimeData(geo.latitude, geo.longitude),
        getDeprivationData(geo.lsoa, geo.lsoa11),
        getNearbyAmenities(geo.latitude, geo.longitude),
        getFloodRisk(geo.latitude, geo.longitude),
        getPropertyPrices(geo.query),
        getOfstedSchools(geo.latitude, geo.longitude, geo.country),
      ])
    : [null, null, null, null, null, null];

  logger.info(
    `[OneGoodArea] Data fetched for "${area}": geo=${!!geo}, crime=${crime?.total_crimes ?? 0}, imd=${deprivation?.imd_rank ?? "n/a"}, amenities=${amenities?.total ?? 0}, flood_areas=${flood?.flood_areas_nearby ?? 0}, property=${propertyPrices ? `£${propertyPrices.median_price.toLocaleString()} (${propertyPrices.transaction_count} txns)` : "n/a"}, ofsted=${ofsted ? `${ofsted.total_rated} schools` : "n/a"}`
  );

  /* ── 3. Compute deterministic scores (area-type aware) ── */
  const areaType = geo?.area_type ?? "suburban";
  const scores = computeScores(intent, crime, deprivation, amenities, flood, areaType, propertyPrices, ofsted);

  logger.info(
    `[OneGoodArea] Scores computed for "${area}" (${intent}, ${areaType}): overall=${scores.overall}, dimensions=[${scores.dimensions.map(d => `${d.label}:${d.score}`).join(", ")}]`
  );

  /* ── 4. AI narrates (scores are locked) ── */
  const textContent = await getAiProvider().generateNarrative(
    buildPrompt(area, intent, scores, geo, crime, deprivation, amenities, flood, propertyPrices, ofsted)
  );

  let report: AreaReport;
  try {
    report = JSON.parse(textContent);
  } catch {
    // Strip markdown fences if AI wrapped JSON in ```json...```
    const cleaned = textContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    report = JSON.parse(cleaned);
  }

  // Enforce computed scores and area type (in case AI deviated)
  report.areaiq_score = scores.overall;
  report.area_type = scores.area_type;
  report.confidence = scores.confidence;
  report.engine_version = METHODOLOGY_VERSION;
  report.sub_scores = report.sub_scores.map((sub, i) => ({
    ...sub,
    score: scores.dimensions[i]?.score ?? sub.score,
    weight: scores.dimensions[i]?.weight ?? sub.weight,
    reasoning: scores.dimensions[i]?.reasoning ?? sub.reasoning,
    confidence: scores.dimensions[i]?.confidence ?? sub.confidence,
    confidence_reason: scores.dimensions[i]?.confidence_reason ?? sub.confidence_reason,
  }));

  // Attach data freshness metadata
  report.data_freshness = buildDataFreshness(crime, deprivation, amenities, flood, propertyPrices, ofsted);

  // Attach property market data for UI display
  if (propertyPrices) {
    report.property_data = {
      postcode_area: propertyPrices.postcode_area,
      median_price: propertyPrices.median_price,
      mean_price: propertyPrices.mean_price,
      transaction_count: propertyPrices.transaction_count,
      price_change_pct: propertyPrices.price_change_pct,
      by_property_type: propertyPrices.by_property_type,
      tenure_split: propertyPrices.tenure_split,
      price_range: propertyPrices.price_range,
      period: propertyPrices.period,
    };
  }

  // Attach school inspection data for UI display
  if (ofsted) {
    report.schools_data = {
      schools: ofsted.schools.map(s => ({
        name: s.school_name,
        phase: s.phase,
        rating: s.rating_text,
        distance_km: s.distance_km,
      })),
      rating_breakdown: ofsted.rating_breakdown,
      inspectorate: ofsted.inspectorate,
    };
  }

  /* ── 5. Save ── */
  const id = generateReportId();

  await sql`
    INSERT INTO reports (id, area, intent, report, score, user_id)
    VALUES (${id}, ${area}, ${intent}, ${JSON.stringify(report)}, ${report.areaiq_score}, ${userId})
  `;

  /* ── 6. Cache the result for future requests ── */
  setCachedAreaResult(area, intent, report, report.areaiq_score).catch((err) =>
    logger.error("[OneGoodArea] Failed to cache report:", err)
  );

  return { id, report };
}
