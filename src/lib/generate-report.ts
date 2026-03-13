import { anthropic } from "@/lib/anthropic";
import { sql } from "@/lib/db";
import { geocodeArea, GeocodedArea } from "@/lib/data-sources/postcodes";
import { getCrimeData, formatCrimeDataForPrompt, CrimeSummary } from "@/lib/data-sources/police";
import { getDeprivationData, formatDeprivationForPrompt, DeprivationData } from "@/lib/data-sources/deprivation";
import { getNearbyAmenities, formatAmenitiesForPrompt, AmenitiesData } from "@/lib/data-sources/openstreetmap";
import { getFloodRisk, formatFloodRiskForPrompt, FloodRiskData } from "@/lib/data-sources/flood";
import { computeScores, ComputedScores } from "@/lib/scoring-engine";
import { AreaReport, Intent } from "@/lib/types";
import { ensureReportCacheTable, getCachedReport, setCachedReport } from "@/lib/report-cache";
import { trackEvent } from "@/lib/activity";

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildPrompt(
  area: string,
  intent: Intent,
  scores: ComputedScores,
  geo: GeocodedArea | null,
  crime: CrimeSummary | null,
  deprivation: DeprivationData | null,
  amenities: AmenitiesData | null,
  flood: FloodRiskData | null
): string {
  const intentContext: Record<Intent, string> = {
    moving:
      "The user is considering moving to this UK area. Focus on livability: safety, schools, transport, daily amenities, and cost of living.",
    business:
      "The user is considering opening a business in this UK area. Focus on: foot traffic, competition, transport access, local spending power, and commercial costs.",
    investing:
      "The user is evaluating this UK area for property investment. Focus on: price growth potential, rental yields, regeneration, tenant demand, and risk factors.",
    research:
      "The user wants a general understanding of this UK area. Provide a balanced overview of safety, transport, amenities, demographics, and environment.",
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

  /* ── Pre-computed scores block ── */
  const areaTypeLabel = scores.area_type === "rural" ? "Rural" : scores.area_type === "urban" ? "Urban" : "Suburban";
  const scoresBlock = `
PRE-COMPUTED SCORES (deterministic — DO NOT modify these numbers):
Area Type: ${areaTypeLabel} (scores benchmarked against ${areaTypeLabel.toLowerCase()} standards)
Overall AreaIQ Score: ${scores.overall}/100
${scores.dimensions.map(d => `- ${d.label}: ${d.score}/100 (weight: ${d.weight}%) — ${d.reasoning}`).join("\n")}`;

  /* ── Data sources ── */
  const dataSources = [
    geo ? '"postcodes.io"' : "",
    crime ? '"police.uk"' : "",
    deprivation ? '"IMD 2019"' : "",
    amenities ? '"OpenStreetMap"' : "",
    flood ? '"Environment Agency"' : "",
  ].filter(Boolean).join(", ");

  return `You are AreaIQ, an expert UK area intelligence analyst. Your job is to NARRATE and EXPLAIN a pre-scored area intelligence report. The scores have already been computed from real data — your role is to write compelling, actionable summaries and analysis that bring the scores to life.

IMPORTANT: This platform is UK-only. Use UK-specific references:
- Crime data: police.uk / Home Office statistics
- Demographics: ONS Census 2021 data
- Schools: Ofsted ratings
- Property: Land Registry, Rightmove/Zoopla market data
- Transport: TfL, National Rail, local bus networks
- Healthcare: NHS services, GP surgeries
- Currency: GBP (£)

AREA: ${area}
INTENT: ${intentContext[intent]}
${scoresBlock}
${realDataBlock}

You must respond with ONLY valid JSON matching this exact structure (no markdown, no code fences):

{
  "area": "${area}",
  "intent": "${intent}",
  "areaiq_score": ${scores.overall},
  "sub_scores": [
${scores.dimensions.map(d => `    { "label": "${d.label}", "score": ${d.score}, "weight": ${d.weight}, "summary": "<write an actionable 1-sentence summary that explains WHY this score is ${d.score}. Use specific numbers from the data. e.g. '72 because 43 crimes/month is 36% below the area average. Antisocial behaviour is the main concern'>", "reasoning": "${d.reasoning.replace(/"/g, '\\"')}" }`).join(",\n")}
  ],
  "summary": "<2-3 sentence executive summary of the area for this specific intent. Reference the overall score and key findings.>",
  "sections": [
    {
      "title": "<section title>",
      "content": "<2-4 paragraphs of detailed analysis>",
      "data_points": [
        { "label": "<metric name>", "value": "<value>" }
      ]
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ],
  "data_sources": [${dataSources}],
  "generated_at": "${new Date().toISOString()}"
}

Requirements:
- The areaiq_score and all sub_score scores are LOCKED — use exactly the values provided above. Do not change them.
- Each sub_score summary MUST reference specific data that justifies the score. Use the reasoning provided as a starting point, then enrich with context from the real data.
- Include 4-6 sections relevant to the intent
- Each section should have 2-5 data_points with realistic, specific values
- Be specific to this exact area — reference real streets, landmarks, stations, pubs, parks by name
- Where real data has been provided, use exact figures. Where not available, provide reasonable estimates and note them as estimates.${crime ? "\n- The Safety section MUST reference the real police.uk crime data — use actual category counts and percentages" : ""}${deprivation ? "\n- Reference the real IMD deprivation data — include the decile, rank, and interpretation" : ""}${amenities ? "\n- Reference the real OpenStreetMap amenities counts and named places" : ""}${flood ? "\n- Include flood risk information from the Environment Agency data" : ""}
- Recommendations should be specific, actionable, and UK-relevant
- Do NOT fabricate data that contradicts the real data provided
- Do NOT reference non-UK sources`;
}

export async function generateReport(
  area: string,
  intent: Intent,
  userId: string
): Promise<{ id: string; report: AreaReport }> {
  /* ── 0. Check cache ── */
  await ensureReportCacheTable();

  const cached = await getCachedReport(area, intent);
  if (cached) {
    console.log(`[AreaIQ] Cache HIT for ${area} (${intent})`);
    trackEvent("report.cache_hit", userId, { area, intent });

    // Save to user's reports table so it appears in their dashboard
    const id = generateId();
    await sql`
      INSERT INTO reports (id, area, intent, report, score, user_id)
      VALUES (${id}, ${cached.area}, ${intent}, ${JSON.stringify(cached.report)}, ${cached.score}, ${userId})
    `;

    return { id, report: cached.report };
  }

  console.log(`[AreaIQ] Cache MISS for ${area} (${intent}), generating fresh report`);
  trackEvent("report.cache_miss", userId, { area, intent });

  /* ── 1. Geocode ── */
  const geo = await geocodeArea(area);

  /* ── 2. Fetch data in parallel ── */
  const [crime, deprivation, amenities, flood] = geo
    ? await Promise.all([
        getCrimeData(geo.latitude, geo.longitude),
        getDeprivationData(geo.lsoa, geo.lsoa11),
        getNearbyAmenities(geo.latitude, geo.longitude),
        getFloodRisk(geo.latitude, geo.longitude),
      ])
    : [null, null, null, null];

  console.log(
    `[AreaIQ] Data fetched for "${area}": geo=${!!geo}, crime=${crime?.total_crimes ?? 0}, imd=${deprivation?.imd_rank ?? "n/a"}, amenities=${amenities?.total ?? 0}, flood_areas=${flood?.flood_areas_nearby ?? 0}`
  );

  /* ── 3. Compute deterministic scores (area-type aware) ── */
  const areaType = geo?.area_type ?? "suburban";
  const scores = computeScores(intent, crime, deprivation, amenities, flood, areaType);

  console.log(
    `[AreaIQ] Scores computed for "${area}" (${intent}, ${areaType}): overall=${scores.overall}, dimensions=[${scores.dimensions.map(d => `${d.label}:${d.score}`).join(", ")}]`
  );

  /* ── 4. AI narrates (scores are locked) ── */
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: buildPrompt(area, intent, scores, geo, crime, deprivation, amenities, flood),
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const report: AreaReport = JSON.parse(textContent.text);

  // Enforce computed scores and area type (in case AI deviated)
  report.areaiq_score = scores.overall;
  report.area_type = scores.area_type;
  report.sub_scores = report.sub_scores.map((sub, i) => ({
    ...sub,
    score: scores.dimensions[i]?.score ?? sub.score,
    weight: scores.dimensions[i]?.weight ?? sub.weight,
    reasoning: scores.dimensions[i]?.reasoning ?? sub.reasoning,
  }));

  /* ── 5. Save ── */
  const id = generateId();

  await sql`
    INSERT INTO reports (id, area, intent, report, score, user_id)
    VALUES (${id}, ${area}, ${intent}, ${JSON.stringify(report)}, ${report.areaiq_score}, ${userId})
  `;

  /* ── 6. Cache the result for future requests ── */
  setCachedReport(area, intent, report, report.areaiq_score).catch((err) =>
    console.error("[AreaIQ] Failed to cache report:", err)
  );

  return { id, report };
}
